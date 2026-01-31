// ============================================
// VEXA - Hook para verificar acceso a VEXA Ads
// ============================================
// Verifica si el tenant tiene habilitado el módulo VEXA Ads
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';

interface UseVexaAdsAccessReturn {
  hasAccess: boolean;
  isLoading: boolean;
}

/**
 * Hook que verifica si el tenant actual tiene acceso a VEXA Ads.
 * Respeta el contexto de impersonación para admins.
 */
export function useVexaAdsAccess(): UseVexaAdsAccessReturn {
  const { tenantId, isImpersonating } = useEffectiveTenant();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!tenantId) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('vexa_ads_enabled')
          .eq('id', tenantId)
          .single();

        if (error) {
          console.warn('[useVexaAdsAccess] Error checking access:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data?.vexa_ads_enabled === true);
        }
      } catch (err) {
        console.error('[useVexaAdsAccess] Error:', err);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [tenantId, isImpersonating]);

  return { hasAccess, isLoading };
}
