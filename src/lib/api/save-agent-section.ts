// ============================================
// VEXA - Save Agent Section (Arquitectura Híbrida)
// ============================================
// 1. Guarda en Lovable Cloud (persistencia UI)
// 2. Dispara webhook a n8n con DATA RAW COMPLETA
// 3. n8n procesa y guarda mini-prompts en Supabase

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
 * - Lovable Cloud: persistencia UI (siempre intenta guardar)
 * - n8n webhook: procesamiento para bot (siempre intenta enviar)
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

  // 1. Guardar en Lovable Cloud (persistencia UI)
  // Por ahora es mock - se puede conectar a tabla específica si se necesita
  try {
    // TODO: Implementar persistencia en tabla de Lovable Cloud si es necesario
    // Por ahora el estado se mantiene en memoria y localStorage
    cloudSaved = true;
    console.log("[SaveSection] Guardado en Cloud (mock):", sectionId);
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
