import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
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
      console.error('[admin-manage-tenant-addons] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = claims.claims.email as string | undefined;
    console.log('[admin-manage-tenant-addons] Authenticated user:', userEmail);

    // Verify admin email
    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (userEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-manage-tenant-addons] Unauthorized access attempt:', userEmail);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { tenantId, addons } = body;

    if (!tenantId || !Array.isArray(addons)) {
      return new Response(
        JSON.stringify({ error: 'tenantId and addons array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-manage-tenant-addons] Managing addons for tenant:', tenantId);
    console.log('[admin-manage-tenant-addons] Addons to set:', addons);

    // Precios por addon
    const ADDON_PRICES: Record<string, number> = {
      'agent-performance': 9,
      'conversational-metrics': 9,
      'unconverted-leads': 9,
      'converted-sales': 9,
      'meta-ads': 9,
      'ad-advisor': 29,
    };

    // Get current addons for this tenant
    const { data: currentAddons, error: fetchError } = await supabase
      .from('tenant_addons')
      .select('addon_id, status')
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('[admin-manage-tenant-addons] Fetch error:', fetchError);
      throw fetchError;
    }

    const currentAddonIds = currentAddons?.filter(a => a.status === 'active').map(a => a.addon_id) || [];
    
    // Determine addons to add and remove
    const addonsToAdd = addons.filter(id => !currentAddonIds.includes(id));
    const addonsToRemove = currentAddonIds.filter(id => !addons.includes(id));

    console.log('[admin-manage-tenant-addons] Adding:', addonsToAdd);
    console.log('[admin-manage-tenant-addons] Removing:', addonsToRemove);

    // Add new addons
    if (addonsToAdd.length > 0) {
      const insertData = addonsToAdd.map(addonId => ({
        tenant_id: tenantId,
        addon_id: addonId,
        price_usd: ADDON_PRICES[addonId] || 9,
        status: 'active',
        activated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('tenant_addons')
        .upsert(insertData, { 
          onConflict: 'tenant_id,addon_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('[admin-manage-tenant-addons] Insert error:', insertError);
        throw insertError;
      }
    }

    // Remove (deactivate) addons
    if (addonsToRemove.length > 0) {
      const { error: updateError } = await supabase
        .from('tenant_addons')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .in('addon_id', addonsToRemove);

      if (updateError) {
        console.error('[admin-manage-tenant-addons] Update error:', updateError);
        throw updateError;
      }
    }

    console.log('[admin-manage-tenant-addons] ✓ Addons updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        added: addonsToAdd,
        removed: addonsToRemove,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-manage-tenant-addons] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
