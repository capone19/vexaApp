import { useState, useEffect, useCallback, useRef } from 'react';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseN8nChatHistoryOptions {
  sessionId?: string;
  limit?: number;
  enableRealtime?: boolean;
  pollingIntervalMs?: number;
}

export function useN8nChatHistory(options: UseN8nChatHistoryOptions = {}) {
  const { 
    sessionId, 
    limit = 100, 
    enableRealtime = true,
    pollingIntervalMs = 3000
  } = options;
  
  const [messages, setMessages] = useState<N8nChatMessage[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch all unique sessions
  const fetchSessions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await externalSupabase
        .from('n8n_chat_histories')
        .select('session_id')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      // Get unique session IDs
      const uniqueSessions = [...new Set(data?.map(d => d.session_id) || [])];
      setSessions(uniqueSessions);
    } catch (err) {
      console.error('[useN8nChatHistory] Error fetching sessions:', err);
    }
  }, []);

  // Fetch messages for a specific session or all
  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      let query = externalSupabase
        .from('n8n_chat_histories')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const newMessages = data as N8nChatMessage[] || [];
      
      // Actualizar solo si hay cambios (para evitar re-renders innecesarios)
      setMessages(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const newIds = new Set(newMessages.map(m => m.id));
        
        // Si son diferentes, actualizar
        if (prevIds.size !== newIds.size || 
            newMessages.some(m => !prevIds.has(m.id))) {
          // Trackear último ID para polling eficiente
          if (newMessages.length > 0) {
            lastMessageIdRef.current = Math.max(...newMessages.map(m => m.id));
          }
          return newMessages;
        }
        return prev;
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Error fetching chat history';
      console.error('[useN8nChatHistory] Error:', err);
      if (!silent) {
        setError(errorMessage);
      }
    } finally {
      if (!silent && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessionId, limit]);

  // Polling para nuevos mensajes (fallback cuando realtime no está disponible)
  const fetchNewMessages = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      let query = externalSupabase
        .from('n8n_chat_histories')
        .select('*')
        .order('created_at', { ascending: true });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      // Solo buscar mensajes más nuevos que el último conocido
      if (lastMessageIdRef.current) {
        query = query.gt('id', lastMessageIdRef.current);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const newMessages = data as N8nChatMessage[] || [];
      
      if (newMessages.length > 0) {
        console.log('[useN8nChatHistory] Polling: found', newMessages.length, 'new messages');
        
        // Actualizar último ID
        lastMessageIdRef.current = Math.max(...newMessages.map(m => m.id));
        
        // Agregar nuevos mensajes
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          if (uniqueNew.length > 0) {
            return [...prev, ...uniqueNew].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return prev;
        });
        
        // También actualizar sessions si hay nuevas
        fetchSessions();
      }
    } catch (err) {
      console.error('[useN8nChatHistory] Polling error:', err);
    }
  }, [sessionId, fetchSessions]);

  // Subscribe to realtime changes
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (enableRealtime) {
      channel = externalSupabase
        .channel('n8n_chat_histories_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'n8n_chat_histories',
            ...(sessionId ? { filter: `session_id=eq.${sessionId}` } : {}),
          },
          (payload) => {
            if (!isMountedRef.current) return;
            
            console.log('[useN8nChatHistory] Realtime event:', payload.eventType);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as N8nChatMessage;
              
              // Actualizar último ID
              if (newMessage.id > (lastMessageIdRef.current || 0)) {
                lastMessageIdRef.current = newMessage.id;
              }
              
              setMessages(prev => {
                // Evitar duplicados
                if (prev.some(m => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
              
              // Update sessions list if new session
              setSessions(prev => {
                if (!prev.includes(newMessage.session_id)) {
                  return [newMessage.session_id, ...prev];
                }
                return prev;
              });
            } else if (payload.eventType === 'UPDATE') {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === (payload.new as N8nChatMessage).id 
                    ? payload.new as N8nChatMessage 
                    : msg
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => 
                prev.filter(msg => msg.id !== (payload.old as { id: number }).id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('[useN8nChatHistory] Realtime subscription status:', status);
          if (isMountedRef.current) {
            setRealtimeConnected(status === 'SUBSCRIBED');
          }
        });
    }

    return () => {
      if (channel) {
        externalSupabase.removeChannel(channel);
      }
    };
  }, [sessionId, enableRealtime]);

  // Polling fallback - siempre activo para garantizar sincronización
  useEffect(() => {
    // Iniciar polling
    pollingRef.current = setInterval(() => {
      fetchNewMessages();
    }, pollingIntervalMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchNewMessages, pollingIntervalMs]);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
    fetchMessages();
  }, [fetchSessions, fetchMessages]);

  return {
    messages,
    sessions,
    isLoading,
    error,
    realtimeConnected,
    refetch: fetchMessages,
    refetchSessions: fetchSessions,
  };
}
