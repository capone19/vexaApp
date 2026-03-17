import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  userId: string;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  timezone: string;
  channelType: string;
  channelIdentifier: string | null;
  whatsappPhoneId: string | null;
  whatsappBusinessId: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[admin-onboarding] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin email
    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-onboarding] Unauthorized access attempt:', user.email);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: OnboardingRequest = await req.json();
    console.log('[admin-onboarding] Request:', JSON.stringify(body, null, 2));

    const {
      userId,
      tenantName,
      tenantSlug,
      plan,
      timezone,
      channelType,
      channelIdentifier,
      whatsappPhoneId,
      whatsappBusinessId,
    } = body;

    // Validate required fields
    if (!userId || !tenantName || !tenantSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 1: Call setup_new_client RPC
    // ============================================
    console.log('[admin-onboarding] Step 1: Calling setup_new_client...');
    
    const { data: tenantId, error: setupError } = await supabase.rpc('setup_new_client', {
      _user_id: userId,
      _tenant_name: tenantName,
      _tenant_slug: tenantSlug,
      _timezone: timezone,
      _plan: plan,
    });

    if (setupError) {
      console.error('[admin-onboarding] setup_new_client error:', setupError);
      throw new Error(`Error creating tenant: ${setupError.message}`);
    }

    console.log('[admin-onboarding] Tenant created with ID:', tenantId);

    // ============================================
    // STEP 2: Update tenant with WhatsApp info
    // ============================================
    if (whatsappPhoneId || whatsappBusinessId) {
      console.log('[admin-onboarding] Step 2: Updating tenant with WhatsApp info...');
      
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          whatsapp_phone_id: whatsappPhoneId,
          whatsapp_business_id: whatsappBusinessId,
        })
        .eq('id', tenantId);

      if (updateError) {
        console.error('[admin-onboarding] Update tenant error:', updateError);
        // Non-fatal, continue
      }
    }

    // ============================================
    // STEP 3: Sync to external Supabase
    // ============================================
    let externalSync = false;
    const externalServiceKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
    
    if (externalServiceKey && channelIdentifier) {
      console.log('[admin-onboarding] Step 3: Syncing to external Supabase...');
      
      try {
        const externalBaseUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
        const externalUrl = `${externalBaseUrl}/rest/v1/tenant_channels`;
        
        const externalResponse = await fetch(externalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': externalServiceKey,
            'Authorization': `Bearer ${externalServiceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            channel_type: channelType,
            channel_identifier: channelIdentifier,
          }),
        });

        if (externalResponse.ok) {
          externalSync = true;
          console.log('[admin-onboarding] External sync successful');
        } else {
          const errorText = await externalResponse.text();
          console.error('[admin-onboarding] External sync failed:', externalResponse.status, errorText);
        }
      } catch (externalError) {
        console.error('[admin-onboarding] External sync error:', externalError);
      }
    } else {
      console.log('[admin-onboarding] Skipping external sync (no key or no channel identifier)');
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        cloudSync: true,
        externalSync,
        message: 'Cliente activado exitosamente',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-onboarding] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
