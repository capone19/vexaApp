// ============================================
// VEXA - Hook useSubscription (wrapper del AuthContext)
// ============================================
// Este hook ahora es un wrapper del AuthContext para
// evitar fetches duplicados de suscripción.
// ============================================

import { useAuthContext } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  price_usd: number;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook de suscripción que usa el AuthContext global.
 * Mantiene la misma interfaz para compatibilidad.
 */
export function useSubscription(): UseSubscriptionReturn {
  const { subscription, isLoading, refetchSubscription } = useAuthContext();

  return {
    subscription: subscription as Subscription | null,
    isLoading,
    error: null, // El contexto no expone errores de suscripción por simplicidad
    refetch: refetchSubscription,
  };
}
