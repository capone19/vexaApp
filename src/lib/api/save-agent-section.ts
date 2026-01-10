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
  let cloudSaved = false;
  let webhookSent = false;
  let error: string | undefined;

  // 1. Guardar en agent_settings_ui (persistencia UI)
  try {
    // Cast to any because types may not be updated yet
    const { error: upsertError } = await (supabase as any)
      .from('agent_settings_ui')
      .upsert(
        {
          tenant_id: tenantId,
          section_key: sectionId,
          data: sectionData,
          updated_by: userId,
        },
        {
          onConflict: 'tenant_id,section_key',
        }
      );

    if (upsertError) {
      console.error("[SaveSection] Error guardando en DB:", upsertError);
      error = "Error guardando en base de datos";
    } else {
      cloudSaved = true;
      console.log("[SaveSection] Guardado en agent_settings_ui:", sectionId);
    }
  } catch (err) {
    console.error("[SaveSection] Error guardando en Cloud:", err);
    error = "Error guardando localmente";
  }

  // 2. Disparar webhook a n8n con DATA RAW COMPLETA
  try {
    const webhookResult = await sendWebhookToN8n(
      sectionId,
      sectionData,
      tenantId,
      userId
    );
    
    webhookSent = webhookResult.success;
    
    if (!webhookResult.success && webhookResult.error) {
      error = error 
        ? `${error}. ${webhookResult.error}` 
        : webhookResult.error;
    }
  } catch (err) {
    console.error("[SaveSection] Error enviando webhook:", err);
    const webhookError = err instanceof Error ? err.message : "Error enviando a procesamiento";
    error = error ? `${error}. ${webhookError}` : webhookError;
  }

  return {
    success: cloudSaved && webhookSent,
    cloudSaved,
    webhookSent,
    error,
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
