import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nota: algunos proxies/rutas requieren trailing slash; lo normalizamos.
const RAW_N8N_WEBHOOK_URL =
  "https://n8n-growthpartners-n8n.q7anmx.easypanel.host/webhook/50e5fdf6-62a3-4484-b889-e5eb7e4207cf";
const N8N_WEBHOOK_URL = RAW_N8N_WEBHOOK_URL.endsWith("/")
  ? RAW_N8N_WEBHOOK_URL
  : `${RAW_N8N_WEBHOOK_URL}/`;

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

    console.log(
      "[human-message-proxy] Forwarding message for session:",
      payload.session_id
    );

    // 1) Intentar POST (ideal)
    let n8nResponse = await fetch(N8N_WEBHOOK_URL, {
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
      const url = `${N8N_WEBHOOK_URL}?${toQueryParams(payload).toString()}`;
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
