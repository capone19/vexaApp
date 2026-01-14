// ============================================
// VEXA - Dashboard Real Data Functions
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type { DashboardMetrics, DateRangePreset } from './types';

// Calcular fecha límite según el preset
const getDateLimit = (preset: DateRangePreset): Date => {
  const now = new Date();
  switch (preset) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
    default:
      return new Date(0);
  }
};

// Obtener métricas reales del dashboard desde Supabase
export async function fetchRealDashboardData(
  tenantId: string,
  preset: DateRangePreset
): Promise<DashboardMetrics> {
  const dateLimit = getDateLimit(preset);
  const dateLimitStr = dateLimit.toISOString();

  try {
    // Ejecutar queries en paralelo
    const [
      sessionsResult,
      messagesResult,
      bookingsResult,
      contactsResult,
      metricsResult,
    ] = await Promise.all([
      // Total chat sessions
      supabase
        .from('chat_sessions')
        .select('id, funnel_stage', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('created_at', dateLimitStr),
      
      // Total messages
      supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('created_at', dateLimitStr),
      
      // Bookings
      supabase
        .from('bookings')
        .select('id, price, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateLimitStr),
      
      // Contacts by funnel stage
      supabase
        .from('contacts')
        .select('id, funnel_stage')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateLimitStr),
      
      // Daily metrics aggregated
      supabase
        .from('metrics_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', dateLimit.toISOString().split('T')[0]),
    ]);

    // Procesar resultados
    const totalChats = sessionsResult.count || 0;
    const totalMessages = messagesResult.count || 0;
    const bookings = bookingsResult.data || [];
    const contacts = contactsResult.data || [];

    // Calcular métricas del funnel desde contacts
    const tofuCount = contacts.filter(c => c.funnel_stage === 'tofu').length;
    const mofuCount = contacts.filter(c => c.funnel_stage === 'mofu').length;
    const hotCount = contacts.filter(c => c.funnel_stage === 'hot').length;
    const bofuCount = contacts.filter(c => c.funnel_stage === 'bofu').length;
    const convertedCount = contacts.filter(c => c.funnel_stage === 'converted').length;
    const lostCount = contacts.filter(c => c.funnel_stage === 'lost').length;
    const totalContacts = contacts.length || 1; // Evitar división por 0

    // Calcular revenue de bookings confirmados/completados
    const revenue = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    // Servicios agendados (bookings no cancelados)
    const servicesBooked = bookings.filter(b => b.status !== 'cancelled').length;

    // Calcular tasas
    const deadRate = totalContacts > 0 ? Math.round((lostCount / totalContacts) * 100 * 10) / 10 : 0;
    const warmRate = totalContacts > 0 ? Math.round((mofuCount / totalContacts) * 100 * 10) / 10 : 0;
    const hotRate = totalContacts > 0 ? Math.round((hotCount / totalContacts) * 100 * 10) / 10 : 0;
    const conversionRate = totalContacts > 0 ? Math.round((convertedCount / totalContacts) * 100 * 10) / 10 : 0;

    // Promedio de mensajes por chat
    const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

    return {
      totalChats,
      totalMessages,
      avgMessagesPerChat,
      botResponseRate: 0,
      avgFirstResponseTime: 0,
      avgConversionTime: 0,
      servicesBooked,
      revenue,
      funnel: {
        tofu: tofuCount,
        mofu: mofuCount,
        hotLeads: hotCount,
        bofu: bofuCount,
        deadRate,
        warmRate,
        hotRate,
        conversionRate,
      },
    };
  } catch (error) {
    console.error('[fetchRealDashboardData] Error:', error);
    // Retornar métricas vacías en caso de error
    return {
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
  }
}

// Obtener últimos agendamientos reales
export async function fetchRealAppointments(tenantId: string, limit: number = 8) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, scheduled_at, contact_name, service_name, status')
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(booking => ({
      id: booking.id,
      datetime: new Date(booking.scheduled_at),
      clientName: booking.contact_name,
      service: booking.service_name,
      status: booking.status as 'pending' | 'confirmed' | 'canceled' | 'completed',
    }));
  } catch (error) {
    console.error('[fetchRealAppointments] Error:', error);
    return [];
  }
}
