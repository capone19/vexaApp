import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'contacto@vexalatam.com';

async function listAllAuthUsers(
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> }[]> {
  const all: { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> }[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    // Mismo criterio que admin-onboarding: getUser devuelve email fiable; getClaims a veces no trae email en el JWT.
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      console.error('[admin-list-pending-users] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerEmail = (caller.email || '').toLowerCase();
    if (callerEmail !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[admin-list-pending-users] Unauthorized:', caller.email);
      return new Response(JSON.stringify({ error: 'Acceso denegado - Solo administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, created_at');

    if (profilesError) {
      console.error('[admin-list-pending-users] profiles:', profilesError);
      throw profilesError;
    }

    const profileByUserId = new Map(
      (profiles || []).map((p) => [p.user_id, p as { full_name: string | null; created_at: string | null }])
    );

    const { data: assignedUsers, error: assignedError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id');

    if (assignedError) {
      console.error('[admin-list-pending-users] user_roles:', assignedError);
      throw assignedError;
    }

    const assignedUserIds = new Set((assignedUsers || []).map((u) => u.user_id));

    const authUsers = await listAllAuthUsers(supabaseAdmin);

    const pendingUsers = authUsers
      .filter((u) => {
        const email = (u.email || '').toLowerCase();
        return !assignedUserIds.has(u.id) && email !== ADMIN_EMAIL.toLowerCase();
      })
      .map((u) => {
        const prof = profileByUserId.get(u.id);
        const meta = u.user_metadata || {};
        const fullName =
          prof?.full_name ||
          (typeof meta.full_name === 'string' ? meta.full_name : null) ||
          (u.email ? u.email.split('@')[0] : 'Usuario');
        return {
          id: u.id,
          fullName,
          email: u.email || null,
          createdAt: prof?.created_at || u.created_at || new Date().toISOString(),
        };
      });

    console.log('[admin-list-pending-users] Pending (sin tenant en user_roles):', pendingUsers.length);

    return new Response(JSON.stringify({ pendingUsers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[admin-list-pending-users]', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
