// VEXA - Constantes globales

/**
 * ID del cliente de prueba para desarrollo
 * Este UUID corresponde al registro en la tabla de Supabase para testing
 */
export const DEV_CLIENT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * URLs de webhooks
 * Configuradas mediante variables de entorno para facilitar el despliegue
 */
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || "https://n8n-growthpartners-n8n.q7anmx.easypanel.host";
const N8N_AGENT_PATH = import.meta.env.VITE_N8N_WEBHOOK_AGENT || "/webhook/agente";
const N8N_SETTINGS_PATH = import.meta.env.VITE_N8N_WEBHOOK_SETTINGS || "/webhook/76e801a3-1b3d-4753-be54-a81223b3c29f";
const N8N_HUMAN_MESSAGE_PATH = import.meta.env.VITE_N8N_WEBHOOK_HUMAN_MESSAGE || "/webhook/50e5fdf6-62a3-4484-b889-e5eb7e4207cf";

export const WEBHOOKS = {
  N8N_AGENT: `${N8N_BASE_URL}${N8N_AGENT_PATH}`,
  N8N_SETTINGS: `${N8N_BASE_URL}${N8N_SETTINGS_PATH}`,
  N8N_HUMAN_MESSAGE: `${N8N_BASE_URL}${N8N_HUMAN_MESSAGE_PATH}`, // Webhook para mensajes del agente humano
} as const;

