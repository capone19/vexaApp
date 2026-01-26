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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client with user's token for auth verification
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service role client for bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('[admin-toggle-tenant-status] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-toggle-tenant-status] Non-admin access attempt:', user.email);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { tenantId, isActive } = await req.json();

    if (!tenantId || typeof isActive !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenantId and isActive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-toggle-tenant-status] Admin ${user.email} toggling tenant ${tenantId} to ${isActive}`);

    // Get current tenant state for audit log
    const { data: currentTenant, error: fetchError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, is_active')
      .eq('id', tenantId)
      .single();

    if (fetchError || !currentTenant) {
      console.error('[admin-toggle-tenant-status] Tenant not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldStatus = currentTenant.is_active;

    // Update tenant status
    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[admin-toggle-tenant-status] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tenant status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit_logs
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        table_name: 'tenants',
        record_id: tenantId,
        action: 'tenant_status_toggle',
        old_values: { is_active: oldStatus },
        new_values: { is_active: isActive },
      });

    if (auditError) {
      // Log but don't fail the request
      console.warn('[admin-toggle-tenant-status] Audit log error:', auditError);
    }

    console.log(`[admin-toggle-tenant-status] ✓ Tenant ${currentTenant.name} (${tenantId}) status changed: ${oldStatus} → ${isActive}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tenantId, 
        isActive,
        message: isActive ? 'Cliente activado' : 'Cliente desactivado'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-toggle-tenant-status] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
