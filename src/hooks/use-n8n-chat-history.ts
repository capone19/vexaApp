import { useState, useEffect, useCallback, useRef } from 'react';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseN8nChatHistoryOptions {
  sessionId?: string;
  tenantId?: string;
  since?: string;    // ISO date string — only fetch rows with created_at >= since
  limit?: number;    // Legacy — ignored when pagination is active
  enableRealtime?: boolean;
  pollingIntervalMs?: number;
}

const PAGE_SIZE = 1000; // PostgREST max rows per request on the external project
const SAFETY_LIMIT = 100_000;
const REALTIME_HEALTHY_POLLING_MS = 15_000;
const isDev = import.meta.env.DEV;

// Función para deduplicar mensajes con el mismo contenido + tipo + session en ventana de tiempo
function deduplicateMessages(messages: N8nChatMessage[]): N8nChatMessage[] {
  const seen = new Map<string, N8nChatMessage>();
  const TIME_WINDOW_MS = 10000; // 10 segundos de ventana
  
  // Filtrar mensajes con estructura válida: debe tener message object Y (content O media)
  const validMessages = messages.filter(msg => {
    if (!msg.message || typeof msg.message !== 'object') return false;
    const hasContent = msg.message.content && typeof msg.message.content === 'string' && msg.message.content.trim() !== '';
    const hasMedia = msg.media !== null && msg.media !== undefined;
    return hasContent || hasMedia;
  });
  
  // Ordenar por fecha primero
  const sorted = [...validMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  for (const msg of sorted) {
    // Crear clave única: session + tipo + contenido normalizado (o media url si no hay contenido)
    const msgType = msg.message?.type || 'unknown';
    const msgContent = msg.message?.content || '';
    const mediaKey = msg.media?.url || '';
    const contentKey = `${msg.session_id}|${msgType}|${msgContent.trim().toLowerCase()}|${mediaKey}`;
    
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
    since,
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Paginated fetch: retrieves ALL matching rows in PAGE_SIZE batches
  const fetchSessions = useCallback(async () => {
    if (!tenantId && !sessionId) {
      return;
    }
    try {
      let allData: Array<{ session_id: string }> = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = externalSupabase
          .from('n8n_chat_histories')
          .select('session_id')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        if (since) {
          query = query.gte('created_at', since);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!isMountedRef.current) return;

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData.push(...data);
          offset += data.length;
          if (data.length < PAGE_SIZE) hasMore = false;
        }
        if (offset >= SAFETY_LIMIT) {
          if (isDev) {
            console.warn('[useN8nChatHistory] Sessions hit safety limit', SAFETY_LIMIT);
          }
          hasMore = false;
        }
      }

      const uniqueSessions = [...new Set(allData.map(d => d.session_id))];
      setSessions(uniqueSessions);
    } catch (err) {
      if (isDev) {
        console.error('[useN8nChatHistory] Error fetching sessions:', err);
      }
    }
  }, [tenantId, since]);

  // Construye la query base con los filtros del hook
  const buildQuery = useCallback(
    (rangeStart: number) => {
      let q = externalSupabase
        .from('n8n_chat_histories')
        .select('*')
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeStart + PAGE_SIZE - 1);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      if (since) q = q.gte('created_at', since);
      if (sessionId) q = q.eq('session_id', sessionId);
      return q;
    },
    [tenantId, since, sessionId]
  );

  // Paginated fetch for messages — dos fases:
  // Fase 1: primera página → UI interactiva de inmediato (< 2 s)
  // Fase 2: páginas restantes en segundo plano (sin spinner)
  const fetchMessages = useCallback(async (silent = false) => {
    if (!tenantId && !sessionId) {
      if (!silent) setIsLoading(false);
      setMessages([]);
      return;
    }

    if (!silent) setIsLoading(true);
    setError(null);

    try {
      // === FASE 1: primera página ===
      const { data: firstData, error: firstError } = await buildQuery(0);
      if (firstError) throw firstError;
      if (!isMountedRef.current) return;

      const firstMessages = (firstData ?? []) as N8nChatMessage[];
      const dedupedFirst = deduplicateMessages(firstMessages);

      setMessages(dedupedFirst);
      if (dedupedFirst.length > 0) {
        lastMessageIdRef.current = Math.max(...firstMessages.map(m => m.id));
      }

      // *** Liberar spinner — el usuario ya puede interactuar ***
      if (!silent && isMountedRef.current) {
        setIsLoading(false);
      }

      // === FASE 2: páginas restantes en segundo plano ===
      if (firstMessages.length === PAGE_SIZE) {
        let accumulated: N8nChatMessage[] = [...firstMessages];
        let offset = PAGE_SIZE;
        let hasMore = true;

        while (hasMore && isMountedRef.current) {
          const { data: pageData, error: pageError } = await buildQuery(offset);

          if (pageError) {
            if (isDev) console.warn('[useN8nChatHistory] Background page error:', pageError);
            break;
          }
          if (!isMountedRef.current) break;

          const pageMessages = (pageData ?? []) as N8nChatMessage[];
          if (pageMessages.length === 0) {
            hasMore = false;
          } else {
            accumulated = [...accumulated, ...pageMessages];
            offset += pageMessages.length;
            if (pageMessages.length < PAGE_SIZE) hasMore = false;
          }

          if (offset >= SAFETY_LIMIT) {
            if (isDev) console.warn('[useN8nChatHistory] Messages hit safety limit', SAFETY_LIMIT);
            hasMore = false;
          }
        }

        if (isMountedRef.current && accumulated.length > firstMessages.length) {
          if (isDev) {
            console.log('[useN8nChatHistory] Background load complete:', accumulated.length, 'total rows');
          }
          const dedupedAll = deduplicateMessages(accumulated);
          setMessages(dedupedAll);
          if (dedupedAll.length > 0) {
            lastMessageIdRef.current = Math.max(...dedupedAll.map(m => m.id));
          }
        }
      } else if (isDev) {
        console.log('[useN8nChatHistory] Fetched total rows:', firstMessages.length);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Error fetching chat history';
      if (isDev) console.error('[useN8nChatHistory] Error:', err);
      if (!silent) setError(errorMessage);
    } finally {
      // Garantiza que el spinner se libera aunque Phase 1 falle
      if (!silent && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessionId, tenantId, since, buildQuery]);

  // Polling para nuevos mensajes (fallback cuando realtime no está disponible)
  const fetchNewMessages = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (!tenantId && !sessionId) return;
    
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
        if (isDev) {
          console.log('[useN8nChatHistory] Polling: found', newMessages.length, 'new messages');
        }
        
        // Actualizar último ID
        lastMessageIdRef.current = Math.max(...newMessages.map(m => m.id));
        
        // Agregar nuevos mensajes con deduplicación
        setMessages(prev => {
          const combined = [...prev, ...newMessages];
          return deduplicateMessages(combined);
        });

        setSessions((prev) => {
          const next = new Set(prev);
          for (const m of newMessages) {
            next.add(m.session_id);
          }
          return Array.from(next);
        });
      }
    } catch (err) {
      if (isDev) {
        console.error('[useN8nChatHistory] Polling error:', err);
      }
    }
  }, [sessionId, tenantId]);

  // Subscribe to realtime changes
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (enableRealtime && (tenantId || sessionId)) {
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
            
            if (isDev) {
              console.log('[useN8nChatHistory] Realtime event:', payload.eventType);
            }
            
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
          if (isDev) {
            console.log('[useN8nChatHistory] Realtime subscription status:', status);
          }
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

  // Polling adaptativo: más lento cuando realtime está saludable
  useEffect(() => {
    const effectivePollingMs = realtimeConnected
      ? Math.max(pollingIntervalMs * 5, REALTIME_HEALTHY_POLLING_MS)
      : pollingIntervalMs;

    // Iniciar polling
    pollingRef.current = setInterval(() => {
      fetchNewMessages();
    }, effectivePollingMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchNewMessages, pollingIntervalMs, realtimeConnected]);

  // Carga inicial: solo mensajes (la lista de sesiones se deriva en Chats desde `messages`)
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
