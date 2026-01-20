// Cliente de Supabase externo para n8n_chat_histories (realtime)
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://gfltyrhndfuttacrmcjd.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHR5cmhuZGZ1dHRhY3JtY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDc4NTcsImV4cCI6MjA4MzU4Mzg1N30.7xrEuVCFKT8vO6JLXTJx4cAVkhc5MIqxa7dPrZ6-IMU';

// Interfaz para los mensajes de chat de n8n
export interface N8nChatMessage {
  id: number;
  session_id: string;
  tenant_id: string; // UUID del tenant para filtrar por cuenta
  phone_number: string | null; // Número de teléfono del contacto
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: unknown[];
  };
  created_at: string;
  bot_active: boolean; // Estado del bot (true = activo, false = humano tomó control)
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
