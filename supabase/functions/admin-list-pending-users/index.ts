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
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requesting user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    
    if (claimsError || !claims.user) {
      console.error('[admin-list-pending-users] Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    if (claims.user.email !== ADMIN_EMAIL) {
      console.error('[admin-list-pending-users] Unauthorized access attempt by:', claims.user.email);
      return new Response(
        JSON.stringify({ error: 'Acceso denegado - Solo administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-list-pending-users] Admin verified:', claims.user.email);

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, created_at');

    if (profilesError) {
      console.error('[admin-list-pending-users] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log('[admin-list-pending-users] Profiles found:', profiles?.length);

    // Get user_ids that already have a tenant
    const { data: assignedUsers, error: assignedError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id');

    if (assignedError) {
      console.error('[admin-list-pending-users] Error fetching user_roles:', assignedError);
      throw assignedError;
    }

    console.log('[admin-list-pending-users] Assigned users:', assignedUsers?.length);

    // Get all auth users to get their emails
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('[admin-list-pending-users] Error fetching auth users:', authError);
      throw authError;
    }

    // Create a map of user_id to email
    const userEmailMap = new Map<string, string>();
    authData.users.forEach(user => {
      userEmailMap.set(user.id, user.email || '');
    });

    // Filter profiles:
    // 1. Don't have a tenant (not in user_roles)
    // 2. Are not the admin email
    const assignedUserIds = new Set(assignedUsers?.map(u => u.user_id) || []);
    
    const pendingUsers = (profiles || [])
      .filter(p => {
        const userEmail = userEmailMap.get(p.user_id);
        const hasNoTenant = !assignedUserIds.has(p.user_id);
        const isNotAdmin = userEmail !== ADMIN_EMAIL;
        
        console.log(`[admin-list-pending-users] User ${p.full_name}: email=${userEmail}, hasNoTenant=${hasNoTenant}, isNotAdmin=${isNotAdmin}`);
        
        return hasNoTenant && isNotAdmin;
      })
      .map(p => ({
        id: p.user_id,
        fullName: p.full_name,
        email: userEmailMap.get(p.user_id) || null,
        createdAt: p.created_at || new Date().toISOString(),
      }));

    console.log('[admin-list-pending-users] Pending users found:', pendingUsers.length);

    return new Response(
      JSON.stringify({ pendingUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[admin-list-pending-users] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
