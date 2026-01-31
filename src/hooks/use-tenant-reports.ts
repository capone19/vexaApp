// ============================================
// VEXA - Hook useTenantReports
// ============================================
// Obtiene el plan real del tenant y los addons comprados
// Soporta impersonación para admins
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './use-subscription';
import { useEffectiveTenant } from './use-effective-tenant';
import type { PlanId } from '@/lib/plan';

interface TenantAddon {
  addon_id: string;
  status: string;
  price_usd: number;
}

interface TenantReportsAccess {
  plan: PlanId;
  purchasedAddons: string[]; // IDs de reportes comprados activos
  allAddons: TenantAddon[];  // Todos los addons con su info completa
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTenantReports(): TenantReportsAccess {
  const { subscription, isLoading: subLoading } = useSubscription();
  const { tenantId, isImpersonating, tenantPlan } = useEffectiveTenant();
  
  const [addons, setAddons] = useState<TenantAddon[]>([]);
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determinar el plan actual
  const plan: PlanId = (() => {
    // Si está impersonando, usar el plan del tenant impersonado
    if (isImpersonating && tenantPlan) {
      return tenantPlan.toLowerCase() as PlanId;
    }
    // Si no, usar el plan de la suscripción
    if (subscription?.plan) {
      return subscription.plan.toLowerCase() as PlanId;
    }
    return 'basic';
  })();

  const fetchAddons = async () => {
    if (!tenantId) {
      setAddons([]);
      return;
    }

    setIsLoadingAddons(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_addons')
        .select('addon_id, status, price_usd')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (fetchError) {
        console.warn('[useTenantReports] Error fetching addons:', fetchError);
        setError(fetchError.message);
        setAddons([]);
      } else {
        setAddons(data || []);
      }
    } catch (err) {
      console.error('[useTenantReports] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando addons');
      setAddons([]);
    } finally {
      setIsLoadingAddons(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [tenantId]);

  // Extraer solo los IDs de addons activos
  const purchasedAddons = addons.map(a => a.addon_id);

  return {
    plan,
    purchasedAddons,
    allAddons: addons,
    isLoading: subLoading || isLoadingAddons,
    error,
    refetch: fetchAddons,
  };
}
