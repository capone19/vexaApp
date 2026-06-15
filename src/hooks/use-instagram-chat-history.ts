import type { InstagramChatMessage } from '@/integrations/supabase/external-client';
import {
  useExternalChatList,
  useExternalChatSession,
  type UseExternalChatListOptions,
  type UseExternalChatSessionOptions,
} from '@/hooks/use-external-chat-history';

const INSTAGRAM_TABLE = 'instagram_chat_histories' as const;

export type UseInstagramChatListOptions = Omit<UseExternalChatListOptions, 'table'>;
export type UseInstagramChatSessionOptions = Omit<UseExternalChatSessionOptions, 'table'>;

export type { InstagramChatMessage };

export function useInstagramChatList(options: UseInstagramChatListOptions = {}) {
  const result = useExternalChatList({ ...options, table: INSTAGRAM_TABLE });
  return {
    ...result,
    messages: result.messages as InstagramChatMessage[],
  };
}

export function useInstagramChatSession(options: UseInstagramChatSessionOptions = {}) {
  const result = useExternalChatSession({ ...options, table: INSTAGRAM_TABLE });
  return {
    ...result,
    messages: result.messages as InstagramChatMessage[],
  };
}
