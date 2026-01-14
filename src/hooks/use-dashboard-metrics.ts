// ============================================
// VEXA - Hook para Dashboard Metrics (Supabase Real)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics, FunnelMetrics, Appointment } from '@/lib/types';

interface UseDashboardMetricsOptions {
  tenantId: string | null | undefined;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
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

export function useDashboardMetrics({
  tenantId,
  dateRange,
}: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!tenantId) {
      setMetrics(emptyMetrics);
      setRecentAppointments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calcular rango de fechas (default: últimos 30 días)
      const endDate = dateRange?.endDate || new Date();
      const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 1. Obtener métricas diarias agregadas
      const { data: metricsData, error: metricsError } = await supabase
        .from('metrics_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (metricsError) throw metricsError;

      // 2. Obtener bookings recientes
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', startDate.toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(10);

      if (bookingsError) throw bookingsError;

      // 3. Obtener conteo de sesiones por funnel_stage
      const { data: funnelData, error: funnelError } = await supabase
        .from('chat_sessions')
        .select('funnel_stage')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString());

      if (funnelError) throw funnelError;

      // Agregar métricas
      const aggregated = (metricsData || []).reduce(
        (acc, day) => ({
          totalSessions: acc.totalSessions + (day.total_sessions || 0),
          totalMessages: acc.totalMessages + (day.total_messages || 0),
          bookingsConfirmed: acc.bookingsConfirmed + (day.bookings_confirmed || 0),
          revenue: acc.revenue + (day.revenue || 0),
          avgResponseTime: acc.avgResponseTime + (day.avg_response_time_seconds || 0),
          convertedCount: acc.convertedCount + (day.converted_count || 0),
          tofuCount: acc.tofuCount + (day.tofu_count || 0),
          mofuCount: acc.mofuCount + (day.mofu_count || 0),
          hotCount: acc.hotCount + (day.hot_count || 0),
          bofuCount: acc.bofuCount + (day.bofu_count || 0),
          lostCount: acc.lostCount + (day.lost_count || 0),
          daysCount: acc.daysCount + 1,
        }),
        {
          totalSessions: 0,
          totalMessages: 0,
          bookingsConfirmed: 0,
          revenue: 0,
          avgResponseTime: 0,
          convertedCount: 0,
          tofuCount: 0,
          mofuCount: 0,
          hotCount: 0,
          bofuCount: 0,
          lostCount: 0,
          daysCount: 0,
        }
      );

      // Calcular funnel desde sesiones actuales
      const funnelCounts = (funnelData || []).reduce(
        (acc, session) => {
          const stage = session.funnel_stage;
          if (stage === 'tofu') acc.tofu++;
          else if (stage === 'mofu') acc.mofu++;
          else if (stage === 'hot') acc.hot++;
          else if (stage === 'bofu') acc.bofu++;
          else if (stage === 'converted') acc.converted++;
          else if (stage === 'lost') acc.lost++;
          return acc;
        },
        { tofu: 0, mofu: 0, hot: 0, bofu: 0, converted: 0, lost: 0 }
      );

      const totalFunnel = Object.values(funnelCounts).reduce((a, b) => a + b, 0) || 1;

      // Construir métricas del dashboard
      const dashboardMetrics: DashboardMetrics = {
        totalChats: aggregated.totalSessions,
        totalMessages: aggregated.totalMessages,
        avgMessagesPerChat: aggregated.totalSessions > 0 
          ? Math.round(aggregated.totalMessages / aggregated.totalSessions) 
          : 0,
        botResponseRate: 0, // Calculable si tenemos datos de respuestas
        avgFirstResponseTime: aggregated.daysCount > 0 
          ? Math.round(aggregated.avgResponseTime / aggregated.daysCount) 
          : 0,
        avgConversionTime: 0, // Requiere cálculo más complejo
        servicesBooked: aggregated.bookingsConfirmed,
        revenue: aggregated.revenue,
        funnel: {
          tofu: funnelCounts.tofu,
          mofu: funnelCounts.mofu,
          hotLeads: funnelCounts.hot,
          bofu: funnelCounts.bofu,
          deadRate: Math.round((funnelCounts.lost / totalFunnel) * 100),
          warmRate: Math.round(((funnelCounts.tofu + funnelCounts.mofu) / totalFunnel) * 100),
          hotRate: Math.round(((funnelCounts.hot + funnelCounts.bofu) / totalFunnel) * 100),
          conversionRate: aggregated.totalSessions > 0
            ? Math.round((aggregated.bookingsConfirmed / aggregated.totalSessions) * 100)
            : 0,
        },
      };

      // Mapear bookings a appointments
      const appointments: Appointment[] = (bookingsData || []).map(booking => ({
        id: booking.id,
        datetime: new Date(booking.scheduled_at),
        clientName: booking.contact_name || 'Sin nombre',
        clientPhone: booking.contact_phone || undefined,
        service: booking.service_name || 'Servicio',
        source: (booking.origin as any) || 'chat',
        status: mapBookingStatus(booking.status),
        notes: booking.notes || undefined,
        chatId: booking.session_id || undefined,
        createdAt: new Date(booking.created_at || Date.now()),
      }));

      setMetrics(dashboardMetrics);
      setRecentAppointments(appointments);
    } catch (err) {
      console.error('[useDashboardMetrics] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando métricas');
      setMetrics(emptyMetrics);
      setRecentAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, dateRange?.startDate, dateRange?.endDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    recentAppointments,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}

// Helper para mapear status de booking
function mapBookingStatus(status: string | null): 'confirmed' | 'pending' | 'canceled' {
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

