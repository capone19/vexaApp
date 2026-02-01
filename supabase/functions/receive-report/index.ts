import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// API Key para autenticar requests desde n8n
const N8N_API_KEY = Deno.env.get("N8N_REPORT_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validar API Key desde n8n
    const apiKey = req.headers.get("x-api-key");
    if (!N8N_API_KEY) {
      console.warn("[receive-report] N8N_REPORT_API_KEY not configured, allowing all requests");
    } else if (apiKey !== N8N_API_KEY) {
      console.error("[receive-report] Invalid API key");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Solo aceptar POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear el body
    const contentType = req.headers.get("content-type") || "";
    let body: any;

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      // Soporte para envío como form-data con archivo HTML
      const formData = await req.formData();
      body = {
        tenant_id: formData.get("tenant_id"),
        report_type: formData.get("report_type"),
        file_name: formData.get("file_name"),
        period_start: formData.get("period_start"),
        period_end: formData.get("period_end"),
        metadata: formData.get("metadata") ? JSON.parse(formData.get("metadata") as string) : {},
      };
      
      // Obtener el contenido HTML del archivo
      const htmlFile = formData.get("html_file");
      if (htmlFile && htmlFile instanceof File) {
        body.html_content = await htmlFile.text();
        body.file_size = htmlFile.size;
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json or multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[receive-report] Received request:", {
      tenant_id: body.tenant_id,
      report_type: body.report_type,
      file_name: body.file_name,
      period_start: body.period_start,
      period_end: body.period_end,
      html_length: body.html_content?.length || 0,
    });

    // Validar campos requeridos
    const { tenant_id, report_type, html_content, period_start, period_end, file_name, metadata } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!report_type) {
      return new Response(
        JSON.stringify({ error: "Missing required field: report_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!html_content) {
      return new Response(
        JSON.stringify({ error: "Missing required field: html_content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: period_start and period_end" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear cliente Supabase con service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar que el tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("[receive-report] Tenant not found:", tenant_id);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generar nombre de archivo si no se proporciona
    const finalFileName = file_name || `reporte-${report_type}-${period_start}-${period_end}.html`;

    // Insertar el reporte en la base de datos
    const { data: report, error: insertError } = await supabase
      .from("generated_reports")
      .insert({
        tenant_id,
        report_type,
        file_name: finalFileName,
        html_content,
        file_size: body.file_size || new Blob([html_content]).size,
        period_start,
        period_end,
        status: "generated",
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("[receive-report] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save report", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[receive-report] Report saved successfully:", report.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Report saved successfully",
        report: {
          id: report.id,
          tenant_id: report.tenant_id,
          report_type: report.report_type,
          file_name: report.file_name,
          period_start: report.period_start,
          period_end: report.period_end,
          created_at: report.created_at,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[receive-report] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
