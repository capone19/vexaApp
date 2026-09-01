// ============================================
// VEXA - Sincronización Global de Chats (Realtime)
// ============================================
// Provider montado en MainLayout: escucha public.conversations
// con filtro por tenant y parchea la caché de useConversationList.
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
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  externalSupabase,
  type Conversation,
  type ExternalChatTable,
} from '@/integrations/supabase/external-client';
import type { ChatChannelId } from '@/lib/chat-channels';

export type ChatChangeListener = (
  payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>
) => void;

interface TableListener {
  table: ExternalChatTable;
  listener: ChatChangeListener;
}

interface ChatRealtimeSyncContextValue {
  invalidateAllChatCaches: () => void;
  /** @deprecated Source tables are no longer subscribed globally */
  subscribeToN8nChanges: (listener: ChatChangeListener) => () => void;
  /** @deprecated Source tables are no longer subscribed globally */
  subscribeToChatChanges: (table: ExternalChatTable, listener: ChatChangeListener) => () => void;
  isN8nRealtimeConnected: boolean;
}

const ChatRealtimeSyncContext = createContext<ChatRealtimeSyncContextValue | null>(null);

function patchConversationCache(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  row: Conversation,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
) {
  const queryKey = ['conversations', row.channel as ChatChannelId, tenantId];

  queryClient.setQueryData<InfiniteData<Conversation[]>>(queryKey, (old) => {
    if (!old) {
      if (eventType === 'DELETE') return old;
      return {
        pages: [[row]],
        pageParams: [undefined],
      };
    }

    const pages = old.pages.map(page =>
      page.filter(
        item => !(item.channel === row.channel && item.session_id === row.session_id)
      )
    );

    if (eventType === 'DELETE') {
      return { ...old, pages };
    }

    if (pages.length === 0) {
      return { pages: [[row]], pageParams: [undefined] };
    }

    pages[0] = [row, ...pages[0]];
    return { ...old, pages };
  });
}

interface ChatRealtimeSyncProviderProps {
  tenantId: string | null | undefined;
  children: ReactNode;
}

export function ChatRealtimeSyncProvider({
  tenantId,
  children,
}: ChatRealtimeSyncProviderProps) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);
  const lastInvalidationRef = useRef<number>(0);
  const listenersRef = useRef(new Set<TableListener>());
  const [isN8nRealtimeConnected, setIsN8nRealtimeConnected] = useState(false);

  const invalidateAllChatCaches = useCallback(() => {
    const now = Date.now();
    if (now - lastInvalidationRef.current < 1000) {
      return;
    }
    lastInvalidationRef.current = now;

    if (tenantId) {
      queryClient.refetchQueries({
        queryKey: ['conversation-count', tenantId],
        type: 'active',
      });
    }
  }, [queryClient, tenantId]);

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

  const invalidateAllChatCachesRef = useRef(invalidateAllChatCaches);
  invalidateAllChatCachesRef.current = invalidateAllChatCaches;

  useEffect(() => {
    if (!tenantId) {
      setIsN8nRealtimeConnected(false);
      return;
    }

    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = externalSupabase
      .channel(`conversations-sync-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType !== 'INSERT' && eventType !== 'UPDATE' && eventType !== 'DELETE') {
            return;
          }

          if (eventType === 'DELETE') {
            const oldRow = payload.old as Conversation;
            if (oldRow?.channel && oldRow?.session_id) {
              patchConversationCache(queryClient, tenantId, oldRow, 'DELETE');
            }
          } else {
            const newRow = payload.new as Conversation;
            if (newRow?.channel && newRow?.session_id) {
              patchConversationCache(queryClient, tenantId, newRow, eventType);
            }
          }

          invalidateAllChatCachesRef.current();
        }
      )
      .subscribe((status) => {
        setIsN8nRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      setIsN8nRealtimeConnected(false);
      if (channelRef.current) {
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, queryClient]);

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

export function patchConversationBotState(
  queryClient: ReturnType<typeof useQueryClient>,
  channel: ChatChannelId,
  tenantId: string,
  sessionId: string,
  botActivado: boolean
) {
  const queryKey = ['conversations', channel, tenantId];

  queryClient.setQueryData<InfiniteData<Conversation[]>>(queryKey, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map(page =>
        page.map(item =>
          item.session_id === sessionId
            ? { ...item, bot_activado: botActivado }
            : item
        )
      ),
    };
  });
}
