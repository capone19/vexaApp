// ============================================
// VEXA - Hook para Performance de Marketing
// ============================================
// Calcula métricas de rendimiento de campañas de plantillas WhatsApp
// Atribuye conversiones de bookings a envíos de plantillas
// ============================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase, type ExternalBooking } from '@/integrations/supabase/external-client';
import { useEffectiveTenant } from './use-effective-tenant';
import { format, differenceInDays, parseISO } from 'date-fns';

// Ventana de atribución en días
const ATTRIBUTION_WINDOW_DAYS = 7;

interface TemplateTransaction {
  id: string;
  template_id: string | null;
  message_count: number | null;
  amount_usd: number;
  created_at: string | null;
  metadata: {
    template_name?: string;
    recipients?: string[];
    failed_count?: number;
  } | null;
}

interface DailyData {
  date: string;
  messagesSent: number;
  cost: number;
  conversions: number;
  revenue: number;
}

interface TopTemplate {
  templateId: string;
  templateName: string;
  sent: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface MarketingPerformanceData {
  // KPIs principales
  totalMessagesSent: number;
  totalCostUsd: number;
  totalRevenue: number;
  conversions: number;
  uniqueRecipients: number;
  conversionRate: number;
  roas: number;
  
  // Datos para gráfico
  dailyData: DailyData[];
  
  // Top templates
  topTemplates: TopTemplate[];
  
  // Estado
  isLoading: boolean;
  error: Error | null;
}

/**
 * Normaliza un número de teléfono para comparación
 * Remueve espacios, guiones y asegura formato consistente
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  // Remover todo excepto números y +
  let normalized = phone.replace(/[^\d+]/g, '');
  // Si no empieza con +, agregarlo
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

interface UseMarketingPerformanceOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useMarketingPerformance({
  startDate,
  endDate,
}: UseMarketingPerformanceOptions): MarketingPerformanceData {
  const { tenantId } = useEffectiveTenant();

  // Query: Transacciones de mensajería del período
  const { 
    data: transactions, 
    isLoading: loadingTx, 
    error: txError 
  } = useQuery({
    queryKey: ['marketing-transactions', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('messaging_transactions')
        .select('id, template_id, message_count, amount_usd, created_at, metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'consumption')
        .not('template_id', 'is', null)
        .order('created_at', { ascending: true });
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as TemplateTransaction[];
    },
    enabled: !!tenantId,
  });

  // Extraer todos los teléfonos destinatarios únicos
  const allRecipients = useMemo(() => {
    if (!transactions) return new Set<string>();
    
    const phones = new Set<string>();
    transactions.forEach(tx => {
      const recipients = (tx.metadata as { recipients?: string[] })?.recipients || [];
      recipients.forEach(phone => {
        const normalized = normalizePhone(phone);
        if (normalized) phones.add(normalized);
      });
    });
    
    return phones;
  }, [transactions]);

  // Query: Bookings del período (para atribución)
  const { 
    data: bookings, 
    isLoading: loadingBookings 
  } = useQuery({
    queryKey: ['marketing-bookings', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = externalSupabase
        .from('bookings')
        .select('id, contact_phone, price, currency, event_date, created_at, session_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as ExternalBooking[];
    },
    enabled: !!tenantId,
  });

  // Calcular métricas de atribución
  const performanceData = useMemo((): Omit<MarketingPerformanceData, 'isLoading' | 'error'> => {
    if (!transactions || !bookings) {
      return {
        totalMessagesSent: 0,
        totalCostUsd: 0,
        totalRevenue: 0,
        conversions: 0,
        uniqueRecipients: 0,
        conversionRate: 0,
        roas: 0,
        dailyData: [],
        topTemplates: [],
      };
    }

    // Mapa de teléfono -> envíos de plantilla (para atribución)
    const sendsByPhone = new Map<string, Array<{ txDate: Date; templateId: string; templateName: string }>>();
    
    transactions.forEach(tx => {
      const recipients = (tx.metadata as { recipients?: string[] })?.recipients || [];
      const templateName = (tx.metadata as { template_name?: string })?.template_name || 'Sin nombre';
      const txDate = tx.created_at ? new Date(tx.created_at) : new Date();
      
      recipients.forEach(phone => {
        const normalized = normalizePhone(phone);
        if (!normalized) return;
        
        if (!sendsByPhone.has(normalized)) {
          sendsByPhone.set(normalized, []);
        }
        sendsByPhone.get(normalized)!.push({
          txDate,
          templateId: tx.template_id || '',
          templateName,
        });
      });
    });

    // Atribuir bookings a plantillas
    const attributedBookings: Array<{
      booking: ExternalBooking;
      templateId: string;
      templateName: string;
    }> = [];

    bookings.forEach(booking => {
      const bookingPhone = normalizePhone(booking.contact_phone);
      if (!bookingPhone) return;
      
      const sends = sendsByPhone.get(bookingPhone);
      if (!sends || sends.length === 0) return;
      
      const bookingDate = new Date(booking.created_at);
      
      // Buscar el envío más reciente dentro de la ventana de atribución
      const validSend = sends
        .filter(s => {
          const daysDiff = differenceInDays(bookingDate, s.txDate);
          return daysDiff >= 0 && daysDiff <= ATTRIBUTION_WINDOW_DAYS;
        })
        .sort((a, b) => b.txDate.getTime() - a.txDate.getTime())[0];
      
      if (validSend) {
        attributedBookings.push({
          booking,
          templateId: validSend.templateId,
          templateName: validSend.templateName,
        });
      }
    });

    // KPIs totales
    const totalMessagesSent = transactions.reduce((sum, tx) => sum + (tx.message_count || 0), 0);
    const totalCostUsd = Math.abs(transactions.reduce((sum, tx) => sum + tx.amount_usd, 0));
    const totalRevenue = attributedBookings.reduce((sum, ab) => sum + (ab.booking.price || 0), 0);
    const conversions = attributedBookings.length;
    const uniqueRecipients = allRecipients.size;
    const conversionRate = uniqueRecipients > 0 ? (conversions / uniqueRecipients) * 100 : 0;
    const roas = totalCostUsd > 0 ? totalRevenue / totalCostUsd : 0;

    // Datos diarios para gráfico
    const dailyMap = new Map<string, DailyData>();
    
    transactions.forEach(tx => {
      if (!tx.created_at) return;
      const dateKey = format(new Date(tx.created_at), 'yyyy-MM-dd');
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, messagesSent: 0, cost: 0, conversions: 0, revenue: 0 });
      }
      
      const day = dailyMap.get(dateKey)!;
      day.messagesSent += tx.message_count || 0;
      day.cost += Math.abs(tx.amount_usd);
    });

    attributedBookings.forEach(ab => {
      const dateKey = format(new Date(ab.booking.created_at), 'yyyy-MM-dd');
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, messagesSent: 0, cost: 0, conversions: 0, revenue: 0 });
      }
      
      const day = dailyMap.get(dateKey)!;
      day.conversions += 1;
      day.revenue += ab.booking.price || 0;
    });

    const dailyData = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top templates
    const templateStats = new Map<string, { name: string; sent: number; conversions: number; revenue: number }>();
    
    transactions.forEach(tx => {
      const templateId = tx.template_id || 'unknown';
      const templateName = (tx.metadata as { template_name?: string })?.template_name || 'Sin nombre';
      
      if (!templateStats.has(templateId)) {
        templateStats.set(templateId, { name: templateName, sent: 0, conversions: 0, revenue: 0 });
      }
      
      templateStats.get(templateId)!.sent += tx.message_count || 0;
    });

    attributedBookings.forEach(ab => {
      const stats = templateStats.get(ab.templateId);
      if (stats) {
        stats.conversions += 1;
        stats.revenue += ab.booking.price || 0;
      }
    });

    const topTemplates: TopTemplate[] = Array.from(templateStats.entries())
      .map(([templateId, stats]) => ({
        templateId,
        templateName: stats.name,
        sent: stats.sent,
        conversions: stats.conversions,
        revenue: stats.revenue,
        conversionRate: stats.sent > 0 ? (stats.conversions / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    return {
      totalMessagesSent,
      totalCostUsd,
      totalRevenue,
      conversions,
      uniqueRecipients,
      conversionRate,
      roas,
      dailyData,
      topTemplates,
    };
  }, [transactions, bookings, allRecipients]);

  return {
    ...performanceData,
    isLoading: loadingTx || loadingBookings,
    error: txError as Error | null,
  };
}
