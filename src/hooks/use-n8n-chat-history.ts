import { useState, useEffect, useCallback } from 'react';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseN8nChatHistoryOptions {
  sessionId?: string;
  limit?: number;
  enableRealtime?: boolean;
}

export function useN8nChatHistory(options: UseN8nChatHistoryOptions = {}) {
  const { sessionId, limit = 100, enableRealtime = true } = options;
  const [messages, setMessages] = useState<N8nChatMessage[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all unique sessions
  const fetchSessions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await externalSupabase
        .from('n8n_chat_histories')
        .select('session_id')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get unique session IDs
      const uniqueSessions = [...new Set(data?.map(d => d.session_id) || [])];
      setSessions(uniqueSessions);
    } catch (err) {
      console.error('[useN8nChatHistory] Error fetching sessions:', err);
    }
  }, []);

  // Fetch messages for a specific session or all
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
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

      setMessages(data as N8nChatMessage[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching chat history';
      console.error('[useN8nChatHistory] Error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, limit]);

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
            console.log('[useN8nChatHistory] Realtime event:', payload.eventType);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as N8nChatMessage;
              setMessages(prev => [...prev, newMessage]);
              
              // Update sessions list if new session
              if (!sessions.includes(newMessage.session_id)) {
                setSessions(prev => [newMessage.session_id, ...prev]);
              }
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
        });
    }

    return () => {
      if (channel) {
        externalSupabase.removeChannel(channel);
      }
    };
  }, [sessionId, enableRealtime, sessions]);

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
    refetch: fetchMessages,
    refetchSessions: fetchSessions,
  };
}
