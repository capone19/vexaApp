import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

export interface Notification {
  id: string;
  type: 'handoff' | 'booking' | 'campaign' | 'system' | 'alert' | 'ticket';
  title: string;
  message: string | null;
  timestamp: Date;
  read: boolean;
  data?: {
    ticket_id?: string;
    ticket_title?: string;
    [key: string]: unknown;
  };
}

interface UseNotificationsOptions {
  enableRealtime?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { enableRealtime = true } = options;
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mapNotification = (row: {
    id: string;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean | null;
    created_at: string | null;
    data: unknown;
  }): Notification => {
    // Validar y mapear el tipo
    const validTypes: Notification['type'][] = ['handoff', 'booking', 'campaign', 'system', 'alert', 'ticket'];
    const notificationType = validTypes.includes(row.type as Notification['type']) 
      ? (row.type as Notification['type'])
      : 'system'; // Fallback a 'system' si el tipo no es válido
    
    // Parsear el campo data (JSONB)
    let parsedData: Notification['data'] = {};
    if (row.data) {
      try {
        // Si ya es un objeto, usarlo directamente
        if (typeof row.data === 'object' && row.data !== null) {
          parsedData = row.data as Notification['data'];
        } else if (typeof row.data === 'string') {
          // Si es string, parsearlo
          parsedData = JSON.parse(row.data) as Notification['data'];
        }
      } catch (e) {
        console.warn('[useNotifications] Error parsing notification data:', e, row.data);
        parsedData = {};
      }
    }
    
    return {
      id: row.id,
      type: notificationType,
      title: row.title,
      message: row.message,
      timestamp: row.created_at ? new Date(row.created_at) : new Date(),
      read: row.is_read ?? false,
      data: parsedData,
    };
  };

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useNotifications] Fetch error:', fetchError);
        throw fetchError;
      }

      if (!isMountedRef.current) return;

      console.log('[useNotifications] Fetched notifications:', data?.length || 0, data);
      const mappedNotifications = (data || []).map(mapNotification);
      console.log('[useNotifications] Mapped notifications:', mappedNotifications);
      setNotifications(mappedNotifications);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar notificaciones';
      console.error('[useNotifications] Error:', err);
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  // Fetch inicial
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Suscripción a Realtime
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    // Limpiar canal previo
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[useNotifications] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useNotifications] Realtime event:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newNotification = mapNotification(payload.new as Parameters<typeof mapNotification>[0]);
            console.log('[useNotifications] New notification mapped:', newNotification);
            setNotifications((prev) => {
              // Evitar duplicados
              if (prev.some(n => n.id === newNotification.id)) {
                console.log('[useNotifications] Notification already exists, skipping');
                return prev;
              }
              return [newNotification, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = mapNotification(payload.new as Parameters<typeof mapNotification>[0]);
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, user?.id]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user?.id) return;

      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Actualizar estado local
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('[useNotifications] Error marking as read:', err);
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // Actualizar estado local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('[useNotifications] Error marking all as read:', err);
    }
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
