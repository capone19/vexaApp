// Hook para obtener el uso de conversaciones del período actual
import { useState, useEffect, useCallback } from 'react';
import { externalSupabase } from '@/integrations/supabase/external-client';
import { useEffectiveTenant } from './use-effective-tenant';
import { useSubscription } from './use-subscription';
import { 
  getConversationLimit, 
  getWhatsAppLimit, 
  hasCampaignsEnabled,
  type PlanId 
} from '@/lib/plan';

export interface PeriodUsage {
  // Conversaciones
  conversationsUsed: number;
  conversationsLimit: number;
  conversationsPercentage: number;
  
  // WhatsApp
  whatsappConnected: number;
  whatsappLimit: number | 'unlimited';
  
  // Campañas
  campaignsUsed: number;
  campaignsEnabled: boolean;
  
  // Período
  periodStart: Date;
  periodEnd: Date;
}

interface UsePeriodUsageReturn {
  usage: PeriodUsage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
      // Determinar el período actual basado en la suscripción
      let periodStart: Date;
      let periodEnd: Date;
      
      if (subscription?.current_period_start && subscription?.current_period_end) {
        periodStart = new Date(subscription.current_period_start);
        periodEnd = new Date(subscription.current_period_end);
      } else {
        // Si no hay suscripción, usar el mes actual
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];

      // Contar conversaciones únicas (sesiones) del período desde n8n_chat_histories
      const { data: sessionsData, error: sessionsError } = await externalSupabase
        .from('n8n_chat_histories')
        .select('session_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', periodStartStr)
        .lte('created_at', periodEndStr);

      if (sessionsError) {
        console.error('[usePeriodUsage] Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      // Contar sesiones únicas
      const uniqueSessions = new Set(sessionsData?.map(s => s.session_id) || []);
      const conversationsUsed = uniqueSessions.size;

      // Obtener el plan actual
      const currentPlan: PlanId = (subscription?.plan as PlanId) || 'basic';
      const conversationsLimit = getConversationLimit(currentPlan);
      const whatsappLimit = getWhatsAppLimit(currentPlan);
      const campaignsEnabled = hasCampaignsEnabled(currentPlan);

      // Por ahora, WhatsApp conectados es 1 (se podría obtener de otra tabla en el futuro)
      const whatsappConnected = 1;

      // Contar campañas del período (si está habilitado)
      let campaignsUsed = 0;
      if (campaignsEnabled) {
        // Aquí se podría consultar la tabla de campañas si existe
        campaignsUsed = 0;
      }

      const conversationsPercentage = conversationsLimit > 0 
        ? Math.round((conversationsUsed / conversationsLimit) * 100) 
        : 0;

      setUsage({
        conversationsUsed,
        conversationsLimit,
        conversationsPercentage,
        whatsappConnected,
        whatsappLimit,
        campaignsUsed,
        campaignsEnabled,
        periodStart,
        periodEnd,
      });

      console.log('[usePeriodUsage] Usage loaded:', {
        conversationsUsed,
        conversationsLimit,
        conversationsPercentage,
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
