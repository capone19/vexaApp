// ============================================
// VEXA - Webhook n8n Integration
// Arquitectura híbrida: Lovable Cloud (UI) + n8n (procesamiento) + Supabase (operativo)
// ============================================

import type { AgentSettingsSectionId } from "@/pages/AgentSettings";

// Webhook endpoint de producción
const N8N_WEBHOOK_URL = "https://n8n-growthpartners-n8n.q7anmx.easypanel.host/webhook/76e801a3-1b3d-4753-be54-a81223b3c29f";

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
 * Prepara la data de la sección removiendo campos que no son del formulario
 * (como lastModified que es metadata interna)
 */
function prepareRawData(sectionData: Record<string, unknown>): Record<string, unknown> {
  // Crear copia sin lastModified (es metadata, no data del formulario)
  const { lastModified, ...rawData } = sectionData;
  return rawData;
}

/**
 * Envía el evento de guardado a n8n
 * REGLA: 1 botón = 1 evento = 1 sección
 * REGLA: RAW = TODO lo rellenable (sin excepciones)
 */
export async function sendWebhookToN8n(
  sectionId: AgentSettingsSectionId,
  sectionData: Record<string, unknown>,
  tenantId: string,
  userId: string | null
): Promise<WebhookResult> {
  try {
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

    console.log("[Webhook n8n] Enviando payload:", payload);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "no-cors", // n8n puede no tener CORS configurado
      body: JSON.stringify(payload),
    });

    // Con no-cors no podemos leer el status real
    // Asumimos éxito si no hay excepción
    console.log("[Webhook n8n] Enviado exitosamente");
    
    return { success: true };
  } catch (error) {
    console.error("[Webhook n8n] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}
