// ============================================
// VEXA - Admin Impersonate Edge Function
// ============================================
// Maneja la lógica de impersonación de tenants para admins
// Valida permisos y registra logs de auditoría
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email del super admin
const ADMIN_EMAIL = 'contacto@vexalatam.com';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente con service role para bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener token de autorización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar usuario autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[admin-impersonate] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que es el admin
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn(`[admin-impersonate] Unauthorized access attempt by: ${user.email}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Solo el administrador puede realizar esta acción' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body = await req.json();
    const { action, tenantId, tenantName, logId } = body;

    // Obtener IP (si está disponible)
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';

    if (action === 'start') {
      // Validar que el tenant existe
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id, name')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        console.error('[admin-impersonate] Tenant not found:', tenantId);
        return new Response(
          JSON.stringify({ success: false, message: 'Cliente no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Crear registro de auditoría
      const { data: log, error: logError } = await supabaseAdmin
        .from('admin_impersonation_logs')
        .insert({
          admin_user_id: user.id,
          admin_email: user.email,
          tenant_id: tenantId,
          tenant_name: tenantName || tenant.name,
          ip_address: ipAddress,
        })
        .select('id')
        .single();

      if (logError) {
        console.error('[admin-impersonate] Error creating log:', logError);
        return new Response(
          JSON.stringify({ success: false, message: 'Error al registrar la acción' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[admin-impersonate] Started impersonation: admin=${user.email}, tenant=${tenantId}, log=${log.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          logId: log.id,
          message: 'Impersonación iniciada' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'stop') {
      // Actualizar registro de auditoría con ended_at
      if (logId) {
        const { error: updateError } = await supabaseAdmin
          .from('admin_impersonation_logs')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', logId)
          .eq('admin_user_id', user.id); // Verificar que el log pertenece al admin

        if (updateError) {
          console.error('[admin-impersonate] Error updating log:', updateError);
          // No fallar, solo loguear
        } else {
          console.log(`[admin-impersonate] Stopped impersonation: log=${logId}`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Impersonación finalizada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Acción no válida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[admin-impersonate] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
