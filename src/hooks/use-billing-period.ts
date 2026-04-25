// ============================================
// VEXA - Hook para Períodos de Facturación
// ============================================
// Período alineado con `tenants.created_at` (mismo ancla que usePeriodUsage)
// ============================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTenantRowQueryKey } from '@/lib/api/tenant-query';
import { useSubscription } from './use-subscription';
import { useEffectiveTenant } from './use-effective-tenant';
import { calculatePeriods, type PeriodPreset } from '@/components/shared/PeriodFilter';

interface UseBillingPeriodOptions {
  selectedPeriod: PeriodPreset;
}

interface BillingPeriodResult {
  // Fechas del período seleccionado
  startDate: Date | undefined;
  endDate: Date | undefined;
  
  // Info de todos los períodos para el filtro
  periodInfo: {
    current: { start: Date; end: Date };
    previous: { start: Date; end: Date };
  };
  
  // Estado
  isLoading: boolean;
  tenantCreatedAt: Date | null;
}

const TENANT_STALE_MS = 1000 * 60 * 5;

export function useBillingPeriod({ selectedPeriod }: UseBillingPeriodOptions): BillingPeriodResult {
  const { subscription, isLoading: subscriptionLoading } = useSubscription();
  const { tenantId } = useEffectiveTenant();

  const { data: tenantRow, isLoading: tenantRowLoading } = useQuery({
    queryKey: tenantId ? getTenantRowQueryKey(tenantId) : ['tenant', 'row', 'none'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('created_at, plan')
        .eq('id', tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: TENANT_STALE_MS,
  });
  
  const tenantCreatedAt = useMemo(() => {
    if (tenantRow?.created_at) {
      return new Date(tenantRow.created_at);
    }
    if (subscription?.created_at) {
      return new Date(subscription.created_at);
    }
    return null;
  }, [tenantRow, subscription]);
  
  // Calcular los períodos
  const periodInfo = useMemo(() => {
    return calculatePeriods(tenantCreatedAt);
  }, [tenantCreatedAt]);
  
  // Obtener las fechas según el período seleccionado
  const { startDate, endDate } = useMemo(() => {
    switch (selectedPeriod) {
      case 'current':
        return {
          startDate: periodInfo.current.start,
          endDate: periodInfo.current.end,
        };
      case 'previous':
        return {
          startDate: periodInfo.previous.start,
          endDate: periodInfo.previous.end,
        };
      case 'all':
      default:
        return {
          startDate: undefined, // Sin filtro = todo el historial
          endDate: undefined,
        };
    }
  }, [selectedPeriod, periodInfo]);
  
  return {
    startDate,
    endDate,
    periodInfo,
    isLoading: subscriptionLoading || (tenantId ? tenantRowLoading : false),
    tenantCreatedAt,
  };
}

