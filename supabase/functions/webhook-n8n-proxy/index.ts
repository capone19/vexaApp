import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URL del webhook de n8n configurable mediante variable de entorno
// En Supabase Edge Functions, las variables de entorno se configuran en el dashboard
const N8N_BASE_URL = Deno.env.get("N8N_BASE_URL") || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const N8N_SETTINGS_PATH = Deno.env.get("N8N_WEBHOOK_SETTINGS") || "/webhook/76e801a3-1b3d-4753-be54-a81223b3c29f";
const N8N_WEBHOOK_URL = `${N8N_BASE_URL}${N8N_SETTINGS_PATH}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate JWT token before processing
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[webhook-n8n-proxy] No auth header, rejecting");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      console.warn("[webhook-n8n-proxy] Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[webhook-n8n-proxy] Authenticated user:", caller.id);

    const payload = await req.json();

    // Calendario → imprimir pedido (POST a /webhook/imprimir)
    if (
      payload &&
      typeof payload === "object" &&
      (payload as Record<string, unknown>).__vexa_action === "print_imprimir"
    ) {
      const { __vexa_action: _a, ...printPayload } = payload as Record<string, unknown>;
      const printUrl =
        Deno.env.get("N8N_PRINT_WEBHOOK_URL") ||
        `${N8N_BASE_URL}/webhook/imprimir`;
      console.log("[webhook-n8n-proxy] print_imprimir →", printUrl);
      const n8nResponse = await fetch(printUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(printPayload),
      });
      const responseText = await n8nResponse.text();
      return new Response(
        JSON.stringify({
          success: n8nResponse.ok,
          status: n8nResponse.status,
          response: responseText.slice(0, 2000),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[webhook-n8n-proxy] Forwarding to n8n:", payload.section_key);

    // Forward to n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await n8nResponse.text();
    
    console.log("[webhook-n8n-proxy] n8n response status:", n8nResponse.status);

    return new Response(
      JSON.stringify({
        success: n8nResponse.ok,
        status: n8nResponse.status,
        response: responseText,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[webhook-n8n-proxy] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
