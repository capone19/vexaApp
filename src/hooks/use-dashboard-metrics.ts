// ============================================
// VEXA - Hook para Dashboard Metrics (Híbrido: n8n externo + Cloud local)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/external-client';
import type { DashboardMetrics, Appointment } from '@/lib/types';

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

      // ============================================
      // 1. MÉTRICAS DE MENSAJES desde DB EXTERNA (n8n_chat_histories)
      // ============================================
      let externalTotalMessages = 0;
      let externalTotalSessions = 0;
      let externalAvgPerSession = 0;

      try {
        // Obtener todos los mensajes del rango de fechas
        const { data: externalData, error: externalError } = await externalSupabase
          .from('n8n_chat_histories')
          .select('id, session_id, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (externalError) {
          console.warn('[useDashboardMetrics] Error DB externa:', externalError);
        } else if (externalData) {
          externalTotalMessages = externalData.length;
          
          // Contar sesiones únicas
          const uniqueSessions = new Set(externalData.map(m => m.session_id));
          externalTotalSessions = uniqueSessions.size;
          
          // Calcular promedio
          externalAvgPerSession = externalTotalSessions > 0 
            ? Math.round((externalTotalMessages / externalTotalSessions) * 10) / 10
            : 0;

          console.log('[useDashboardMetrics] Métricas externas:', {
            totalMessages: externalTotalMessages,
            totalSessions: externalTotalSessions,
            avgPerSession: externalAvgPerSession,
          });
        }
      } catch (extErr) {
        console.warn('[useDashboardMetrics] Error conectando DB externa:', extErr);
      }

      // ============================================
      // 2. BOOKINGS desde DB LOCAL (Cloud)
      // ============================================
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', startDate.toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(10);

      if (bookingsError) throw bookingsError;

      // Contar bookings confirmados
      const confirmedBookings = (bookingsData || []).filter(
        b => b.status === 'confirmed' || b.status === 'completed'
      ).length;

      // Calcular revenue
      const totalRevenue = (bookingsData || []).reduce(
        (sum, b) => sum + (b.price || 0), 
        0
      );

      // ============================================
      // 3. FUNNEL desde DB LOCAL (chat_sessions)
      // ============================================
      const { data: funnelData, error: funnelError } = await supabase
        .from('chat_sessions')
        .select('funnel_stage')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString());

      if (funnelError) throw funnelError;

      // Calcular funnel desde sesiones
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

      // ============================================
      // 4. CONSTRUIR MÉTRICAS COMBINADAS
      // ============================================
      const dashboardMetrics: DashboardMetrics = {
        // Métricas de mensajes desde DB EXTERNA
        totalChats: externalTotalSessions,
        totalMessages: externalTotalMessages,
        avgMessagesPerChat: externalAvgPerSession,
        
        // Métricas pendientes de calcular
        botResponseRate: 0,
        avgFirstResponseTime: 0,
        avgConversionTime: 0,
        
        // Métricas de negocio desde DB LOCAL
        servicesBooked: confirmedBookings,
        revenue: totalRevenue,
        
        // Funnel desde DB LOCAL
        funnel: {
          tofu: funnelCounts.tofu,
          mofu: funnelCounts.mofu,
          hotLeads: funnelCounts.hot,
          bofu: funnelCounts.bofu,
          deadRate: Math.round((funnelCounts.lost / totalFunnel) * 100),
          warmRate: Math.round(((funnelCounts.tofu + funnelCounts.mofu) / totalFunnel) * 100),
          hotRate: Math.round(((funnelCounts.hot + funnelCounts.bofu) / totalFunnel) * 100),
          conversionRate: externalTotalSessions > 0
            ? Math.round((confirmedBookings / externalTotalSessions) * 100)
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
        // Campos adicionales - por defecto es servicio
        type: 'service' as const,
        time: new Date(booking.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        price: booking.price || undefined,
        currency: booking.currency || undefined,
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

