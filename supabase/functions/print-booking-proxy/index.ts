import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PRINT_URL =
  "https://n8ninnovatec-n8n.t0bgq1.easypanel.host/webhook/imprimir";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const targetUrl = Deno.env.get("N8N_PRINT_WEBHOOK_URL") || DEFAULT_PRINT_URL;
    const body = await req.text();

    const n8nRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: body || "{}",
    });

    const responseText = await n8nRes.text();

    return new Response(
      JSON.stringify({
        success: n8nRes.ok,
        status: n8nRes.status,
        response: responseText.slice(0, 2000),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[print-booking-proxy]", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
