// ============================================
// VEXA - Hook de Sincronización Global de Chats
// ============================================
// Este hook se monta UNA VEZ en MainLayout y escucha
// eventos de n8n_chat_histories para invalidar TODOS
// los caches relacionados (dashboard, métricas, billing).
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/external-client';

interface UseChatRealtimeSyncOptions {
  tenantId: string | null | undefined;
  enablePollingFallback?: boolean;
  pollingIntervalMs?: number;
}

export function useChatRealtimeSync({
  tenantId,
  enablePollingFallback = true,
  pollingIntervalMs = 30000, // 30 segundos como fallback
}: UseChatRealtimeSyncOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastInvalidationRef = useRef<number>(0);

  // Refetch forzado de todos los caches relacionados con chats
  const invalidateAllChatCaches = useCallback(() => {
    // Debounce: evitar múltiples refetch en menos de 1 segundo
    const now = Date.now();
    if (now - lastInvalidationRef.current < 1000) {
      return;
    }
    lastInvalidationRef.current = now;

    console.log('[ChatRealtimeSync] 🔄 Refetching all chat-related caches');
    
    // Refetch forzado de dashboard metrics (solo queries activas)
    queryClient.refetchQueries({ 
      queryKey: ['dashboard-metrics'],
      type: 'active' 
    });
    
    // Refetch uso del período (billing)
    queryClient.refetchQueries({ 
      queryKey: ['period-usage'],
      type: 'active' 
    });
    
    // Refetch cualquier cache de billing adicional
    queryClient.refetchQueries({ 
      queryKey: ['billing-usage'],
      type: 'active' 
    });
    
    // Refetch subscription por si el uso afecta límites
    queryClient.refetchQueries({ 
      queryKey: ['subscription'],
      type: 'active' 
    });
  }, [queryClient]);

  // Suscripción Realtime
  useEffect(() => {
    if (!tenantId) {
      return;
    }

    // Limpiar canal previo si existe
    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[ChatRealtimeSync] 📡 Setting up realtime channel for tenant:', tenantId);

    const channel = externalSupabase
      .channel(`chat-sync-global-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_chat_histories',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[ChatRealtimeSync] ✨ New message detected:', payload.new);
          invalidateAllChatCaches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[ChatRealtimeSync] 📅 Booking event:', payload.eventType);
          invalidateAllChatCaches();
        }
      )
      .subscribe((status) => {
        console.log('[ChatRealtimeSync] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[ChatRealtimeSync] ✅ Realtime connected successfully');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[ChatRealtimeSync] ⚠️ Realtime connection failed, relying on polling');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[ChatRealtimeSync] 🔌 Cleaning up realtime channel');
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, invalidateAllChatCaches]);

  // Polling como fallback (en caso de que realtime falle silenciosamente)
  useEffect(() => {
    if (!enablePollingFallback || !tenantId) {
      return;
    }

    // Limpiar intervalo previo
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    console.log('[ChatRealtimeSync] ⏰ Setting up polling fallback every', pollingIntervalMs / 1000, 'seconds');

    pollingRef.current = setInterval(() => {
      console.log('[ChatRealtimeSync] ⏰ Polling fallback - invalidating caches');
      invalidateAllChatCaches();
    }, pollingIntervalMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enablePollingFallback, pollingIntervalMs, tenantId, invalidateAllChatCaches]);

  // Exponer función para invalidación manual
  return {
    invalidateAllChatCaches,
  };
}
