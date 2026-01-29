// ============================================
// VEXA - useEffectiveTenant Hook
// ============================================
// Devuelve el tenant_id efectivo considerando impersonación
// Debe usarse en lugar de user.tenantId cuando se consultan datos
// ============================================

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import type { DisplayCurrency } from '@/lib/format-currency';

interface EffectiveTenantInfo {
  tenantId: string | null;
  isImpersonating: boolean;
  tenantName: string | null;
  tenantPlan: string | null;
  tenantCurrency: DisplayCurrency;
}

export function useEffectiveTenant(): EffectiveTenantInfo {
  const { user, isAdmin } = useAuthContext();
  const { isImpersonating, impersonatedTenant } = useImpersonation();
  const [userTenantCurrency, setUserTenantCurrency] = useState<DisplayCurrency>('USD');

  // Cargar la divisa del tenant del usuario cuando no está impersonando
  useEffect(() => {
    const loadTenantCurrency = async () => {
      if (!user?.tenantId || (isAdmin && isImpersonating)) return;
      
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('display_currency')
          .eq('id', user.tenantId)
          .single();
        
        if (!error && data?.display_currency) {
          setUserTenantCurrency(data.display_currency as DisplayCurrency);
        }
      } catch (err) {
        console.warn('[useEffectiveTenant] Error loading tenant currency:', err);
      }
    };

    loadTenantCurrency();
  }, [user?.tenantId, isAdmin, isImpersonating]);

  // Si es admin e impersonando, usar el tenant impersonado
  if (isAdmin && isImpersonating && impersonatedTenant) {
    return {
      tenantId: impersonatedTenant.id,
      isImpersonating: true,
      tenantName: impersonatedTenant.name,
      tenantPlan: impersonatedTenant.plan,
      tenantCurrency: impersonatedTenant.currency || 'USD',
    };
  }

  // Caso normal: usar el tenant del usuario
  return {
    tenantId: user?.tenantId || null,
    isImpersonating: false,
    tenantName: null,
    tenantPlan: null,
    tenantCurrency: userTenantCurrency,
  };
}
