// ============================================
// VEXA - Hook para Bookings/Calendar (Supabase Real)
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Appointment, AppointmentStatus, AppointmentSource } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseBookingsOptions {
  tenantId: string | null | undefined;
  startDate?: Date;
  endDate?: Date;
  status?: AppointmentStatus | 'all';
  service?: string | 'all';
  enableRealtime?: boolean;
}

interface UseBookingsReturn {
  bookings: Appointment[];
  services: string[]; // Lista de servicios únicos para filtrar
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Helper para mapear status de booking
function mapBookingStatus(status: string | null): AppointmentStatus {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'confirmed';
    case 'cancelled':
    case 'no_show':
      return 'canceled';
    case 'pending':
    default:
      return 'pending';
  }
}

// Helper para mapear origen
function mapBookingOrigin(origin: string | null): AppointmentSource {
  switch (origin) {
    case 'chat':
      return 'chat';
    case 'campaign':
      return 'campaign';
    case 'web':
    case 'manual':
      return 'direct';
    default:
      return 'chat';
  }
}

export function useBookings({
  tenantId,
  startDate,
  endDate,
  status = 'all',
  service = 'all',
  enableRealtime = true,
}: UseBookingsOptions): UseBookingsReturn {
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to avoid infinite loops in realtime effect
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const fetchBookings = useCallback(async () => {
    if (!tenantId) {
      setBookings([]);
      setServices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Construir query base
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      // Filtrar por rango de fechas
      if (startDate) {
        query = query.gte('scheduled_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('scheduled_at', endDate.toISOString());
      }

      // Filtrar por status (mapear UI status a DB status)
      if (status !== 'all') {
        if (status === 'confirmed') {
          query = query.in('status', ['confirmed', 'completed']);
        } else if (status === 'canceled') {
          query = query.in('status', ['cancelled', 'no_show']);
        } else if (status === 'pending') {
          query = query.eq('status', 'pending');
        }
      }

      // Filtrar por servicio
      if (service !== 'all') {
        query = query.eq('service_name', service);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      if (!isMountedRef.current) return;

      // Mapear a tipo Appointment
      const appointments: Appointment[] = (data || []).map(booking => ({
        id: booking.id,
        datetime: new Date(booking.scheduled_at),
        clientName: booking.contact_name || 'Sin nombre',
        clientPhone: booking.contact_phone || undefined,
        service: booking.service_name || 'Servicio',
        source: mapBookingOrigin(booking.origin),
        status: mapBookingStatus(booking.status),
        notes: booking.notes || undefined,
        chatId: booking.session_id || undefined,
        createdAt: new Date(booking.created_at || Date.now()),
      }));

      // Extraer servicios únicos
      const uniqueServices = [...new Set(
        (data || [])
          .map(b => b.service_name)
          .filter(Boolean)
      )] as string[];

      setBookings(appointments);
      setServices(uniqueServices);
    } catch (err) {
      console.error('[useBookings] Error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error cargando reservas');
        setBookings([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenantId, startDate, endDate, status, service]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    isMountedRef.current = true;
    fetchBookings();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchBookings]);

  // Efecto separado para realtime - solo depende de tenantId
  useEffect(() => {
    if (!tenantId || !enableRealtime) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`bookings_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[Realtime] Booking change:', payload.eventType);
          // Refetch cuando hay cambios
          fetchBookings();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Bookings subscription:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // Solo re-suscribir cuando cambia tenantId o enableRealtime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, enableRealtime]);

  return {
    bookings,
    services,
    isLoading,
    error,
    refetch: fetchBookings,
  };
}

// Hook adicional para obtener servicios del tenant (desde agent_settings o services table)
export function useTenantServices(tenantId: string | null | undefined) {
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        setServices(data || []);
      } catch (err) {
        console.error('[useTenantServices] Error:', err);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [tenantId]);

  return { services, isLoading };
}

