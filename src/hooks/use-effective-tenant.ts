// ============================================
// VEXA - useEffectiveTenant Hook
// ============================================
// Devuelve el tenant_id efectivo considerando impersonación
// Debe usarse en lugar de user.tenantId cuando se consultan datos
// ============================================

import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

interface EffectiveTenantInfo {
  tenantId: string | null;
  isImpersonating: boolean;
  tenantName: string | null;
  tenantPlan: string | null;
}

export function useEffectiveTenant(): EffectiveTenantInfo {
  const { user, isAdmin } = useAuthContext();
  const { isImpersonating, impersonatedTenant, getEffectiveTenantId } = useImpersonation();

  // Si es admin e impersonando, usar el tenant impersonado
  if (isAdmin && isImpersonating && impersonatedTenant) {
    return {
      tenantId: impersonatedTenant.id,
      isImpersonating: true,
      tenantName: impersonatedTenant.name,
      tenantPlan: impersonatedTenant.plan,
    };
  }

  // Caso normal: usar el tenant del usuario
  return {
    tenantId: user?.tenantId || null,
    isImpersonating: false,
    tenantName: null,
    tenantPlan: null,
  };
}
