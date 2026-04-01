// ============================================
// VEXA - Hook para Chat Sessions (Supabase Real)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, Message, FunnelStage, ChatStatus } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Mapeo de funnel_stage de Supabase a UI
const mapFunnelStage = (stage: string | null): FunnelStage => {
  switch (stage) {
    case 'tofu':
    case 'mofu':
      return 'warm';
    case 'hot':
    case 'bofu':
      return 'hot';
    case 'converted':
      return 'converted';
    case 'lost':
      return 'dead';
    default:
      return 'warm';
  }
};

// Mapeo de chat_status de Supabase a UI
const mapChatStatus = (status: string | null): ChatStatus => {
  switch (status) {
    case 'active':
    case 'waiting':
    case 'escalated':
      return 'active';
    case 'resolved':
    case 'abandoned':
      return 'closed';
    default:
      return 'active';
  }
};

// Mapeo de sender_type de Supabase a UI
const mapSender = (senderType: string): 'user' | 'bot' | 'human' => {
  switch (senderType) {
    case 'user':
    case 'customer':
      return 'user';
    case 'bot':
    case 'ai':
      return 'bot';
    case 'agent':
    case 'human':
      return 'human';
    default:
      return 'bot';
  }
};

interface UseChatSessionsOptions {
  tenantId: string | null | undefined;
  enableRealtime?: boolean;
}

interface UseChatSessionsReturn {
  chats: Chat[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<Message[]>;
}

export function useChatSessions({ 
  tenantId, 
  enableRealtime = true 
}: UseChatSessionsOptions): UseChatSessionsReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar sesiones de chat
  const fetchSessions = useCallback(async () => {
    if (!tenantId) {
      setChats([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener sesiones con último mensaje
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          contact_name,
          contact_phone,
          status,
          funnel_stage,
          is_handoff,
          last_message_at,
          created_at,
          wa_contact_id
        `)
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (sessionsError) {
        throw sessionsError;
      }

      // Para cada sesión, obtener el último mensaje en paralelo
      const sessionsWithMessages: Chat[] = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('id, content, sender_type, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: session.id,
            sessionId: session.id,
            userName: session.contact_name || session.contact_phone || 'Sin nombre',
            userPhone: session.contact_phone || undefined,
            channel: 'whatsapp',
            status: mapChatStatus(session.status),
            funnelStage: mapFunnelStage(session.funnel_stage),
            lastMessageAt: session.last_message_at ? new Date(session.last_message_at) : new Date(session.created_at),
            hasHumanIntervention: session.is_handoff || false,
            messages: lastMessage ? [{
              id: lastMessage.id,
              chatId: session.id,
              content: lastMessage.content || '',
              sender: mapSender(lastMessage.sender_type),
              timestamp: new Date(lastMessage.created_at),
              read: true,
            }] : [],
            createdAt: new Date(session.created_at),
          } as Chat;
        })
      );

      setChats(sessionsWithMessages);
    } catch (err) {
      console.error('[useChatSessions] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando chats');
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Cargar mensajes de una sesión específica
  const loadMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    if (!tenantId) return [];

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, content, sender_type, created_at, direction')
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (messages || []).map(msg => ({
        id: msg.id,
        chatId: sessionId,
        content: msg.content || '',
        sender: mapSender(msg.sender_type),
        timestamp: new Date(msg.created_at),
        read: true,
      }));
    } catch (err) {
      console.error('[useChatSessions] Error loading messages:', err);
      return [];
    }
  }, [tenantId]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Efecto para realtime
  useEffect(() => {
    if (!tenantId || !enableRealtime) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = () => {
      channel = supabase
        .channel(`chat_updates_${tenantId}`)
        // Escuchar nuevas sesiones
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_sessions',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            console.log('[Realtime] Nueva sesión:', payload.new);
            fetchSessions(); // Recargar todo para mantener consistencia
          }
        )
        // Escuchar actualizaciones de sesiones
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            console.log('[Realtime] Sesión actualizada:', payload.new);
            fetchSessions();
          }
        )
        // Escuchar nuevos mensajes
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            console.log('[Realtime] Nuevo mensaje:', payload.new);
            fetchSessions(); // Actualizar para mostrar último mensaje
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log('[Realtime] Removing channel');
        supabase.removeChannel(channel);
      }
    };
  }, [tenantId, enableRealtime, fetchSessions]);

  return {
    chats,
    isLoading,
    error,
    refetch: fetchSessions,
    loadMessages,
  };
}

