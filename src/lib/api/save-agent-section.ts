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
 * Serializa datos para JSON, convirtiendo Dates a ISO strings
 * y limpiando propiedades no serializables
 */
function serializeForJSON(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeForJSON(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        continue;
      }
      result[key] = serializeForJSON(value);
    }
    return result;
  }

  return data;
}

/**
 * Prepara los datos de la sección para guardar
 * - Remueve lastModified (se genera en el servidor)
 * - Serializa Dates a ISO strings
 */
function prepareDataForSave(sectionData: Record<string, unknown>): Record<string, unknown> {
  // Remover lastModified ya que es metadata interna
  const { lastModified, ...dataWithoutMeta } = sectionData;
  
  // Serializar todo para JSON
  return serializeForJSON(dataWithoutMeta) as Record<string, unknown>;
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

  // Preparar datos serializables
  const cleanData = prepareDataForSave(sectionData);
  
  console.log("[SaveSection] Preparando guardado:", {
    sectionId,
    tenantId,
    dataKeys: Object.keys(cleanData),
  });

  // 1) Guardar en agent_settings_ui con timeout de 8 segundos
  let cloudSaved = false;
  const saveTimeout = 8000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), saveTimeout);

    const { error: upsertError } = await (supabase as any)
      .from("agent_settings_ui")
      .upsert(
        {
          tenant_id: tenantId,
          section_key: sectionId,
          data: cleanData,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_id,section_key",
        }
      );

    clearTimeout(timeoutId);

    if (upsertError) {
      throw new Error(upsertError.message || "Error en base de datos");
    }

    cloudSaved = true;
    console.log("[SaveSection] ✅ Guardado en agent_settings_ui:", sectionId);
  } catch (err) {
    console.error("[SaveSection] ❌ Error guardando en DB:", err);
    const errorMsg = err instanceof Error ? err.message : "Error guardando en base de datos";
    
    // Si es error de timeout o abort, reportar específicamente
    if (errorMsg.includes('abort') || errorMsg.includes('timeout')) {
      errors.push("Timeout: la conexión con la base de datos tardó demasiado");
    } else {
      errors.push(errorMsg);
    }
  }

  // 2) Webhook a n8n: SIEMPRE se envía (independiente de Supabase)
  // Se ejecuta en background después de retornar
  setTimeout(() => {
    console.log("[SaveSection] 🚀 Enviando webhook a n8n...");
    sendWebhookToN8n(sectionId, cleanData, tenantId, userId)
      .then(result => {
        if (result.success) {
          console.log("[SaveSection] ✅ Webhook enviado:", sectionId);
        } else {
          console.warn("[SaveSection] ⚠️ Webhook falló:", result.error);
        }
      })
      .catch(e => {
        console.warn("[SaveSection] ⚠️ Webhook error:", e);
      });
  }, 50);

  return {
    success: cloudSaved,
    cloudSaved,
    webhookSent: cloudSaved, // Se envía async si guardó en cloud
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
