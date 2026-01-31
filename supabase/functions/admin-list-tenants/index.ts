import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Límites de conversaciones por plan (correctos)
const PLAN_LIMITS: Record<string, number> = {
  basic: 300,
  pro: 1000,
  enterprise: 4000,
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
    
    // External Supabase for chat data
    const externalSupabaseUrl = 'https://gfltyrhndfuttacrmcjd.supabase.co';
    const externalSupabaseKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const externalSupabase = createClient(externalSupabaseUrl, externalSupabaseKey);

    // Verify the user is admin (check JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT using getClaims (proper method for token validation)
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims?.sub) {
      console.error('[admin-list-tenants] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = claims.claims.email as string | undefined;
    console.log('[admin-list-tenants] Authenticated user:', userEmail);

    // Verify admin email
    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (userEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-list-tenants] Unauthorized access attempt:', userEmail);
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
        vexa_ads_enabled,
        whatsapp_phone_id,
        whatsapp_business_id,
        display_currency,
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

    // Count unique sessions per tenant directly from n8n_chat_histories
    // The table has tenant_id column directly!
    const { data: chatSessions, error: sessionsError } = await externalSupabase
      .from('n8n_chat_histories')
      .select('session_id, tenant_id');
    
    if (sessionsError) {
      console.error('[admin-list-tenants] Error fetching chat sessions:', sessionsError);
    }

    console.log('[admin-list-tenants] Total chat messages:', chatSessions?.length || 0);

    // Count unique sessions per tenant using the tenant_id from the messages
    const tenantChatCounts: Record<string, number> = {};
    const processedSessions = new Set<string>();
    
    chatSessions?.forEach(row => {
      // Create unique key per tenant+session
      const key = `${row.tenant_id}:${row.session_id}`;
      if (processedSessions.has(key)) return;
      processedSessions.add(key);
      
      if (row.tenant_id) {
        tenantChatCounts[row.tenant_id] = (tenantChatCounts[row.tenant_id] || 0) + 1;
      }
    });

    console.log('[admin-list-tenants] Unique sessions processed:', processedSessions.size);
    console.log('[admin-list-tenants] Chat counts per tenant:', tenantChatCounts);

    // Enrich tenants with email and chat counts
    const enrichedTenants = (tenants || []).map(tenant => ({
      ...tenant,
      owner_email: tenantOwnerEmails[tenant.id] || null,
      chat_count: tenantChatCounts[tenant.id] || 0,
      chat_limit: PLAN_LIMITS[tenant.plan.toLowerCase()] || 300,
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