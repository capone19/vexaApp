// ============================================
// VEXA - Hook para Períodos de Facturación
// ============================================
// Centraliza el cálculo de períodos basado en la fecha de creación del tenant
// ============================================

import { useMemo } from 'react';
import { useSubscription } from './use-subscription';
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

export function useBillingPeriod({ selectedPeriod }: UseBillingPeriodOptions): BillingPeriodResult {
  const { subscription, isLoading } = useSubscription();
  
  // Fecha de creación del tenant (desde la suscripción o fallback)
  const tenantCreatedAt = useMemo(() => {
    if (subscription?.created_at) {
      return new Date(subscription.created_at);
    }
    return null;
  }, [subscription]);
  
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
    isLoading,
    tenantCreatedAt,
  };
}

