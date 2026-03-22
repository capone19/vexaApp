// ============================================
// VEXA - Hook para Notificaciones en tiempo real
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';

type NotificationDbType = 'handoff' | 'booking' | 'campaign' | 'system' | 'alert';

export interface AppNotification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: NotificationDbType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { tenantId } = useEffectiveTenant();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mapped: AppNotification[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        user_id: (row.user_id as string) ?? null,
        type: row.type as NotificationDbType,
        title: row.title as string,
        message: (row.message as string) ?? null,
        data: (row.data as Record<string, unknown>) ?? null,
        is_read: (row.is_read as boolean) ?? false,
        read_at: (row.read_at as string) ?? null,
        created_at: (row.created_at as string) ?? new Date().toISOString(),
      }));

      setNotifications(mapped);
    } catch (err) {
      console.error('[useNotifications] Error fetching:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`notifications-realtime-${tenantId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          const n: AppNotification = {
            id: row.id as string,
            tenant_id: row.tenant_id as string,
            user_id: (row.user_id as string) ?? null,
            type: row.type as NotificationDbType,
            title: row.title as string,
            message: (row.message as string) ?? null,
            data: (row.data as Record<string, unknown>) ?? null,
            is_read: (row.is_read as boolean) ?? false,
            read_at: (row.read_at as string) ?? null,
            created_at: (row.created_at as string) ?? new Date().toISOString(),
          };
          setNotifications(prev => [n, ...prev]);
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          setNotifications(prev =>
            prev.map(n =>
              n.id === (row.id as string)
                ? { ...n, is_read: (row.is_read as boolean) ?? n.is_read, read_at: (row.read_at as string) ?? n.read_at }
                : n
            )
          );
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` },
        (payload: { old: Record<string, unknown> }) => {
          const oldId = payload.old.id as string;
          if (oldId) {
            setNotifications(prev => prev.filter(n => n.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!tenantId) return;
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: now })));
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('tenant_id', tenantId)
      .eq('is_read', false);
  }, [tenantId]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }, []);

  const clearAll = useCallback(async () => {
    if (!tenantId) return;
    setNotifications([]);
    await supabase.from('notifications').delete().eq('tenant_id', tenantId);
  }, [tenantId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
}
