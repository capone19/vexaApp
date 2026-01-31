import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'contacto@vexalatam.com';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims?.sub) {
      console.error('[admin-toggle-vexa-ads] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = claims.claims.email as string | undefined;
    
    if (userEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { tenantId, enabled } = await req.json();

    if (!tenantId || typeof enabled !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing tenantId or enabled parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update tenant vexa_ads_enabled
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ vexa_ads_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[admin-toggle-vexa-ads] Update error:', updateError);
      throw updateError;
    }

    console.log(`[admin-toggle-vexa-ads] Tenant ${tenantId} vexa_ads_enabled set to ${enabled}`);

    return new Response(
      JSON.stringify({ success: true, tenantId, enabled }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-toggle-vexa-ads] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
