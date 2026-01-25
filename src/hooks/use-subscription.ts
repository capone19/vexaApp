// ============================================
// VEXA - Hook useSubscription
// ============================================
// Este hook obtiene la suscripción del tenant efectivo
// (considerando impersonación para admins)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
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
 * Hook de suscripción que respeta el contexto de impersonación.
 * Cuando un admin impersona un cliente, devuelve la suscripción del cliente.
 */
export function useSubscription(): UseSubscriptionReturn {
  const { tenantId, isImpersonating } = useEffectiveTenant();
  const { subscription: authSubscription, isLoading: authLoading, refetchSubscription } = useAuthContext();
  
  const [impersonatedSubscription, setImpersonatedSubscription] = useState<Subscription | null>(null);
  const [isLoadingImpersonated, setIsLoadingImpersonated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando se impersona, cargar la suscripción del tenant impersonado
  const fetchImpersonatedSubscription = useCallback(async () => {
    if (!isImpersonating || !tenantId) {
      setImpersonatedSubscription(null);
      return;
    }

    setIsLoadingImpersonated(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code !== 'PGRST116') {
          console.warn('[useSubscription] Error fetching impersonated subscription:', fetchError);
          setError(fetchError.message);
        }
        setImpersonatedSubscription(null);
      } else {
        setImpersonatedSubscription(data as Subscription);
      }
    } catch (err) {
      console.error('[useSubscription] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando suscripción');
      setImpersonatedSubscription(null);
    } finally {
      setIsLoadingImpersonated(false);
    }
  }, [isImpersonating, tenantId]);

  useEffect(() => {
    if (isImpersonating) {
      fetchImpersonatedSubscription();
    } else {
      setImpersonatedSubscription(null);
    }
  }, [isImpersonating, tenantId, fetchImpersonatedSubscription]);

  // Si está impersonando, usar la suscripción del tenant impersonado
  if (isImpersonating) {
    return {
      subscription: impersonatedSubscription,
      isLoading: isLoadingImpersonated,
      error,
      refetch: fetchImpersonatedSubscription,
    };
  }

  // Si no está impersonando, usar la suscripción del AuthContext
  return {
    subscription: authSubscription as Subscription | null,
    isLoading: authLoading,
    error: null,
    refetch: refetchSubscription,
  };
}
