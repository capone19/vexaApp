import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CURRENCIES = ['CLP', 'BOB', 'USD'];
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

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('[admin-update-tenant-currency] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = (caller.email || '').toLowerCase();
    console.log('[admin-update-tenant-currency] Authenticated user:', userEmail);

    // Verify admin email
    if (userEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-update-tenant-currency] Unauthorized access attempt:', userEmail);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const { tenantId, currency } = await req.json();

    if (!tenantId || typeof tenantId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid tenantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currency || !VALID_CURRENCIES.includes(currency)) {
      return new Response(
        JSON.stringify({ error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update tenant currency
    const { data, error: updateError } = await supabase
      .from('tenants')
      .update({ display_currency: currency })
      .eq('id', tenantId)
      .select('id, name, display_currency')
      .single();

    if (updateError) {
      console.error('[admin-update-tenant-currency] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tenant currency' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-update-tenant-currency] Updated tenant ${data.name} to ${currency}`);

    return new Response(
      JSON.stringify({ success: true, tenant: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-update-tenant-currency] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
