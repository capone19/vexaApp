// ============================================
// VEXA Content Studio - Puente con n8n
// Toda acción del Studio (subir, programar, generar con IA, automatizaciones)
// se envía como un evento a un único webhook de n8n, que enruta por `event`.
// ============================================

import type { PlatformId } from "./types";

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const N8N_STUDIO_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO || "";

export interface StudioEventPayload {
  event: string;
  tenant_id: string | null;
  platform: PlatformId | "multi";
  account_ids: string[];
  data: Record<string, unknown>;
  occurred_at: string;
  source: "vexa-studio";
  app: "VEXA";
  version: 1;
}

export interface StudioEventResult<T = unknown> {
  success: boolean;
  /** true cuando no hay webhook configurado (modo demo) */
  notConfigured?: boolean;
  /** Respuesta de n8n ("Respond to Webhook"), p. ej. metadatos generados por IA */
  data?: T;
  error?: string;
}

export function isStudioWebhookConfigured(): boolean {
  return N8N_STUDIO_PATH.length > 0;
}

export async function sendStudioEvent<T = unknown>(
  input: Omit<StudioEventPayload, "occurred_at" | "source" | "app" | "version">
): Promise<StudioEventResult<T>> {
  if (!isStudioWebhookConfigured()) {
    return { success: false, notConfigured: true };
  }

  const payload: StudioEventPayload = {
    ...input,
    occurred_at: new Date().toISOString(),
    source: "vexa-studio",
    app: "VEXA",
    version: 1,
  };

  try {
    const response = await fetch(`${N8N_BASE_URL}${N8N_STUDIO_PATH}`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { success: false, error: `n8n respondió ${response.status}` };
    }
    const text = await response.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = undefined;
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
