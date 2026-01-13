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

  // 1) Guardar en agent_settings_ui (sin devolver filas para evitar bloqueos)
  let cloudSaved = false;

  const upsertViaRestWithTimeout = async (ms: number) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Sesión no disponible (sin access token)");
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/agent_settings_ui?on_conflict=tenant_id,section_key`;

      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          section_key: sectionId,
          data: cleanData,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DB upsert failed (${res.status}) ${text}`.trim());
      }
    } finally {
      clearTimeout(t);
    }
  };

  try {
    console.log("[SaveSection] Intentando upsert en agent_settings_ui...");

    // supabase-js a veces deja requests colgados tras inactividad.
    // REST directo + AbortController nos permite cortar por timeout real.
    try {
      await upsertViaRestWithTimeout(10000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[SaveSection] Upsert falló/timeout, refrescando sesión y reintentando...", msg);
      await supabase.auth.refreshSession().catch(() => null);
      await upsertViaRestWithTimeout(10000);
    }

    cloudSaved = true;
    console.log("[SaveSection] ✅ Guardado en agent_settings_ui:", sectionId);
  } catch (err) {
    console.error("[SaveSection] ❌ Error guardando en DB:", err);
    const errorMsg = err instanceof Error ? err.message : "Error guardando en base de datos";
    errors.push(errorMsg);
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
