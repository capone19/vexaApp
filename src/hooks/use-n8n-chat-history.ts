import type { N8nChatMessage } from '@/integrations/supabase/external-client';
import {
  useExternalChatList,
  useExternalChatSession,
  type UseExternalChatListOptions,
  type UseExternalChatSessionOptions,
} from '@/hooks/use-external-chat-history';

const N8N_TABLE = 'n8n_chat_histories' as const;

export type UseN8nChatListOptions = Omit<UseExternalChatListOptions, 'table'>;
export type UseN8nChatSessionOptions = Omit<UseExternalChatSessionOptions, 'table'>;

export type { N8nChatMessage };

export function useN8nChatList(options: UseN8nChatListOptions = {}) {
  const result = useExternalChatList({ ...options, table: N8N_TABLE });
  return {
    ...result,
    messages: result.messages as N8nChatMessage[],
  };
}

export function useN8nChatSession(options: UseN8nChatSessionOptions = {}) {
  const result = useExternalChatSession({ ...options, table: N8N_TABLE });
  return {
    ...result,
    messages: result.messages as N8nChatMessage[],
  };
}
