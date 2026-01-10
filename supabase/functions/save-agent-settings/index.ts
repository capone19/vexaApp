import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Section types that map to prompt columns
type SectionType = 
  | 'personality'
  | 'business'
  | 'policies'
  | 'services'
  | 'rescheduling'
  | 'payments'
  | 'handover'
  | 'faq'
  | 'limits';

const sectionToColumn: Record<SectionType, string> = {
  personality: 'prompt_personality',
  business: 'prompt_business_context',
  policies: 'prompt_policies',
  services: 'prompt_services',
  rescheduling: 'prompt_rescheduling',
  payments: 'prompt_payments',
  handover: 'prompt_handover',
  faq: 'prompt_faq',
  limits: 'prompt_limits',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL"); // Optional

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { tenant_id, section, data, generated_prompt } = body;

    if (!tenant_id || !section || !generated_prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenant_id, section, generated_prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate section type
    if (!sectionToColumn[section as SectionType]) {
      return new Response(
        JSON.stringify({ error: `Invalid section: ${section}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user belongs to tenant
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "User does not belong to this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get column name for this section
    const columnName = sectionToColumn[section as SectionType];

    // Update the agent_prompts table
    const { error: updateError } = await supabaseAdmin
      .from("agent_prompts")
      .update({ [columnName]: generated_prompt })
      .eq("tenant_id", tenant_id);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to audit table
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id,
      user_id: user.id,
      action: "update",
      table_name: "agent_prompts",
      new_values: { section, [columnName]: generated_prompt },
    });

    // OPTIONAL: Notify n8n webhook if configured
    let n8nResponse = null;
    if (n8nWebhookUrl) {
      try {
        const webhookPayload = {
          event: "agent_settings_updated",
          tenant_id,
          section,
          column: columnName,
          generated_prompt,
          raw_data: data,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        };

        const n8nResult = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        n8nResponse = {
          status: n8nResult.status,
          ok: n8nResult.ok,
        };
      } catch (webhookError) {
        console.error("n8n webhook error:", webhookError);
        // Don't fail the request if webhook fails
        n8nResponse = { error: "Webhook notification failed" };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Settings for ${section} saved successfully`,
        column_updated: columnName,
        n8n_notification: n8nResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
