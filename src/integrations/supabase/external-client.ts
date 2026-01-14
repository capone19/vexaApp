// Cliente de Supabase externo para n8n_chat_histories (realtime)
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://gfltyrhndfuttacrmcjd.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHR5cmhuZGZ1dHRhY3JtY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDc4NTcsImV4cCI6MjA4MzU4Mzg1N30.7xrEuVCFKT8vO6JLXTJx4cAVkhc5MIqxa7dPrZ6-IMU';

// Interfaz para los mensajes de chat de n8n
export interface N8nChatMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: unknown[];
  };
  created_at: string;
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
