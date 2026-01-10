// ============================================
// VEXA - Save Agent Section (Arquitectura Híbrida)
// ============================================
// 1. Guarda en agent_settings_ui (persistencia UI)
// 2. Dispara webhook a n8n con DATA RAW COMPLETA
// 3. n8n procesa y guarda mini-prompts en agent_prompts

import { supabase } from "@/integrations/supabase/client";
import { sendWebhookToN8n } from "./webhook-n8n";
import type { AgentSettingsSectionId } from "@/pages/AgentSettings";

export interface SaveSectionResult {
  success: boolean;
  cloudSaved: boolean;
  webhookSent: boolean;
  error?: string;
}

/**
 * Guarda una sección de ajustes del agente
 * Arquitectura híbrida:
 * - agent_settings_ui: persistencia UI (datos raw del formulario)
 * - n8n webhook: procesamiento para bot → guarda en agent_prompts
 */
export async function saveAgentSection(
  sectionId: AgentSettingsSectionId,
  sectionData: Record<string, unknown>,
  tenantId: string,
  userId: string | null
): Promise<SaveSectionResult> {
  const errors: string[] = [];

  // 1) Guardar en agent_settings_ui (esto define el éxito del guardado en UI)
  let cloudSaved = false;
  try {
    const { error: upsertError } = await (supabase as any)
      .from("agent_settings_ui")
      .upsert(
        {
          tenant_id: tenantId,
          section_key: sectionId,
          data: sectionData,
          updated_by: userId,
        },
        {
          onConflict: "tenant_id,section_key",
        }
      );

    if (upsertError) {
      throw new Error(upsertError.message || "Error en base de datos");
    }

    cloudSaved = true;
    console.log("[SaveSection] Guardado en agent_settings_ui:", sectionId);
  } catch (err) {
    console.error("[SaveSection] Error guardando en DB:", err);
    errors.push(err instanceof Error ? err.message : "Error guardando en base de datos");
  }

  // 2) Webhook a n8n: fire-and-forget (NO bloquea el botón Guardar)
  // Nota: no podemos cancelar supabase.functions.invoke, pero tampoco lo esperamos.
  let webhookSent = false;
  if (cloudSaved) {
    const timeoutMs = 5000;

    void (async () => {
      try {
        const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
          setTimeout(() => resolve({ success: false, error: "Timeout" }), timeoutMs);
        });

        const webhookPromise = sendWebhookToN8n(sectionId, sectionData, tenantId, userId);
        const result = await Promise.race([webhookPromise, timeoutPromise]);

        if (!result.success) {
          console.warn("[SaveSection] Webhook no completado:", result.error);
        } else {
          console.log("[SaveSection] Webhook enviado:", sectionId);
        }
      } catch (e) {
        console.warn("[SaveSection] Webhook error:", e);
      }
    })();

    // Importante: reportamos 'webhookSent' como false por defecto porque es async.
    // El usuario ya ve el guardado instantáneo; el procesamiento continúa en background.
    webhookSent = false;
  }

  return {
    success: cloudSaved,
    cloudSaved,
    webhookSent,
    error: errors.length > 0 ? errors.join(". ") : undefined,
  };
}

/**
 * Carga los datos guardados de una sección para restaurar el formulario
 */
export async function loadAgentSection(
  sectionId: AgentSettingsSectionId,
  tenantId: string
): Promise<Record<string, unknown> | null> {
  try {
    // Cast to any because types may not be updated yet
    const { data, error } = await (supabase as any)
      .from('agent_settings_ui')
      .select('data, updated_at')
      .eq('tenant_id', tenantId)
      .eq('section_key', sectionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found - not an error
        return null;
      }
      console.error("[LoadSection] Error:", error);
      return null;
    }

    return data?.data as Record<string, unknown> | null;
  } catch (err) {
    console.error("[LoadSection] Error cargando sección:", err);
    return null;
  }
}
