// Cliente de Supabase externo para n8n_chat_histories (realtime)
import { createClient } from '@supabase/supabase-js';

// URLs configurables exclusivamente mediante variables de entorno
const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;

if (!EXTERNAL_SUPABASE_URL || !EXTERNAL_SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variables: VITE_EXTERNAL_SUPABASE_URL and VITE_EXTERNAL_SUPABASE_ANON_KEY must be configured in .env file'
  );
}

// Interfaz para media en mensajes
export interface N8nMessageMedia {
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
}

// Interfaz para los mensajes de chat de n8n
export interface N8nChatMessage {
  id: number;
  session_id: string;
  tenant_id: string; // UUID del tenant para filtrar por cuenta
  phone_number: string | null; // Número de teléfono del contacto
  message: {
    type: 'human' | 'ai';
    content: string | null;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: unknown[];
  };
  media: N8nMessageMedia | null; // Media attachment (imagen, audio, etc.)
  created_at: string;
  bot_activado: boolean; // Estado del bot (true = activo, false = humano tomó control)
  pedido_agendado: boolean; // Si hay una cita/pedido agendado
}

// Interfaz para bookings externos
export interface ExternalBooking {
  id: string;
  tenant_id: string;
  session_id: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  type: 'product' | 'service';
  item_name: string;
  price: number;
  currency: string;
  event_date: string;       // "YYYY-MM-DD"
  event_time: string | null; // "HH:MM:SS" o null para productos
  origin: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Columnas directas de despacho (no en metadata)
  address: string | null;
  comuna: string | null;
  region: string | null;
  shipping_cost: number | null;
  payment_method: string | null;
  estimated_delivery_date: string | null;  // "YYYY-MM-DD"
  estimated_delivery_time: string | null;  // "HH:MM-HH:MM"
}

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
