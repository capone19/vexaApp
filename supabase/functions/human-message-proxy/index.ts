import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Webhook por defecto para tenants sin configuración específica
const DEFAULT_WEBHOOK_URL =
  "https://n8n-growthpartners-n8n.q7anmx.easypanel.host/webhook/50e5fdf6-62a3-4484-b889-e5eb7e4207cf";

function normalizeWebhookUrl(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function toQueryParams(payload: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  return params;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;

    const msg = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!msg || msg.length > 2000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Mensaje inválido (vacío o demasiado largo)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = payload.tenant_id as string | undefined;
    
    console.log(
      "[human-message-proxy] Forwarding message for session:",
      payload.session_id,
      "tenant:",
      tenantId || "none"
    );

    // Determinar el webhook URL basado en el tenant
    let webhookUrl = DEFAULT_WEBHOOK_URL;

    if (tenantId) {
      // Crear cliente Supabase con service role para bypasear RLS
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Buscar webhook específico para este tenant
        const { data: webhookConfig, error: webhookError } = await supabase
          .from("tenant_webhooks")
          .select("webhook_url")
          .eq("tenant_id", tenantId)
          .eq("webhook_type", "human_message")
          .eq("is_active", true)
          .single();

        if (webhookError) {
          console.log(
            "[human-message-proxy] No specific webhook found for tenant, using default:",
            webhookError.message
          );
        }

        if (webhookConfig?.webhook_url) {
          webhookUrl = webhookConfig.webhook_url;
          console.log(
            "[human-message-proxy] Using tenant-specific webhook:",
            webhookUrl
          );
        }
      } else {
        console.warn("[human-message-proxy] Missing Supabase env vars, using default webhook");
      }
    }

    const normalizedUrl = normalizeWebhookUrl(webhookUrl);
    console.log("[human-message-proxy] Final webhook URL:", normalizedUrl);

    // 1) Intentar POST (ideal)
    let n8nResponse = await fetch(normalizedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(payload),
    });

    let responseText = await n8nResponse.text();

    // 2) Si el webhook en n8n está configurado como GET, n8n devuelve 404 con mensaje explícito.
    if (
      n8nResponse.status === 404 &&
      responseText.includes("not registered for POST")
    ) {
      const url = `${normalizedUrl}?${toQueryParams(payload).toString()}`;
      console.log("[human-message-proxy] POST not allowed, retrying with GET");

      n8nResponse = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      });

      responseText = await n8nResponse.text();
    }

    console.log("[human-message-proxy] n8n response status:", n8nResponse.status);

    return new Response(
      JSON.stringify({
        success: n8nResponse.ok,
        status: n8nResponse.status,
        response: responseText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[human-message-proxy] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
