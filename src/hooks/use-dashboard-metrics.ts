// ============================================
// VEXA - Hook para Dashboard Metrics (con React Query)
// ============================================
// Usa la función centralizada countConversations para garantizar
// consistencia con Facturación y Admin.
// 
// NOTA: La sincronización realtime ahora es GLOBAL
// Se maneja en MainLayout via useChatRealtimeSync.
// ============================================

import { useQuery } from '@tanstack/react-query';
import { externalSupabase, type ExternalBooking } from '@/integrations/supabase/external-client';
import { countConversations } from '@/lib/api/conversation-counter';
import type { DashboardMetrics, Appointment, DailyMetric, TopService } from '@/lib/types';
import { format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

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
  dailyData: [],
};

// Get short day name in Spanish
function getShortDayName(date: Date): string {
  return format(date, 'EEE', { locale: es }).charAt(0).toUpperCase() + format(date, 'EEE', { locale: es }).slice(1, 3);
}

// Función de fetch separada para usar con React Query
async function fetchDashboardMetrics(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ metrics: DashboardMetrics; appointments: Appointment[] }> {
  // ============================================
  // 1. USAR FUNCIÓN CENTRALIZADA DE CONTEO
  // Esto garantiza consistencia con Facturación y Admin
  // ============================================
  const conversationData = await countConversations({
    tenantId,
    startDate,
    endDate,
  });

  const externalTotalSessions = conversationData.totalConversations;
  const externalTotalMessages = conversationData.totalMessages;
  const externalAvgPerSession = conversationData.avgMessagesPerConversation;
  const funnelFromRealtime = {
    tofu: conversationData.byStage.tofu,
    mofu: conversationData.byStage.mofu,
    hot: conversationData.byStage.hotLeads,
  };

  console.log('[useDashboardMetrics] ✓ Conversation count:', {
    totalConversations: externalTotalSessions,
    totalMessages: externalTotalMessages,
    funnel: funnelFromRealtime,
  });

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
      // Usar lte (menor o igual) con la fecha de hoy como mínimo
      const today = new Date();
      const effectiveEndDate = endDate > today ? endDate : today;
      bookingsQuery = bookingsQuery.lte('event_date', format(effectiveEndDate, 'yyyy-MM-dd'));
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
  // 4. GENERAR DATOS DIARIOS PARA GRÁFICOS
  // ============================================
  const dailyData: DailyMetric[] = [];
  
  // Group bookings by day
  const dailyBookingsMap = new Map<string, number>();
  externalBookingsData.forEach(booking => {
    const dateKey = booking.event_date; // Already in yyyy-MM-dd format
    dailyBookingsMap.set(dateKey, (dailyBookingsMap.get(dateKey) || 0) + 1);
  });

  // Para datos diarios, necesitamos hacer una query adicional con los mensajes completos
  if (startDate && endDate) {
    try {
      // ============================================
      // PAGINACIÓN para obtener TODOS los mensajes del rango
      // El servidor externo limita a 1,000 filas por query
      // ============================================
      const PAGE_SIZE = 1000;
      let allChatMessages: Array<{ id: number; session_id: string; created_at: string }> = [];
      let offset = 0;
      let hasMore = true;
      
      const endOfRange = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await externalSupabase
          .from('n8n_chat_histories')
          .select('id, session_id, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endOfRange.toISOString())
          .order('created_at', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        
        if (pageError) {
          console.warn('[useDashboardMetrics] Error fetching daily data page:', pageError);
          break;
        }
        
        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allChatMessages.push(...pageData);
          offset += pageData.length;
          if (pageData.length < PAGE_SIZE) hasMore = false;
        }
        
        // Límite de seguridad: 50,000 mensajes para datos diarios
        if (offset >= 50000) {
          console.warn('[useDashboardMetrics] Hit safety limit for daily data');
          hasMore = false;
        }
      }
      
      console.log('[useDashboardMetrics] Daily data fetched:', allChatMessages.length, 'messages in', Math.ceil(offset / PAGE_SIZE), 'pages');
      
      // Usar allChatMessages para el procesamiento
      const chatMessagesData = allChatMessages;

      if (chatMessagesData.length > 0) {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Group messages by day and session
        const dailyMessagesMap = new Map<string, { sessions: Set<string>; messages: number }>();
        
        // Initialize all days
        days.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          dailyMessagesMap.set(dateKey, { sessions: new Set(), messages: 0 });
        });
        
        // Count actual messages per day
        chatMessagesData.forEach(msg => {
          const msgDate = new Date(msg.created_at);
          const dateKey = format(msgDate, 'yyyy-MM-dd');
          const dayData = dailyMessagesMap.get(dateKey);
          if (dayData) {
            dayData.sessions.add(msg.session_id);
            dayData.messages++;
          }
        });
        
        // Build daily data array
        days.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = dailyMessagesMap.get(dateKey) || { sessions: new Set(), messages: 0 };
          const chatsCount = dayData.sessions.size;
          const messagesCount = dayData.messages;
          const avgMessages = chatsCount > 0 ? Math.round((messagesCount / chatsCount) * 10) / 10 : 0;
          
          // Simple abandonment rate: sessions with only 1-2 messages / total sessions
          let abandonedCount = 0;
          dayData.sessions.forEach(sessionId => {
            const sessionMsgs = chatMessagesData.filter(
              m => m.session_id === sessionId && 
              format(new Date(m.created_at), 'yyyy-MM-dd') === dateKey
            );
            if (sessionMsgs.length <= 2) abandonedCount++;
          });
          const abandonmentRate = chatsCount > 0 ? Math.round((abandonedCount / chatsCount) * 100) : 0;
          
          dailyData.push({
            date: dateKey,
            day: getShortDayName(day),
            chats: chatsCount,
            messages: messagesCount,
            avgMessages,
            abandonmentRate,
            bookings: dailyBookingsMap.get(dateKey) || 0,
          });
        });
      }
    } catch (err) {
      console.warn('[useDashboardMetrics] Error building daily data:', err);
    }
  }

  // ============================================
  // 5. CALCULAR TOP SERVICIOS
  // ============================================
  const serviceMap = new Map<string, { count: number; revenue: number }>();
  externalBookingsData.forEach(booking => {
    const serviceName = booking.item_name || 'Servicio';
    const current = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
    serviceMap.set(serviceName, {
      count: current.count + 1,
      revenue: current.revenue + (booking.price || 0),
    });
  });
  
  const topServices: TopService[] = Array.from(serviceMap.entries())
    .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ============================================
  // 6. CONSTRUIR MÉTRICAS COMBINADAS
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
    dailyData,
    topServices,
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
  enableRealtime = true, // Mantenemos el parámetro por compatibilidad pero ya no se usa aquí
}: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  // ============================================
  // NOTA: La suscripción realtime ahora es GLOBAL
  // ============================================
  // La sincronización en tiempo real se maneja en MainLayout
  // a través de useChatRealtimeSync, que invalida todos los
  // caches relacionados (incluyendo este) cuando llegan
  // nuevos mensajes o bookings.
  // ============================================

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
  // La invalidación viene de useChatRealtimeSync en MainLayout
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardMetrics(tenantId!, startDate, endDate),
    enabled: !!tenantId,
    staleTime: 0, // Sin stale time para que siempre se refresquen al cambiar fechas
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    metrics: data?.metrics ?? (tenantId ? null : emptyMetrics),
    recentAppointments: data?.appointments ?? [],
    isLoading: tenantId ? isLoading : false,
    error: error ? (error as Error).message : null,
    refetch: async () => { await refetch(); },
  };
}
