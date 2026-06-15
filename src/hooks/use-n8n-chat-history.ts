import { useState, useEffect, useCallback, useRef } from 'react';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
import { useChatRealtimeSync } from '@/hooks/use-chat-realtime-sync';

// List: single non-paginated query capped at this number of rows
const LIST_FETCH_LIMIT = 2000;
const isDev = import.meta.env.DEV;

function deduplicateMessages(messages: N8nChatMessage[]): N8nChatMessage[] {
  const seen = new Map<string, N8nChatMessage>();
  const TIME_WINDOW_MS = 10000;

  const validMessages = messages.filter(msg => {
    if (!msg.message || typeof msg.message !== 'object') return false;
    const hasContent =
      msg.message.content &&
      typeof msg.message.content === 'string' &&
      msg.message.content.trim() !== '';
    const hasMedia = msg.media !== null && msg.media !== undefined;
    return hasContent || hasMedia;
  });

  const sorted = [...validMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const msg of sorted) {
    const msgType = msg.message?.type || 'unknown';
    const msgContent = msg.message?.content || '';
    const mediaKey = msg.media?.url || '';
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

// ─────────────────────────────────────────────────────────────────────────────
// useN8nChatList — session sidebar (last LIST_FETCH_LIMIT rows per tenant)
// ─────────────────────────────────────────────────────────────────────────────
export interface UseN8nChatListOptions {
  tenantId?: string;
  sinceList?: Date;
  enableRealtime?: boolean;
}

export function useN8nChatList(options: UseN8nChatListOptions = {}) {
  const { tenantId, sinceList, enableRealtime = true } = options;
  const sinceListMs = sinceList?.getTime();

  const [messages, setMessages] = useState<N8nChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribeToN8nChanges } = useChatRealtimeSync();
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
      let q = externalSupabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(LIST_FETCH_LIMIT);

      if (sinceListMs != null) q = q.gte('created_at', new Date(sinceListMs).toISOString());

      const { data, error: fetchError } = await q;
      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const msgs = (data || []) as N8nChatMessage[];
      setMessages(msgs);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (isDev) console.error('[useN8nChatList] Error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching chat list');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tenantId, sinceListMs]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!enableRealtime || !tenantId) return;
    return subscribeToN8nChanges(payload => {
      if (!isMountedRef.current) return;
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as N8nChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [newMsg, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as N8nChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id: number }).id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      }
    });
  }, [tenantId, enableRealtime, subscribeToN8nChanges]);

  return { messages, isLoading, error, refetch: fetchMessages };
}

// ─────────────────────────────────────────────────────────────────────────────
// useN8nChatSession — all messages for a single open conversation
// ─────────────────────────────────────────────────────────────────────────────
export interface UseN8nChatSessionOptions {
  tenantId?: string;
  sessionId?: string | null;
  sinceSession?: Date;
  enableRealtime?: boolean;
}

export function useN8nChatSession(options: UseN8nChatSessionOptions = {}) {
  const { tenantId, sessionId, sinceSession, enableRealtime = true } = options;

  const [messages, setMessages] = useState<N8nChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subscribeToN8nChanges } = useChatRealtimeSync();
  const isMountedRef = useRef(true);
  // Tracks session across callback recreations to distinguish new-session vs load-more
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
          .from('n8n_chat_histories')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (sinceSession) q = q.gte('created_at', sinceSession.toISOString());

        const { data, error: fetchError } = await q;
        if (fetchError) throw fetchError;
        if (!isMountedRef.current) return;

        setMessages(deduplicateMessages((data || []) as N8nChatMessage[]));
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
    [sessionId, tenantId, sinceSession]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!enableRealtime || !sessionId || !tenantId) return;
    return subscribeToN8nChanges(payload => {
      if (!isMountedRef.current) return;
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as N8nChatMessage;
        if (newMsg.session_id !== sessionId) return;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return deduplicateMessages([...prev, newMsg]);
        });
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as N8nChatMessage;
        if (updated.session_id !== sessionId) return;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id: number }).id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      }
    });
  }, [sessionId, tenantId, enableRealtime, subscribeToN8nChanges]);

  return { messages, isLoading, isLoadingMore, error, refetch: fetchMessages };
}
