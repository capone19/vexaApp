// ============================================
// VEXA - Hook para Dashboard Metrics (con React Query + Realtime)
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { externalSupabase, type ExternalBooking } from '@/integrations/supabase/external-client';
import type { DashboardMetrics, Appointment } from '@/lib/types';
import { format } from 'date-fns';

interface UseDashboardMetricsOptions {
  tenantId: string | null | undefined;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  enableRealtime?: boolean;
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics | null;
  recentAppointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Valores por defecto para métricas vacías
const emptyMetrics: DashboardMetrics = {
  totalChats: 0,
  totalMessages: 0,
  avgMessagesPerChat: 0,
  botResponseRate: 0,
  avgFirstResponseTime: 0,
  avgConversionTime: 0,
  servicesBooked: 0,
  revenue: 0,
  funnel: {
    tofu: 0,
    mofu: 0,
    hotLeads: 0,
    bofu: 0,
    deadRate: 0,
    warmRate: 0,
    hotRate: 0,
    conversionRate: 0,
  },
};

// Clasificar sesiones según cantidad de mensajes
function classifySessionByMessageCount(messageCount: number): 'tofu' | 'mofu' | 'hot' | null {
  if (messageCount > 10) return 'hot';
  if (messageCount > 6) return 'mofu';
  if (messageCount >= 1) return 'tofu';
  return null;
}

// Función de fetch separada para usar con React Query
async function fetchDashboardMetrics(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ metrics: DashboardMetrics; appointments: Appointment[] }> {
  // ============================================
  // 1. MÉTRICAS DE MENSAJES desde DB EXTERNA
  // ============================================
  let externalTotalMessages = 0;
  let externalTotalSessions = 0;
  let externalAvgPerSession = 0;
  let funnelFromRealtime = { tofu: 0, mofu: 0, hot: 0 };

  try {
    let chatQuery = externalSupabase
      .from('n8n_chat_histories')
      .select('id, session_id, created_at, tenant_id')
      .eq('tenant_id', tenantId);

    // Solo aplicar filtro de fechas si se proporcionan
    if (startDate) {
      chatQuery = chatQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      // Agregar 1 día para incluir todo el día final
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      chatQuery = chatQuery.lt('created_at', endDatePlusOne.toISOString());
    }

    const { data: externalData, error: externalError } = await chatQuery;

    if (externalError) {
      console.warn('[useDashboardMetrics] Error DB externa (chats):', externalError);
    } else if (externalData) {
      externalTotalMessages = externalData.length;
      
      const sessionMessageCounts = new Map<string, number>();
      externalData.forEach(msg => {
        const currentCount = sessionMessageCounts.get(msg.session_id) || 0;
        sessionMessageCounts.set(msg.session_id, currentCount + 1);
      });
      
      externalTotalSessions = sessionMessageCounts.size;
      
      sessionMessageCounts.forEach((msgCount) => {
        const stage = classifySessionByMessageCount(msgCount);
        if (stage === 'tofu') funnelFromRealtime.tofu++;
        else if (stage === 'mofu') funnelFromRealtime.mofu++;
        else if (stage === 'hot') funnelFromRealtime.hot++;
      });
      
      externalAvgPerSession = externalTotalSessions > 0 
        ? Math.round((externalTotalMessages / externalTotalSessions) * 10) / 10
        : 0;
    }
  } catch (extErr) {
    console.warn('[useDashboardMetrics] Error conectando DB externa (chats):', extErr);
  }

  // ============================================
  // 2. BOOKINGS desde DB EXTERNA (misma lógica que useExternalBookings)
  // ============================================
  let totalServicesBooked = 0;
  let confirmedBookings = 0;
  let totalRevenue = 0;
  let externalBookingsData: ExternalBooking[] = [];

  try {
    let bookingsQuery = externalSupabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false });

    // Solo aplicar filtro de fechas si se proporcionan
    if (startDate) {
      bookingsQuery = bookingsQuery.gte('event_date', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      // Agregar 1 día para incluir todo el día final
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      bookingsQuery = bookingsQuery.lt('event_date', format(endDatePlusOne, 'yyyy-MM-dd'));
    }

    const { data: bookingsData, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.warn('[useDashboardMetrics] Error DB externa (bookings):', bookingsError);
    } else if (bookingsData) {
      externalBookingsData = bookingsData as ExternalBooking[];
      totalServicesBooked = externalBookingsData.length;
      confirmedBookings = totalServicesBooked;
      totalRevenue = externalBookingsData.reduce((sum, b) => sum + (b.price || 0), 0);
      console.log('[useDashboardMetrics] Bookings encontrados:', totalServicesBooked, 'Revenue:', totalRevenue);
    }
  } catch (extErr) {
    console.warn('[useDashboardMetrics] Error conectando DB externa (bookings):', extErr);
  }

