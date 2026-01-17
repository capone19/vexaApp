import { useState, useEffect, useCallback, useRef } from 'react';
import { externalSupabase, ExternalBooking } from '@/integrations/supabase/external-client';
import type { Appointment, AppointmentStatus, AppointmentSource, AppointmentType } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export interface UseExternalBookingsOptions {
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: 'all' | 'service' | 'product';
  enableRealtime?: boolean;
}

export interface UseExternalBookingsReturn {
  bookings: Appointment[];
  items: string[]; // Nombres únicos de items (productos/servicios)
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

// Por ahora todos los bookings externos son "confirmed" ya que no hay campo status
const mapStatus = (): AppointmentStatus => {
  return 'confirmed';
};

// Mapear ExternalBooking a Appointment
const mapBookingToAppointment = (booking: ExternalBooking): Appointment => {
  // Combinar event_date + event_time para crear datetime
  let datetime: Date;
  if (booking.event_time) {
    // Servicio: tiene hora
    datetime = new Date(`${booking.event_date}T${booking.event_time}`);
  } else {
    // Producto: solo fecha, usar 00:00
    datetime = new Date(`${booking.event_date}T00:00:00`);
  }

  // Extraer hora formateada solo para servicios
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
    // Nuevos campos
    type: booking.type as AppointmentType,
    time,
    price: booking.price,
    currency: booking.currency,
  };
};

export function useExternalBookings(options: UseExternalBookingsOptions = {}): UseExternalBookingsReturn {
  const { tenantId, startDate, endDate, type = 'all', enableRealtime = true } = options;
  
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!tenantId) {
      setBookings([]);
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = externalSupabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('event_date', { ascending: true });

      // Filtrar por rango de fechas usando event_date
      if (startDate) {
        query = query.gte('event_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('event_date', format(endDate, 'yyyy-MM-dd'));
      }

      // Filtrar por tipo
      if (type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching external bookings:', fetchError);
        setError(fetchError.message);
        setBookings([]);
        setItems([]);
      } else {
        const mappedBookings = (data || []).map(mapBookingToAppointment);
        setBookings(mappedBookings);
        
        // Extraer nombres únicos de items
        const uniqueItems = [...new Set((data || []).map(b => b.item_name))];
        setItems(uniqueItems);
      }
    } catch (err) {
      console.error('Error in useExternalBookings:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setBookings([]);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, startDate, endDate, type]);

  // Fetch inicial
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Suscripción a Realtime
  useEffect(() => {
    if (!enableRealtime || !tenantId) return;

    // Limpiar canal previo
    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
    }

    console.log('[useExternalBookings] Setting up realtime subscription for tenant:', tenantId);

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
          console.log('[useExternalBookings] Realtime event:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newBooking = mapBookingToAppointment(payload.new as ExternalBooking);
            setBookings(prev => [...prev, newBooking]);
            setItems(prev => {
              const itemName = (payload.new as ExternalBooking).item_name;
              return prev.includes(itemName) ? prev : [...prev, itemName];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedBooking = mapBookingToAppointment(payload.new as ExternalBooking);
            setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setBookings(prev => prev.filter(b => b.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[useExternalBookings] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[useExternalBookings] Cleaning up realtime subscription');
      if (channelRef.current) {
        externalSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, tenantId]);

  return {
    bookings,
    items,
    isLoading,
    error,
    refetch: fetchBookings,
  };
}
