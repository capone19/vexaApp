import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  externalSupabase,
  type Conversation,
  type ExternalChatMessage,
  type ExternalChatTable,
} from '@/integrations/supabase/external-client';
import type { ChatChannelId } from '@/lib/chat-channels';
import { parseMessageField } from '@/lib/chat-message-utils';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;
const CONVERSATIONS_PAGE_SIZE = 30;
const MESSAGES_PAGE_SIZE = 40;

const CONVERSATION_COLUMNS =
  'session_id, tenant_id, channel, contact_phone, contact_username, last_message_preview, last_message_at, last_client_message_at, message_count, bot_activado, updated_at';

const N8N_MESSAGE_COLUMNS =
  'id, session_id, tenant_id, phone_number, message, media, created_at, bot_activado';

const INSTAGRAM_MESSAGE_COLUMNS =
  'id, session_id, tenant_id, username, message, created_at, bot_activado';

function getMessageColumns(table: ExternalChatTable): string {
  return table === 'n8n_chat_histories' ? N8N_MESSAGE_COLUMNS : INSTAGRAM_MESSAGE_COLUMNS;
}

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

function mergeMessagesAsc(
  existing: ExternalChatMessage[],
  incoming: ExternalChatMessage[]
): ExternalChatMessage[] {
  if (incoming.length === 0) return existing;
  const dedupedIncoming = deduplicateMessages(incoming);
  const seenIds = new Set(existing.map(m => m.id));
  const merged = [...existing];
  for (const msg of dedupedIncoming) {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      merged.push(msg);
    }
  }
  return merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function prependMessagesAsc(
  existing: ExternalChatMessage[],
  incoming: ExternalChatMessage[]
): ExternalChatMessage[] {
  if (incoming.length === 0) return existing;
  const dedupedIncoming = deduplicateMessages(incoming);
  const seenIds = new Set(existing.map(m => m.id));
  const prepended: ExternalChatMessage[] = [];
  for (const msg of dedupedIncoming) {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      prepended.push(msg);
    }
  }
  if (prepended.length === 0) return existing;
  return [...prepended, ...existing].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function useConversationList(channel: ChatChannelId, tenantId?: string) {
  const query = useInfiniteQuery({
    queryKey: ['conversations', channel, tenantId],
    enabled: !!tenantId,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!tenantId) return [] as Conversation[];

      // Keyset simple por last_message_at. Si en el futuro hay colisiones de timestamp
      // exacto, migrar a una RPC con keyset compuesto (last_message_at, session_id).
      let q = externalSupabase
        .from('conversations')
        .select(CONVERSATION_COLUMNS)
        .eq('tenant_id', tenantId)
        .eq('channel', channel)
        .order('last_message_at', { ascending: false })
        .order('session_id', { ascending: false })
        .limit(CONVERSATIONS_PAGE_SIZE);

      if (pageParam) {
        q = q.lt('last_message_at', pageParam);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < CONVERSATIONS_PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.last_message_at;
    },
  });

  const conversations = useMemo(
    () => query.data?.pages.flat() ?? [],
    [query.data?.pages]
  );

  return {
    conversations,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export interface UseExternalChatListOptions {
  table: ExternalChatTable;
  tenantId?: string;
  sinceList?: Date;
  skipDateFilter?: boolean;
  limit?: number;
  enableRealtime?: boolean;
}

/** @deprecated Use useConversationList for the sidebar list */
export function useExternalChatList(options: UseExternalChatListOptions) {
  const { table, tenantId, sinceList, skipDateFilter = false, limit = 2000 } = options;
  const sinceListMs = sinceList?.getTime();

  const [messages, setMessages] = useState<ExternalChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const collected: ExternalChatMessage[] = [];
      let offset = 0;
      const MAX_PAGES = 50;
      for (let page = 0; page < MAX_PAGES && collected.length < limit; page++) {
        const remaining = limit - collected.length;
        let q = externalSupabase
          .from(table)
          .select(getMessageColumns(table))
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
        });
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

  return { messages, isLoading, error, refetch: fetchMessages };
}

export interface UseExternalChatSessionOptions {
  table: ExternalChatTable;
  tenantId?: string;
  sessionId?: string | null;
  enableRealtime?: boolean;
}

export function useExternalChatSession(options: UseExternalChatSessionOptions) {
  const { table, tenantId, sessionId, enableRealtime = true } = options;

  const [messages, setMessages] = useState<ExternalChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const prevSessionIdRef = useRef<string | null | undefined>(undefined);
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchInitialMessages = useCallback(async () => {
    if (!sessionId || !tenantId) {
      setMessages([]);
      setIsLoading(false);
      setHasMoreOlder(false);
      return;
    }

    const isNewSession = sessionId !== prevSessionIdRef.current;
    prevSessionIdRef.current = sessionId;

    if (isNewSession) {
      setMessages([]);
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data, error: fetchError } = await externalSupabase
        .from(table)
        .select(getMessageColumns(table))
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const rows = (data || []) as ExternalChatMessage[];
      const asc = [...rows].reverse();
      setMessages(deduplicateMessages(asc));
      setHasMoreOlder(rows.length === MESSAGES_PAGE_SIZE);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error fetching session messages');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [table, sessionId, tenantId]);

  const loadOlderMessages = useCallback(async () => {
    if (!sessionId || !tenantId || isLoadingMore || !hasMoreOlder) return;

    const oldest = messages[0];
    if (!oldest) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const { data, error: fetchError } = await externalSupabase
        .from(table)
        .select(getMessageColumns(table))
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      const rows = (data || []) as ExternalChatMessage[];
      const asc = [...rows].reverse();
      setMessages(prev => prependMessagesAsc(prev, asc));
      setHasMoreOlder(rows.length === MESSAGES_PAGE_SIZE);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error fetching older messages');
      }
    } finally {
      if (isMountedRef.current) setIsLoadingMore(false);
    }
  }, [table, sessionId, tenantId, isLoadingMore, hasMoreOlder, messages]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    if (!enableRealtime || !sessionId || !tenantId) return;

    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = externalSupabase
      .channel(`session-${table}-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          if (!isMountedRef.current) return;

          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ExternalChatMessage;
            if (newMsg.tenant_id !== tenantId) return;
            setMessages(prev => mergeMessagesAsc(prev, [newMsg]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ExternalChatMessage;
            if (updated.tenant_id !== tenantId) return;
            setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: number }).id;
            setMessages(prev => prev.filter(m => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, sessionId, tenantId, enableRealtime]);

  const refetch = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      await fetchInitialMessages();
    },
    [fetchInitialMessages]
  );

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreOlder,
    loadOlderMessages,
    error,
    refetch,
  };
}

export { deduplicateMessages };