  // ============================================
  // 3. CALCULAR TASAS DEL FUNNEL
  // ============================================
  const totalFunnelSessions = funnelFromRealtime.tofu + funnelFromRealtime.mofu + funnelFromRealtime.hot;
  
  const conversionRate = externalTotalSessions > 0
    ? Math.round((confirmedBookings / externalTotalSessions) * 100)
    : 0;
  
  const deadRate = totalFunnelSessions > 0
    ? Math.round((funnelFromRealtime.tofu / totalFunnelSessions) * 100)
    : 0;
  
  const warmRate = totalFunnelSessions > 0
    ? Math.round((funnelFromRealtime.mofu / totalFunnelSessions) * 100)
    : 0;
  
  const hotRate = totalFunnelSessions > 0
    ? Math.round((funnelFromRealtime.hot / totalFunnelSessions) * 100)
    : 0;

  // ============================================
  // 4. CONSTRUIR MÉTRICAS COMBINADAS
  // ============================================
  const dashboardMetrics: DashboardMetrics = {
    totalChats: externalTotalSessions,
    totalMessages: externalTotalMessages,
    avgMessagesPerChat: externalAvgPerSession,
    botResponseRate: 0,
    avgFirstResponseTime: 0,
    avgConversionTime: 0,
    servicesBooked: totalServicesBooked,
    revenue: totalRevenue,
    funnel: {
      tofu: funnelFromRealtime.tofu,
      mofu: funnelFromRealtime.mofu,
      hotLeads: funnelFromRealtime.hot,
      bofu: confirmedBookings,
      deadRate,
      warmRate,
      hotRate,
      conversionRate,
    },
  };

  // Mapear bookings externos a appointments
  const appointments: Appointment[] = externalBookingsData.slice(0, 10).map(booking => {
    let datetime: Date;
    if (booking.event_time) {
      datetime = new Date(`${booking.event_date}T${booking.event_time}`);
    } else {
      datetime = new Date(`${booking.event_date}T00:00:00`);
    }

    return {
      id: booking.id,
      datetime,
      clientName: booking.contact_name || 'Sin nombre',
      clientPhone: booking.contact_phone || undefined,
      clientEmail: booking.contact_email || undefined,
      service: booking.item_name || 'Servicio',
      source: (booking.origin as any) || 'chat',
      sourceRaw: booking.origin, // Preservar valor original
      status: 'confirmed' as const,
      notes: booking.notes || undefined,
      chatId: booking.session_id || undefined,
      createdAt: new Date(booking.created_at || Date.now()),
      type: (booking.type as 'service' | 'product') || 'service',
      time: booking.event_time 
        ? format(new Date(`2000-01-01T${booking.event_time}`), 'HH:mm')
        : undefined,
      price: booking.price || undefined,
      currency: booking.currency || undefined,
    };
  });

  return { metrics: dashboardMetrics, appointments };
}

export function useDashboardMetrics({
  tenantId,
  dateRange,
  enableRealtime = true,
}: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof externalSupabase.channel> | null>(null);

  // Calcular fechas - usar undefined si no hay filtro para traer todo
  const startDate = dateRange?.startDate;
  const endDate = dateRange?.endDate;

  // Query key para cache
  const queryKey = [
    'dashboard-metrics',
    tenantId,
    startDate?.toISOString(),
    endDate?.toISOString(),
  ];

  // Usar React Query para cache automático
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardMetrics(tenantId!, startDate, endDate),
    enabled: !!tenantId,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
  });

  // Función para invalidar cache y refetch
  const handleRealtimeUpdate = useCallback(() => {
    console.log('[useDashboardMetrics] Realtime update - invalidating cache');
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', tenantId] });
  }, [queryClient, tenantId]);

  // Suscripción a Realtime para bookings
  useEffect(() => {
    if (!enableRealtime || !tenantId) return;

    // Limpiar canal previo
    if (channelRef.current) {
      externalSupabase.removeChannel(channelRef.current);
    }

    const channel = externalSupabase
      .channel(`dashboard-metrics-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[useDashboardMetrics] Realtime booking event:', payload.eventType);
          handleRealtimeUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'n8n_chat_histories',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[useDashboardMetrics] Realtime chat event:', payload.eventType);
          handleRealtimeUpdate();
        }
      )
      .subscribe((status) => {
        console.log('[useDashboardMetrics] Subscription status:', status);
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
    metrics: data?.metrics ?? (tenantId ? null : emptyMetrics),
    recentAppointments: data?.appointments ?? [],
    isLoading: tenantId ? isLoading : false,
    error: error ? (error as Error).message : null,
    refetch: async () => { await refetch(); },
  };
}
