import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Límites de conversaciones por plan
const PLAN_LIMITS: Record<string, number> = {
  basic: 200,
  pro: 500,
  enterprise: 2000,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is admin (check JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[admin-list-tenants] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin email
    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-list-tenants] Unauthorized access attempt:', user.email);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all tenants with subscriptions
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        plan,
        is_active,
        whatsapp_phone_id,
        whatsapp_business_id,
        created_at,
        subscriptions (
          price_usd,
          status,
          current_period_start,
          current_period_end
        )
      `)
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('[admin-list-tenants] Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    // Fetch owner emails for each tenant
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('tenant_id, user_id, role')
      .eq('role', 'owner');

    if (rolesError) {
      console.error('[admin-list-tenants] Error fetching user roles:', rolesError);
    }

    // Get unique user IDs
    const userIds = [...new Set(userRoles?.map(r => r.user_id) || [])];
    
    // Fetch user emails from auth.users
    const userEmails: Record<string, string> = {};
    for (const userId of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        userEmails[userId] = userData.user.email;
      }
    }

    // Create tenant_id -> owner_email map
    const tenantOwnerEmails: Record<string, string> = {};
    userRoles?.forEach(role => {
      if (role.role === 'owner' && userEmails[role.user_id]) {
        tenantOwnerEmails[role.tenant_id] = userEmails[role.user_id];
      }
    });

    // Fetch chat session counts per tenant for current period
    const tenantChatCounts: Record<string, number> = {};
    
    for (const tenant of tenants || []) {
      const subscription = tenant.subscriptions?.[0];
      const periodStart = subscription?.current_period_start || new Date(new Date().setDate(1)).toISOString();
      
      const { count, error: countError } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', periodStart);
      
      if (!countError) {
        tenantChatCounts[tenant.id] = count || 0;
      }
    }

    // Enrich tenants with email and chat counts
    const enrichedTenants = (tenants || []).map(tenant => ({
      ...tenant,
      owner_email: tenantOwnerEmails[tenant.id] || null,
      chat_count: tenantChatCounts[tenant.id] || 0,
      chat_limit: PLAN_LIMITS[tenant.plan.toLowerCase()] || 200,
    }));

    console.log(`[admin-list-tenants] Returning ${enrichedTenants.length} tenants with enriched data`);

    return new Response(
      JSON.stringify({ tenants: enrichedTenants }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[admin-list-tenants] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
