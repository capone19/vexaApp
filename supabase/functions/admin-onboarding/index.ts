import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  userId: string;
  tenantName?: string;
  tenantSlug?: string;
  autoSlug?: boolean;
  plan: string;
  timezone: string;
  channelType: string;
  channelIdentifier: string | null;
  whatsappPhoneId: string | null;
  whatsappBusinessId: string | null;
}

function randomAlnum(n: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function sanitizeSlugPart(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'cliente';
}

function isUniqueViolation(err: { code?: string; message?: string; details?: string }): boolean {
  const msg = `${err.message || ''} ${err.details || ''}`.toLowerCase();
  return err.code === '23505' || msg.includes('duplicate') || msg.includes('unique') || msg.includes('slug');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[admin-onboarding] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-onboarding] Unauthorized:', user.email);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: OnboardingRequest = await req.json();
    console.log('[admin-onboarding] Request:', JSON.stringify(body, null, 2));

    const {
      userId,
      tenantName: rawName,
      tenantSlug: rawSlug,
      autoSlug = false,
      plan,
      timezone,
      channelType,
      channelIdentifier,
      whatsappPhoneId,
      whatsappBusinessId,
    } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authUserData, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
    if (getUserErr || !authUserData?.user) {
      console.error('[admin-onboarding] getUserById:', getUserErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuario no encontrado en Auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const target = authUserData.user;
    const email = target.email || '';
    const localPart = sanitizeSlugPart(email.split('@')[0] || '');

    let finalName = (rawName || '').trim();
    if (!finalName) {
      const metaName = target.user_metadata?.full_name;
      finalName =
        (typeof metaName === 'string' && metaName.trim()) ||
        (email ? `Cliente ${email.split('@')[0]}` : `Cliente ${userId.slice(0, 8)}`);
    }

    const baseManual = sanitizeSlugPart((rawSlug || '').trim());

    const runSetup = (slug: string) =>
      supabase.rpc('setup_new_client', {
        _user_id: userId,
        _tenant_name: finalName,
        _tenant_slug: slug,
        _timezone: timezone || 'America/Mexico_City',
        _plan: plan || 'basic',
      });

    let tenantId: string | null = null;
    let usedSlug = '';

    if (autoSlug || !baseManual) {
      const prefix = localPart.length >= 2 ? localPart.slice(0, 20) : 'cliente';
      let lastErr: { message?: string; code?: string } | null = null;
      for (let i = 0; i < 5; i++) {
        const slug = `${prefix}-${randomAlnum(8)}`;
        const { data, error } = await runSetup(slug);
        if (!error && data) {
          tenantId = data as string;
          usedSlug = slug;
          break;
        }
        lastErr = error;
        if (error && !isUniqueViolation(error)) {
          console.error('[admin-onboarding] setup_new_client error:', error);
          throw new Error(`Error creating tenant: ${error.message}`);
        }
      }
      if (!tenantId && lastErr) {
        throw new Error(`Error creating tenant: ${lastErr.message}`);
      }
    } else {
      let { data, error } = await runSetup(baseManual);
      if (!error && data) {
        tenantId = data as string;
        usedSlug = baseManual;
      } else if (error && isUniqueViolation(error)) {
        console.log('[admin-onboarding] Slug duplicado, reintentando con sufijo...');
        let lastErr = error;
        for (let i = 0; i < 4; i++) {
          const slug = `${baseManual}-${randomAlnum(8)}`;
          const r = await runSetup(slug);
          if (!r.error && r.data) {
            tenantId = r.data as string;
            usedSlug = slug;
            break;
          }
          lastErr = r.error;
          if (r.error && !isUniqueViolation(r.error)) {
            throw new Error(`Error creating tenant: ${r.error.message}`);
          }
        }
        if (!tenantId) {
          throw new Error(`Error creating tenant: ${lastErr?.message || 'slug duplicado'}`);
        }
      } else if (error) {
        console.error('[admin-onboarding] setup_new_client error:', error);
        throw new Error(`Error creating tenant: ${error.message}`);
      }
    }

    console.log('[admin-onboarding] Tenant created:', tenantId, 'slug:', usedSlug);

    if (whatsappPhoneId || whatsappBusinessId) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          whatsapp_phone_id: whatsappPhoneId,
          whatsapp_business_id: whatsappBusinessId,
        })
        .eq('id', tenantId!);

      if (updateError) {
        console.error('[admin-onboarding] Update tenant error:', updateError);
      }
    }

    let externalSync = false;
    const externalServiceKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (externalServiceKey && channelIdentifier) {
      try {
        const externalBaseUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
        const externalUrl = `${externalBaseUrl}/rest/v1/tenant_channels`;

        const externalResponse = await fetch(externalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: externalServiceKey,
            Authorization: `Bearer ${externalServiceKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            channel_type: channelType,
            channel_identifier: channelIdentifier,
          }),
        });

        if (externalResponse.ok) {
          externalSync = true;
        } else {
          const errorText = await externalResponse.text();
          console.error('[admin-onboarding] External sync failed:', externalResponse.status, errorText);
        }
      } catch (externalError) {
        console.error('[admin-onboarding] External sync error:', externalError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        tenantSlugUsed: usedSlug,
        tenantNameUsed: finalName,
        cloudSync: true,
        externalSync,
        message: 'Cliente activado exitosamente',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-onboarding] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    // 200 + success:false para que el cliente reciba siempre JSON parseable (evita solo "non-2xx")
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
