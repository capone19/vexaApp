// ============================================
// VEXA - Webhook n8n Integration
// Arquitectura híbrida: Lovable Cloud (UI) + n8n (procesamiento) + Supabase (operativo)
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type { AgentSettingsSectionId } from "@/pages/AgentSettings";

// Mapeo de section_key a section_label
const SECTION_LABELS: Record<AgentSettingsSectionId, string> = {
  personality: "Personalidad del Agente",
  business: "Sobre tu negocio",
  policies: "Políticas generales",
  services: "Servicios",
  rescheduling: "Re-agendamientos",
  payments: "Opciones de pago",
  intervention: "Intervención asistida",
  faq: "Preguntas frecuentes",
  limits: "Límites del agente",
};

// Mapeo interno de intervention -> handoff para n8n
const SECTION_KEY_MAP: Record<AgentSettingsSectionId, string> = {
  personality: "personality",
  business: "business",
  policies: "policies",
  services: "services",
  rescheduling: "rescheduling",
  payments: "payments",
  intervention: "handoff", // n8n espera "handoff"
  faq: "faqs", // n8n espera "faqs" (plural)
  limits: "limits",
};

export interface WebhookPayload {
  event: "agent_settings.saved";
  tenant_id: string;
  section_key: string;
  section_label: string;
  data: Record<string, unknown>;
  updated_by: string | null;
  occurred_at: string;
  source: "lovable-frontend";
  app: "VEXA";
  version: 1;
  // Campos extra recomendados
  ui_route: string;
  schema_hash?: string;
}

export interface WebhookResult {
  success: boolean;
  error?: string;
}

/**
 * Genera un hash simple de las keys del objeto para debugging
 */
function generateSchemaHash(data: Record<string, unknown>): string {
  const keys = Object.keys(data).sort().join(",");
  let hash = 0;
  for (let i = 0; i < keys.length; i++) {
    const char = keys.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Serializa datos para JSON, convirtiendo Dates a ISO strings
 */
function serializeForJSON(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(item => serializeForJSON(item));
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'function' || value === undefined) continue;
      result[key] = serializeForJSON(value);
    }
    return result;
  }
  return data;
}

/**
 * Prepara la data de la sección removiendo campos que no son del formulario
 * (como lastModified que es metadata interna) y serializando correctamente
 */
function prepareRawData(sectionData: Record<string, unknown>): Record<string, unknown> {
  // Crear copia sin lastModified (es metadata, no data del formulario)
  const { lastModified, ...rawData } = sectionData;
  // Serializar todo para JSON
  return serializeForJSON(rawData) as Record<string, unknown>;
}

// URL del webhook de n8n para ajustes del agente
// Configurable mediante variable de entorno, con fallback al valor por defecto
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || "https://n8n-growthpartners-n8n.q7anmx.easypanel.host";
const N8N_SETTINGS_PATH = import.meta.env.VITE_N8N_WEBHOOK_SETTINGS || "/webhook/76e801a3-1b3d-4753-be54-a81223b3c29f";
const N8N_WEBHOOK_URL = `${N8N_BASE_URL}${N8N_SETTINGS_PATH}`;

/**
 * Envía el evento de guardado a n8n
 * Intenta Edge Function primero, si falla usa fetch directo
 * REGLA: 1 botón = 1 evento = 1 sección
 * REGLA: RAW = TODO lo rellenable (sin excepciones)
 */
export async function sendWebhookToN8n(
  sectionId: AgentSettingsSectionId,
  sectionData: Record<string, unknown>,
  tenantId: string,
  userId: string | null
): Promise<WebhookResult> {
  const rawData = prepareRawData(sectionData);
  
  const payload: WebhookPayload = {
    event: "agent_settings.saved",
    tenant_id: tenantId,
    section_key: SECTION_KEY_MAP[sectionId],
    section_label: SECTION_LABELS[sectionId],
    data: rawData,
    updated_by: userId,
    occurred_at: new Date().toISOString(),
    source: "lovable-frontend",
    app: "VEXA",
    version: 1,
    ui_route: `/ajustes-agente?section=${sectionId}`,
    schema_hash: generateSchemaHash(rawData),
  };

  console.log("[Webhook n8n] 🚀 Payload preparado:", payload);

  // Método 1: Intentar via Edge Function (evita CORS)
  try {
    console.log("[Webhook n8n] Intentando via Edge Function...");
    const { data, error } = await supabase.functions.invoke('webhook-n8n-proxy', {
      body: payload,
    });

    if (!error && data) {
      console.log("[Webhook n8n] ✅ Enviado via Edge Function:", data);
      return { success: true };
    }
    
    console.warn("[Webhook n8n] Edge Function falló:", error?.message);
  } catch (edgeError) {
    console.warn("[Webhook n8n] Edge Function error:", edgeError);
  }

  // Método 2: Fallback - fetch directo con no-cors
  try {
    console.log("[Webhook n8n] Intentando fetch directo (no-cors)...");
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[Webhook n8n] ✅ Enviado via fetch directo (fire-and-forget)");
    return { success: true };
  } catch (fetchError) {
    console.error("[Webhook n8n] ❌ Todos los métodos fallaron:", fetchError);
    return { 
      success: false, 
      error: fetchError instanceof Error ? fetchError.message : "Error desconocido" 
    };
  }
}
