import { useState, useEffect, useCallback, useRef } from 'react';
import {
  externalSupabase,
  type ExternalChatMessage,
  type ExternalChatTable,
} from '@/integrations/supabase/external-client';
import { useChatRealtimeSync } from '@/hooks/use-chat-realtime-sync';
import { parseMessageField } from '@/lib/chat-message-utils';

const isDev = import.meta.env.DEV;

function deduplicateMessages(messages: ExternalChatMessage[]): ExternalChatMessage[] {
  const seen = new Map<string, ExternalChatMessage>();
  const TIME_WINDOW_MS = 10000;

  const validMessages = messages.filter(msg => {
    const parsed = parseMessageField(msg.message);
    const hasContent = !!parsed?.content;
    const hasMedia = 'media' in msg && msg.media !== null && msg.media !== undefined;
    return hasContent || hasMedia;
  });

  const sorted = [...validMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const msg of sorted) {
    const parsed = parseMessageField(msg.message);
    const msgType = parsed?.type || 'unknown';
    const msgContent = parsed?.content || '';
    const mediaKey = 'media' in msg && msg.media?.url ? msg.media.url : '';
    const contentKey = `${msg.session_id}|${msgType}|${msgContent.trim().toLowerCase()}|${mediaKey}`;

    const existing = seen.get(contentKey);
    if (existing) {
      const existingTime = new Date(existing.created_at).getTime();
      const currentTime = new Date(msg.created_at).getTime();
      if (Math.abs(currentTime - existingTime) < TIME_WINDOW_MS) continue;
    }

    const timeSlot = Math.floor(new Date(msg.created_at).getTime() / TIME_WINDOW_MS);
    const finalKey = `${contentKey}|${timeSlot}`;
    if (!seen.has(finalKey)) seen.set(finalKey, msg);
  }

  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export interface UseExternalChatListOptions {
  table: ExternalChatTable;
  tenantId?: string;
  sinceList?: Date;
  /** Si true, ignora sinceList y trae las últimas `limit` filas del tenant */
  skipDateFilter?: boolean;
  /** Máximo de filas a traer (default 2000) */
  limit?: number;
  enableRealtime?: boolean;
}

export function useExternalChatList(options: UseExternalChatListOptions) {
  const { table, tenantId, sinceList, skipDateFilter = false, limit = 2000, enableRealtime = true } = options;
  const sinceListMs = sinceList?.getTime();

  const [messages, setMessages] = useState<ExternalChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribeToChatChanges } = useChatRealtimeSync();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!tenantId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // El proyecto Supabase enforcea un "Max Rows" por request (PostgREST db-max-rows,
      // vimos 1000 en producción) que ignora nuestro .limit(): pedir limit=5000 en una sola
      // query igual devuelve solo las primeras ~1000 filas. Para poder traer más that eso
      // (necesario al ampliar la ventana de días) paginamos con .range() pidiendo de a
      // "remaining" filas y avanzando el offset según lo que realmente vino en cada página,
      // hasta juntar `limit` filas o hasta que una página vuelva vacía (sin más datos).
      const collected: ExternalChatMessage[] = [];
      let offset = 0;
      const MAX_PAGES = 50; // failsafe contra loops largos con tenants enormes
      for (let page = 0; page < MAX_PAGES && collected.length < limit; page++) {
        const remaining = limit - collected.length;
        let q = externalSupabase
          .from(table)
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .range(offset, offset + remaining - 1);

        if (!skipDateFilter && sinceListMs != null) {
          q = q.gte('created_at', new Date(sinceListMs).toISOString());
        }

        const { data, error: fetchError } = await q;
        if (fetchError) throw fetchError;
        if (!isMountedRef.current) return;

        const rows = (data || []) as ExternalChatMessage[];
        collected.push(...rows);
        if (rows.length === 0) break;
        offset += rows.length;
      }

      if (isDev && table === 'instagram_chat_histories') {
        console.log('[useExternalChatList:instagram]', {
          tenantId,
          rowCount: collected.length,
          skipDateFilter,
          sinceList: skipDateFilter ? null : sinceListMs != null ? new Date(sinceListMs).toISOString() : null,
        });
        if (collected.length > 0) {
          const sample = collected[0] as ExternalChatMessage;
          console.log('[useExternalChatList:instagram] sample row:', {
            session_id: sample.session_id,
            tenant_id: sample.tenant_id,
            messageType: typeof sample.message,
            username: 'username' in sample ? sample.username : undefined,
          });
        }
      }

      setMessages(collected);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (isDev) console.error(`[useExternalChatList:${table}] Error:`, err);
      setError(err instanceof Error ? err.message : 'Error fetching chat list');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [table, tenantId, sinceListMs, skipDateFilter, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!enableRealtime || !tenantId) return;
    return subscribeToChatChanges(table, payload => {
      if (!isMountedRef.current) return;
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as ExternalChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [newMsg, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as ExternalChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id: number }).id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      }
    });
  }, [table, tenantId, enableRealtime, subscribeToChatChanges]);

  return { messages, isLoading, error, refetch: fetchMessages };
}

export interface UseExternalChatSessionOptions {
  table: ExternalChatTable;
  tenantId?: string;
  sessionId?: string | null;
  sinceSession?: Date;
  enableRealtime?: boolean;
}

export function useExternalChatSession(options: UseExternalChatSessionOptions) {
  const { table, tenantId, sessionId, sinceSession, enableRealtime = true } = options;

  const [messages, setMessages] = useState<ExternalChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subscribeToChatChanges } = useChatRealtimeSync();
  const isMountedRef = useRef(true);
  const prevSessionIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!sessionId || !tenantId) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const isNewSession = sessionId !== prevSessionIdRef.current;
      prevSessionIdRef.current = sessionId;

      if (!silent) {
        if (isNewSession) {
          setMessages([]);
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
      }
      setError(null);

      try {
        let q = externalSupabase
          .from(table)
          .select('*')
          .eq('session_id', sessionId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true });

        if (sinceSession) q = q.gte('created_at', sinceSession.toISOString());

        const { data, error: fetchError } = await q;
        if (fetchError) throw fetchError;
        if (!isMountedRef.current) return;

        setMessages(deduplicateMessages((data || []) as ExternalChatMessage[]));
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Error fetching session messages');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [table, sessionId, tenantId, sinceSession]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!enableRealtime || !sessionId || !tenantId) return;
    return subscribeToChatChanges(table, payload => {
      if (!isMountedRef.current) return;
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as ExternalChatMessage;
        if (newMsg.session_id !== sessionId) return;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return deduplicateMessages([...prev, newMsg]);
        });
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as ExternalChatMessage;
        if (updated.session_id !== sessionId) return;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id: number }).id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      }
    });
  }, [table, sessionId, tenantId, enableRealtime, subscribeToChatChanges]);

  return { messages, isLoading, isLoadingMore, error, refetch: fetchMessages };
}

export { deduplicateMessages };
