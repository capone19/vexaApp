// ============================================
// VEXA - ImpersonationContext
// ============================================
// Maneja el estado de impersonación de tenants para admins
// Permite al admin ver el dashboard como si fuera un cliente
// sin cambiar su autenticación real
// ============================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';
import { toast } from 'sonner';

interface ImpersonatedTenant {
  id: string;
  name: string;
  plan: string;
  slug: string;
  currency?: 'CLP' | 'BOB' | 'USD';
}

interface ImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedTenant: ImpersonatedTenant | null;
  startImpersonation: (tenant: ImpersonatedTenant) => Promise<boolean>;
  stopImpersonation: () => Promise<void>;
  getEffectiveTenantId: () => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

const STORAGE_KEY = 'vexa_impersonation';

interface StoredImpersonation {
  tenant: ImpersonatedTenant;
  logId: string;
  startedAt: string;
}

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const { user, isAdmin } = useAuthContext();
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(() => {
    // Restaurar impersonación desde sessionStorage al cargar
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data: StoredImpersonation = JSON.parse(stored);
          return data.tenant;
        } catch {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    }
    return null;
  });

  const isImpersonating = !!impersonatedTenant;

  const startImpersonation = useCallback(async (tenant: ImpersonatedTenant): Promise<boolean> => {
    if (!isAdmin || !user) {
      toast.error('No tienes permisos para realizar esta acción');
      return false;
    }

    try {
      // Llamar al edge function para validar y registrar la impersonación
      const { data, error } = await supabase.functions.invoke('admin-impersonate', {
        body: {
          action: 'start',
          tenantId: tenant.id,
          tenantName: tenant.name,
        },
      });

      if (error) {
        console.error('[Impersonation] Error:', error);
        toast.error('Error al iniciar la vista de cliente');
        return false;
      }

      if (!data?.success) {
        toast.error(data?.message || 'No se pudo iniciar la impersonación');
        return false;
      }

      // Guardar en estado y sessionStorage
      const storedData: StoredImpersonation = {
        tenant,
        logId: data.logId,
        startedAt: new Date().toISOString(),
      };

      setImpersonatedTenant(tenant);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

      toast.success(`Ahora ves la cuenta de ${tenant.name}`);
      return true;
    } catch (err) {
      console.error('[Impersonation] Error starting:', err);
      toast.error('Error al iniciar la vista de cliente');
      return false;
    }
  }, [isAdmin, user]);

  const stopImpersonation = useCallback(async () => {
    if (!impersonatedTenant) return;

    try {
      // Obtener el logId del storage
      const stored = sessionStorage.getItem(STORAGE_KEY);
      let logId: string | null = null;
      
      if (stored) {
        try {
          const data: StoredImpersonation = JSON.parse(stored);
          logId = data.logId;
        } catch {}
      }

      // Llamar al edge function para registrar el fin de la impersonación
      if (logId) {
        await supabase.functions.invoke('admin-impersonate', {
          body: {
            action: 'stop',
            logId,
          },
        });
      }

      // Limpiar estado
      setImpersonatedTenant(null);
      sessionStorage.removeItem(STORAGE_KEY);

      toast.success('Has salido de la vista de cliente');
    } catch (err) {
      console.error('[Impersonation] Error stopping:', err);
      // Limpiar de todas formas
      setImpersonatedTenant(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [impersonatedTenant]);

  // Obtener el tenant_id efectivo (impersonado o real)
  const getEffectiveTenantId = useCallback((): string | null => {
    if (isImpersonating && impersonatedTenant) {
      return impersonatedTenant.id;
    }
    return user?.tenantId || null;
  }, [isImpersonating, impersonatedTenant, user?.tenantId]);

  const value: ImpersonationContextValue = {
    isImpersonating,
    impersonatedTenant,
    startImpersonation,
    stopImpersonation,
    getEffectiveTenantId,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
