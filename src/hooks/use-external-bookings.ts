// ============================================
// VEXA - Hook para External Bookings (con React Query + Realtime)
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { externalSupabase, ExternalBooking } from '@/integrations/supabase/external-client';
import type { Appointment, AppointmentStatus, AppointmentSource, AppointmentType } from '@/lib/types';
import { format } from 'date-fns';

export interface UseExternalBookingsOptions {
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: 'all' | 'service' | 'product';
  enableRealtime?: boolean;
}

export interface UseExternalBookingsReturn {
  bookings: Appointment[];
  items: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Mapear origin de la tabla a AppointmentSource
const mapOrigin = (origin: string): AppointmentSource => {
  const originMap: Record<string, AppointmentSource> = {
    'chat': 'chat',
    'campaign': 'campaign',
    'direct': 'direct',
    'manual': 'direct',
    'web': 'direct',
    'referral': 'referral',
  };
  return originMap[origin] || 'chat';
};

// Por ahora todos los bookings externos son "confirmed"
const mapStatus = (): AppointmentStatus => {
  return 'confirmed';
};

// Mapear ExternalBooking a Appointment
const mapBookingToAppointment = (booking: ExternalBooking): Appointment => {
  let datetime: Date;
  if (booking.event_time) {
    datetime = new Date(`${booking.event_date}T${booking.event_time}`);
  } else {
    datetime = new Date(`${booking.event_date}T00:00:00`);
  }

  const time = booking.event_time 
    ? format(new Date(`2000-01-01T${booking.event_time}`), 'HH:mm')
    : undefined;

  return {
    id: booking.id,
    datetime,
    clientName: booking.contact_name,
    clientPhone: booking.contact_phone || undefined,
    clientEmail: booking.contact_email || undefined,
    service: booking.item_name,
    source: mapOrigin(booking.origin),
    status: mapStatus(),
    notes: booking.notes || undefined,
    chatId: booking.session_id || undefined,
    createdAt: new Date(booking.created_at),
    type: booking.type as AppointmentType,
    time,
    price: booking.price,
    currency: booking.currency,
  };
};

// Función de fetch para React Query
async function fetchExternalBookings(
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
  type?: 'all' | 'service' | 'product'
): Promise<{ bookings: Appointment[]; items: string[] }> {
  let query = externalSupabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: true });

  if (startDate) {
    query = query.gte('event_date', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    query = query.lte('event_date', format(endDate, 'yyyy-MM-dd'));
  }
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const bookings = (data || []).map(mapBookingToAppointment);
  const items = [...new Set((data || []).map(b => b.item_name))];

  return { bookings, items };
}

export function useExternalBookings(options: UseExternalBookingsOptions = {}): UseExternalBookingsReturn {
  const { tenantId, startDate, endDate, type = 'all', enableRealtime = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);

  // Query key para cache
  const queryKey = [
    'external-bookings',
    tenantId,
    startDate?.toISOString(),
    endDate?.toISOString(),
    type,
  ];

  // Usar React Query para fetch y cache
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchExternalBookings(tenantId!, startDate, endDate, type),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Función para invalidar cache y refetch
  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['external-bookings', tenantId] });
  }, [queryClient, tenantId]);

  // Suscripción a Realtime (mantiene la funcionalidad existente)
  useEffect(() => {
    if (!enableRealtime || !tenantId) return;

    // Limpiar canal previo
    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
    }

    const channel = externalSupabase
      .channel(`external-bookings-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[useExternalBookings] Realtime event:', payload.eventType);
          // Invalidar cache para refetch automático
          handleRealtimeUpdate();
        }
      )
      .subscribe((status) => {
        console.log('[useExternalBookings] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, tenantId, handleRealtimeUpdate]);

  return {
    bookings: data?.bookings ?? [],
    items: data?.items ?? [],
    isLoading: tenantId ? isLoading : false,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
}
