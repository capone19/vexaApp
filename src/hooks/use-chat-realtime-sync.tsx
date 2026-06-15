// ============================================
// VEXA - Sincronización Global de Chats (Realtime)
// ============================================
// Provider montado en MainLayout con canales
// n8n_chat_histories + instagram_chat_histories.
// ============================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  externalSupabase,
  type ExternalChatTable,
} from '@/integrations/supabase/external-client';

export type ChatChangeListener = (
  payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>
) => void;

interface TableListener {
  table: ExternalChatTable;
  listener: ChatChangeListener;
}

interface ChatRealtimeSyncContextValue {
  invalidateAllChatCaches: () => void;
  /** @deprecated Use subscribeToChatChanges */
  subscribeToN8nChanges: (listener: ChatChangeListener) => () => void;
  subscribeToChatChanges: (table: ExternalChatTable, listener: ChatChangeListener) => () => void;
  isN8nRealtimeConnected: boolean;
}

const ChatRealtimeSyncContext = createContext<ChatRealtimeSyncContextValue | null>(null);

const REALTIME_TABLES: ExternalChatTable[] = ['n8n_chat_histories', 'instagram_chat_histories'];

interface ChatRealtimeSyncProviderProps {
  tenantId: string | null | undefined;
  enablePollingFallback?: boolean;
  pollingIntervalMs?: number;
  children: ReactNode;
}

export function ChatRealtimeSyncProvider({
  tenantId,
  enablePollingFallback = true,
  pollingIntervalMs = 30000,
  children,
}: ChatRealtimeSyncProviderProps) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastInvalidationRef = useRef<number>(0);
  const listenersRef = useRef(new Set<TableListener>());
  const [isN8nRealtimeConnected, setIsN8nRealtimeConnected] = useState(false);

  const invalidateAllChatCaches = useCallback(() => {
    const now = Date.now();
    if (now - lastInvalidationRef.current < 1000) {
      return;
    }
    lastInvalidationRef.current = now;

    console.log('[ChatRealtimeSync] Refetching conversation-count cache');

    if (tenantId) {
      queryClient.refetchQueries({
        queryKey: ['conversation-count', tenantId],
        type: 'active',
      });
    }
  }, [queryClient, tenantId]);

  const invalidateAllChatCachesRef = useRef(invalidateAllChatCaches);
  invalidateAllChatCachesRef.current = invalidateAllChatCaches;

  const subscribeToChatChanges = useCallback((table: ExternalChatTable, listener: ChatChangeListener) => {
    const entry: TableListener = { table, listener };
    listenersRef.current.add(entry);
    return () => {
      listenersRef.current.delete(entry);
    };
  }, []);

  const subscribeToN8nChanges = useCallback(
    (listener: ChatChangeListener) => subscribeToChatChanges('n8n_chat_histories', listener),
    [subscribeToChatChanges]
  );

  useEffect(() => {
    if (!tenantId) {
      setIsN8nRealtimeConnected(false);
      return;
    }

    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[ChatRealtimeSync] Setting up realtime channels for tenant:', tenantId);

    let channel = externalSupabase.channel(`chat-sync-global-${tenantId}`);

    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
        },
        (payload) => {
          const newData = payload.new as { tenant_id?: string; session_id?: string };
          if (newData?.tenant_id && newData.tenant_id !== tenantId) return;

          console.log('[ChatRealtimeSync] NEW MESSAGE DETECTED!', {
            table,
            session_id: newData?.session_id,
            timestamp: new Date().toISOString(),
          });
          invalidateAllChatCachesRef.current();

          listenersRef.current.forEach(({ table: listenerTable, listener }) => {
            if (listenerTable === table) {
              listener(payload);
            }
          });
        }
      );
    }

    channel.subscribe((status) => {
      console.log('[ChatRealtimeSync] Subscription status:', status);
      setIsN8nRealtimeConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        console.log('[ChatRealtimeSync] Realtime connected successfully');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[ChatRealtimeSync] Realtime connection failed, relying on polling');
      }
    });

    channelRef.current = channel;

    return () => {
      setIsN8nRealtimeConnected(false);
      if (channelRef.current) {
        console.log('[ChatRealtimeSync] Cleaning up realtime channel');
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId]);

  useEffect(() => {
    if (!enablePollingFallback || !tenantId) {
      return;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    console.log('[ChatRealtimeSync] Setting up polling fallback every', pollingIntervalMs / 1000, 'seconds');

    pollingRef.current = setInterval(() => {
      console.log('[ChatRealtimeSync] Polling fallback - invalidating caches');
      invalidateAllChatCaches();
    }, pollingIntervalMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enablePollingFallback, pollingIntervalMs, tenantId, invalidateAllChatCaches]);

  const value: ChatRealtimeSyncContextValue = {
    invalidateAllChatCaches,
    subscribeToN8nChanges,
    subscribeToChatChanges,
    isN8nRealtimeConnected,
  };

  return (
    <ChatRealtimeSyncContext.Provider value={value}>
      {children}
    </ChatRealtimeSyncContext.Provider>
  );
}

export function useChatRealtimeSync(): ChatRealtimeSyncContextValue {
  const context = useContext(ChatRealtimeSyncContext);
  if (!context) {
    throw new Error('useChatRealtimeSync must be used within a ChatRealtimeSyncProvider');
  }
  return context;
}
