import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ADMIN_EMAIL = 'contacto@vexalatam.com';
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant IDs from request body if provided
    const body = await req.json().catch(() => ({}));
    const tenantIds: string[] = body.tenantIds || [];

    let query = supabase
      .from('tenants')
      .select('id, name, slug, plan');
    
    if (tenantIds.length > 0) {
      query = query.in('id', tenantIds);
    }

    const { data: tenants, error } = await query;

    if (error) {
      console.error('[admin-get-tenant-names] Error:', error);
      throw error;
    }

    // Create a map for easy lookup
    const tenantsMap: Record<string, { name: string; slug: string; plan: string }> = {};
    tenants?.forEach(t => {
      tenantsMap[t.id] = { name: t.name, slug: t.slug, plan: t.plan };
    });

    return new Response(
      JSON.stringify({ tenants: tenantsMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[admin-get-tenant-names] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
