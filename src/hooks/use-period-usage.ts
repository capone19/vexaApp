// ============================================
// VEXA - Hook para Uso del Período de Facturación
// ============================================
// CRÍTICO: Este hook determina el uso para facturación.
// El período se calcula basado en current_period_start de la suscripción
// o la fecha de creación del tenant (ciclos mensuales).
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
import { useSubscription } from './use-subscription';
import { countConversationsForBillingPeriod } from '@/lib/api/conversation-counter';
import { 
  getConversationLimit, 
  getWhatsAppLimit, 
  hasCampaignsEnabled,
  type PlanId 
} from '@/lib/plan';

// Costo por conversación extra en USD
export const EXTRA_CONVERSATION_COST_USD = 0.30;

export interface PeriodUsage {
  // Conversaciones - FUENTE DE VERDAD para facturación
  conversationsUsed: number;
  conversationsLimit: number;
  conversationsPercentage: number;
  
  // Conversaciones extra y costo
  conversationsExtra: number;      // Conversaciones sobre el límite
  extraCostUSD: number;            // Costo de las conversaciones extra
  
  // Mensajes totales (informativo)
  totalMessages: number;
  avgMessagesPerConversation: number;
  
  // WhatsApp
  whatsappConnected: number;
  whatsappLimit: number | 'unlimited';
  
  // Campañas
  campaignsUsed: number;
  campaignsEnabled: boolean;
  
  // Período
  periodStart: Date;
  periodEnd: Date;
  daysRemaining: number;           // Días restantes del período
  daysTotal: number;               // Total de días del período
  daysElapsed: number;             // Días transcurridos
}

interface UsePeriodUsageReturn {
  usage: PeriodUsage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Calcula el período de facturación actual basado en la fecha de inicio.
 * Los períodos son ciclos mensuales desde la fecha de inicio.
 * Ejemplo: Si createdAt es 15 enero, los períodos son 15 ene - 14 feb, 15 feb - 14 mar, etc.
 */
function calculateBillingPeriod(startDate: Date): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const dayOfMonth = startDate.getDate();
  
  // Encontrar el inicio del período actual
  let periodStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // Si ya pasó ese día del mes, estamos en el período que empezó este mes
  // Si no ha llegado, estamos en el período que empezó el mes pasado
  if (now.getDate() < dayOfMonth) {
    periodStart.setMonth(periodStart.getMonth() - 1);
  }
  
  // El período termina un mes después del inicio (menos 1 día)
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  
  return { periodStart, periodEnd };
}

export function usePeriodUsage(): UsePeriodUsageReturn {
  const { tenantId } = useEffectiveTenant();
  const { subscription } = useSubscription();
  const [usage, setUsage] = useState<PeriodUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!tenantId) {
      setUsage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let periodStart: Date;
      let periodEnd: Date;
      
      // PRIORIDAD 1: Usar fechas de la suscripción si existen
      if (subscription?.current_period_start && subscription?.current_period_end) {
        periodStart = new Date(subscription.current_period_start);
        periodEnd = new Date(subscription.current_period_end);
      } else {
        // PRIORIDAD 2: Calcular basado en fecha de creación del tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('created_at')
          .eq('id', tenantId)
          .single();
        
        if (tenantError || !tenantData?.created_at) {
          // FALLBACK: Usar el mes actual si no hay fecha de creación
          const now = new Date();
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
          // Calcular período basado en fecha de creación
          const createdAt = new Date(tenantData.created_at);
          const calculated = calculateBillingPeriod(createdAt);
          periodStart = calculated.periodStart;
          periodEnd = calculated.periodEnd;
        }
      }

      // Calcular días del período
      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysTotal = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
      const daysElapsed = Math.max(0, Math.ceil((now.getTime() - periodStart.getTime()) / msPerDay));
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay));

      // ============================================
      // USAR FUNCIÓN CENTRALIZADA DE CONTEO
      // ============================================
      const conversationData = await countConversationsForBillingPeriod(
        tenantId,
        periodStart,
        periodEnd
      );

      const conversationsUsed = conversationData.totalConversations;
      const totalMessages = conversationData.totalMessages;
      const avgMessagesPerConversation = conversationData.avgMessagesPerConversation;

      // Obtener el plan actual y límites
      const currentPlan: PlanId = (subscription?.plan as PlanId) || 'basic';
      const conversationsLimit = getConversationLimit(currentPlan);
      const whatsappLimit = getWhatsAppLimit(currentPlan);
      const campaignsEnabled = hasCampaignsEnabled(currentPlan);

      // Calcular conversaciones extra y costo
      const conversationsExtra = Math.max(0, conversationsUsed - conversationsLimit);
      const extraCostUSD = conversationsExtra * EXTRA_CONVERSATION_COST_USD;

      // WhatsApp conectados (por ahora hardcodeado)
      const whatsappConnected = 1;

      // Campañas
      let campaignsUsed = 0;

      const conversationsPercentage = conversationsLimit > 0 
        ? Math.round((conversationsUsed / conversationsLimit) * 100) 
        : 0;

      setUsage({
        conversationsUsed,
        conversationsLimit,
        conversationsPercentage,
        conversationsExtra,
        extraCostUSD,
        totalMessages,
        avgMessagesPerConversation,
        whatsappConnected,
        whatsappLimit,
        campaignsUsed,
        campaignsEnabled,
        periodStart,
        periodEnd,
        daysRemaining,
        daysTotal,
        daysElapsed,
      });

      console.log('[usePeriodUsage] ✓ Billing usage loaded:', {
        tenantId,
        conversationsUsed,
        conversationsLimit,
        conversationsExtra,
        extraCostUSD,
        period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
        daysRemaining,
        currentPlan,
      });
    } catch (err) {
      console.error('[usePeriodUsage] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando uso del período');
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, subscription]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    isLoading,
    error,
    refetch: fetchUsage,
  };
}
