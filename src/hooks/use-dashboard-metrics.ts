// ============================================
// VEXA - Hook para Dashboard Metrics (Híbrido: n8n externo + Cloud local)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase, type N8nChatMessage } from '@/integrations/supabase/external-client';
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

// Clasificar sesiones según cantidad de mensajes (igual que en Chats.tsx)
function classifySessionByMessageCount(messageCount: number): 'tofu' | 'mofu' | 'hot' | null {
  if (messageCount > 10) return 'hot';     // Alta intención
  if (messageCount > 6) return 'mofu';     // En progreso
  if (messageCount >= 1) return 'tofu';    // Conversación inicial
  return null;
}

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
      let funnelFromRealtime = { tofu: 0, mofu: 0, hot: 0 };

      try {
        // Obtener todos los mensajes del rango de fechas para el tenant
        const { data: externalData, error: externalError } = await externalSupabase
          .from('n8n_chat_histories')
          .select('id, session_id, created_at, tenant_id')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (externalError) {
          console.warn('[useDashboardMetrics] Error DB externa:', externalError);
        } else if (externalData) {
          externalTotalMessages = externalData.length;
          
          // Agrupar mensajes por sesión y contar
          const sessionMessageCounts = new Map<string, number>();
          externalData.forEach(msg => {
            const currentCount = sessionMessageCounts.get(msg.session_id) || 0;
            sessionMessageCounts.set(msg.session_id, currentCount + 1);
          });
          
          externalTotalSessions = sessionMessageCounts.size;
          
          // Clasificar cada sesión según cantidad de mensajes
          sessionMessageCounts.forEach((msgCount, sessionId) => {
            const stage = classifySessionByMessageCount(msgCount);
            if (stage === 'tofu') funnelFromRealtime.tofu++;
            else if (stage === 'mofu') funnelFromRealtime.mofu++;
            else if (stage === 'hot') funnelFromRealtime.hot++;
          });
          
          // Calcular promedio
          externalAvgPerSession = externalTotalSessions > 0 
            ? Math.round((externalTotalMessages / externalTotalSessions) * 10) / 10
            : 0;

          console.log('[useDashboardMetrics] Métricas externas:', {
            totalMessages: externalTotalMessages,
            totalSessions: externalTotalSessions,
            avgPerSession: externalAvgPerSession,
            funnel: funnelFromRealtime,
          });
        }
      } catch (extErr) {
        console.warn('[useDashboardMetrics] Error conectando DB externa:', extErr);
      }

      // ============================================
      // 2. BOOKINGS desde DB LOCAL (Cloud) para BOFU y servicios agendados
      // ============================================
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', startDate.toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (bookingsError) throw bookingsError;

      // Contar bookings confirmados (esto es BOFU - ventas)
      const confirmedBookings = (bookingsData || []).filter(
        b => b.status === 'confirmed' || b.status === 'completed'
      ).length;

      // Total de servicios agendados (cualquier status)
      const totalServicesBooked = (bookingsData || []).length;

      // Calcular revenue
      const totalRevenue = (bookingsData || []).reduce(
        (sum, b) => sum + (b.price || 0), 
        0
      );

      // ============================================
      // 3. CALCULAR TASAS DEL FUNNEL
      // ============================================
      const totalFunnelSessions = funnelFromRealtime.tofu + funnelFromRealtime.mofu + funnelFromRealtime.hot;
      
      // Tasa de conversión: bookings confirmados / total sesiones
      const conversionRate = externalTotalSessions > 0
        ? Math.round((confirmedBookings / externalTotalSessions) * 100)
        : 0;
      
      // Tasa "sin respuesta": sesiones con pocos mensajes (TOFU) / total
      const deadRate = totalFunnelSessions > 0
        ? Math.round((funnelFromRealtime.tofu / totalFunnelSessions) * 100)
        : 0;
      
      // Tasa "en progreso": MOFU / total
      const warmRate = totalFunnelSessions > 0
        ? Math.round((funnelFromRealtime.mofu / totalFunnelSessions) * 100)
        : 0;
      
      // Tasa "alta intención": HOT / total
      const hotRate = totalFunnelSessions > 0
        ? Math.round((funnelFromRealtime.hot / totalFunnelSessions) * 100)
        : 0;

      // ============================================
      // 4. CONSTRUIR MÉTRICAS COMBINADAS
      // ============================================
      const dashboardMetrics: DashboardMetrics = {
        // Métricas de mensajes desde DB EXTERNA (realtime)
        totalChats: externalTotalSessions,
        totalMessages: externalTotalMessages,
        avgMessagesPerChat: externalAvgPerSession,
        
        // Métricas pendientes de calcular
        botResponseRate: 0,
        avgFirstResponseTime: 0,
        avgConversionTime: 0,
        
        // Métricas de negocio desde DB LOCAL (bookings)
        servicesBooked: totalServicesBooked,
        revenue: totalRevenue,
        
        // Funnel combinado: TOFU/MOFU/HOT desde realtime, BOFU desde bookings
        funnel: {
          tofu: funnelFromRealtime.tofu,       // Conversaciones iniciales (1-6 msgs)
          mofu: funnelFromRealtime.mofu,       // En progreso (7-10 msgs)
          hotLeads: funnelFromRealtime.hot,    // Alta intención (>10 msgs)
          bofu: confirmedBookings,              // Ventas (bookings confirmados)
          deadRate,                             // % sin respuesta
          warmRate,                             // % en progreso
          hotRate,                              // % alta intención
          conversionRate,                       // % conversión (bookings/sesiones)
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

