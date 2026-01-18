import { useState, useEffect, useCallback, useRef } from 'react';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseN8nChatHistoryOptions {
  sessionId?: string;
  tenantId?: string; // Filtrar por tenant del usuario logueado
  limit?: number;
  enableRealtime?: boolean;
  pollingIntervalMs?: number;
}

// Función para deduplicar mensajes con el mismo contenido + tipo + session en ventana de tiempo
function deduplicateMessages(messages: N8nChatMessage[]): N8nChatMessage[] {
  const seen = new Map<string, N8nChatMessage>();
  const TIME_WINDOW_MS = 10000; // 10 segundos de ventana
  
  // Ordenar por fecha primero
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  for (const msg of sorted) {
    // Crear clave única: session + tipo + contenido normalizado
    const contentKey = `${msg.session_id}|${msg.message.type}|${(msg.message.content || '').trim().toLowerCase()}`;
    
    const existing = seen.get(contentKey);
    if (existing) {
      // Si ya existe uno similar, verificar si está dentro de la ventana de tiempo
      const existingTime = new Date(existing.created_at).getTime();
      const currentTime = new Date(msg.created_at).getTime();
      
      // Si está dentro de la ventana, mantener el primero (ignorar duplicado)
      if (Math.abs(currentTime - existingTime) < TIME_WINDOW_MS) {
        continue; // Saltar este mensaje duplicado
      }
    }
    
    // Guardar usando el contentKey más el timestamp redondeado para permitir repeticiones legítimas
    const timeSlot = Math.floor(new Date(msg.created_at).getTime() / TIME_WINDOW_MS);
    const finalKey = `${contentKey}|${timeSlot}`;
    
    if (!seen.has(finalKey)) {
      seen.set(finalKey, msg);
    }
  }
  
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function useN8nChatHistory(options: UseN8nChatHistoryOptions = {}) {
  const { 
    sessionId, 
    tenantId,
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
      let query = externalSupabase
        .from('n8n_chat_histories')
        .select('session_id')
        .order('created_at', { ascending: false });

      // Filtrar por tenant si se proporciona
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      // Get unique session IDs
      const uniqueSessions = [...new Set(data?.map(d => d.session_id) || [])];
      setSessions(uniqueSessions);
    } catch (err) {
      console.error('[useN8nChatHistory] Error fetching sessions:', err);
    }
  }, [tenantId]);

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

      // Filtrar por tenant si se proporciona
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const rawMessages = data as N8nChatMessage[] || [];
      
      // Deduplicar mensajes por contenido + tipo + timestamp cercano (dentro de 5 segundos)
      const deduplicatedMessages = deduplicateMessages(rawMessages);
      
      // Actualizar solo si hay cambios (para evitar re-renders innecesarios)
      setMessages(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const newIds = new Set(deduplicatedMessages.map(m => m.id));
        
        // Si son diferentes, actualizar
        if (prevIds.size !== newIds.size || 
            deduplicatedMessages.some(m => !prevIds.has(m.id))) {
          // Trackear último ID para polling eficiente
          if (deduplicatedMessages.length > 0) {
            lastMessageIdRef.current = Math.max(...deduplicatedMessages.map(m => m.id));
          }
          return deduplicatedMessages;
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
  }, [sessionId, tenantId, limit]);

  // Polling para nuevos mensajes (fallback cuando realtime no está disponible)
  const fetchNewMessages = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      let query = externalSupabase
        .from('n8n_chat_histories')
        .select('*')
        .order('created_at', { ascending: true });

      // Filtrar por tenant si se proporciona
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

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
        
        // Agregar nuevos mensajes con deduplicación
        setMessages(prev => {
          const combined = [...prev, ...newMessages];
          return deduplicateMessages(combined);
        });
        
        // También actualizar sessions si hay nuevas
        fetchSessions();
      }
    } catch (err) {
      console.error('[useN8nChatHistory] Polling error:', err);
    }
  }, [sessionId, tenantId, fetchSessions]);

  // Subscribe to realtime changes
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (enableRealtime) {
      // Construir filtro para realtime (solo soporta un filtro)
      // Priorizamos tenantId si está presente
      const realtimeFilter = tenantId 
        ? `tenant_id=eq.${tenantId}` 
        : sessionId 
          ? `session_id=eq.${sessionId}` 
          : undefined;

      channel = externalSupabase
        .channel(`n8n_chat_histories_realtime_${tenantId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'n8n_chat_histories',
            ...(realtimeFilter ? { filter: realtimeFilter } : {}),
          },
          (payload) => {
            if (!isMountedRef.current) return;
            
            console.log('[useN8nChatHistory] Realtime event:', payload.eventType);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as N8nChatMessage;
              
              // Verificar que el mensaje pertenece al tenant (doble check)
              if (tenantId && newMessage.tenant_id !== tenantId) {
                return; // Ignorar mensajes de otros tenants
              }
              
              // Actualizar último ID
              if (newMessage.id > (lastMessageIdRef.current || 0)) {
                lastMessageIdRef.current = newMessage.id;
              }
              
              setMessages(prev => {
                // Agregar y deduplicar
                const combined = [...prev, newMessage];
                return deduplicateMessages(combined);
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
  }, [sessionId, tenantId, enableRealtime]);

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
