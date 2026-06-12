// ============================================
// VEXA - AuthContext Global
// ============================================
// Centraliza el estado de autenticación para evitar
// re-verificaciones en cada navegación
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAdminEmail } from '@/lib/admin-config';
import type { User } from '@/lib/auth';

interface Subscription {
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

interface AuthContextValue {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasTenant: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  refetchUser: () => Promise<void>;
  refetchSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTenant, setHasTenant] = useState(false);

  // Resolver usuario desde sesión con timeout para evitar cuelgues
  const resolveUser = useCallback(async (session: { user: any } | null): Promise<User | null> => {
    if (!session?.user) {
      return null;
    }

    const supaUser = session.user;
    const TIMEOUT_MS = 8000;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
      });

      const dataPromise = supabase
        .from('user_roles')
        .select('tenant_id, role')
        .eq('user_id', supaUser.id)
        .single();

      const { data: userRole, error: roleErr } = await Promise.race([
        dataPromise,
        timeoutPromise,
      ]);

      if (roleErr && roleErr.code !== 'PGRST116') {
        console.warn('[AuthContext] user_roles fetch error:', roleErr);
      }

      return {
        id: supaUser.id,
        email: supaUser.email || '',
        name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuario',
        role: userRole?.role || 'viewer',
        tenantId: userRole?.tenant_id ?? null,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        console.warn('[AuthContext] resolveUser timeout');
        throw new Error('TIMEOUT_KEEP_STATE');
      }
      console.error('[AuthContext] Error resolving user:', error);
      return null;
    }
  }, []);

  // Cargar suscripción
  const fetchSubscription = useCallback(async (tenantId: string | null) => {
    if (!tenantId) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('[AuthContext] Subscription fetch error:', error);
        }
        setSubscription(null);
      } else {
        setSubscription(data as Subscription);
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching subscription:', err);
      setSubscription(null);
    }
  }, []);

  // Refetch manual de usuario
  const refetchUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const resolvedUser = await resolveUser(session);
    setUser(resolvedUser);
    setHasTenant(!!resolvedUser?.tenantId);
  }, [resolveUser]);

  // Refetch manual de suscripción
  const refetchSubscription = useCallback(async () => {
    if (user?.tenantId) {
      await fetchSubscription(user.tenantId);
    }
  }, [user?.tenantId, fetchSubscription]);

  // Efecto de inicialización y listener de auth
  useEffect(() => {
    const handleAuthChange = async (event: string, session: { user: any } | null) => {
      console.log('[AuthContext] Auth state changed:', event);
      
      try {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscription(null);
          setHasTenant(false);
        } else if (event === 'SIGNED_IN') {
          if (session?.user) {
            setIsLoading(true);
            let resolvedUser: User | null = null;

            try {
              resolvedUser = await resolveUser(session);
            } catch (resolveError) {
              if (resolveError instanceof Error && resolveError.message === 'TIMEOUT_KEEP_STATE') {
                console.warn('[AuthContext] SIGNED_IN timeout - usando fallback de sesión');
              } else {
                throw resolveError;
              }
            }

            if (resolvedUser) {
              setUser(resolvedUser);
              setHasTenant(!!resolvedUser.tenantId);
              if (resolvedUser.tenantId) {
                fetchSubscription(resolvedUser.tenantId);
              }
            } else {
              const supaUser = session.user;
              const fallback: User = {
                id: supaUser.id,
                email: supaUser.email || '',
                name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuario',
                role: 'viewer',
                tenantId: null,
              };
              setUser(fallback);
              setHasTenant(false);
              setTimeout(async () => {
                try {
                  const { data: { session: fresh } } = await supabase.auth.getSession();
                  if (!fresh) return;
                  const freshUser = await resolveUser(fresh);
                  if (freshUser?.tenantId) {
                    setUser(freshUser);
                    setHasTenant(true);
                    fetchSubscription(freshUser.tenantId);
                  }
                } catch { /* ignorar */ }
              }, 2500);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            try {
              const resolvedUser = await resolveUser(session);
              if (resolvedUser) {
                setUser(resolvedUser);
                setHasTenant(!!resolvedUser.tenantId);
                if (resolvedUser.tenantId) {
                  fetchSubscription(resolvedUser.tenantId);
                }
              }
            } catch (resolveError) {
              if (resolveError instanceof Error && resolveError.message === 'TIMEOUT_KEEP_STATE') {
                console.warn('[AuthContext] TOKEN_REFRESHED timeout - manteniendo estado actual');
              } else {
                throw resolveError;
              }
            }
          }
          // Si session?.user no existe en TOKEN_REFRESHED, ignorar (no limpiar estado)
        } else if (event === 'INITIAL_SESSION') {
          const resolvedUser = await resolveUser(session);
          setUser(resolvedUser);
          setHasTenant(!!resolvedUser?.tenantId);
          if (resolvedUser?.tenantId) {
            fetchSubscription(resolvedUser.tenantId);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error handling auth change:', error);
        // Solo limpiar estado si NO es un error de timeout/red temporal
        if (!(error instanceof Error && (error.message === 'Timeout' || error.message === 'TIMEOUT_KEEP_STATE'))) {
          setUser(null);
          setHasTenant(false);
        }
      } finally {
        // Siempre marcar como no-loading después de cualquier evento de auth
        setIsLoading(false);
      }
    };

    // onAuthStateChange emite INITIAL_SESSION automáticamente al suscribirse,
    // con la sesión actual (o null). No es necesario llamar getSession() manualmente.
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => handleAuthChange(event, session)
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [resolveUser, fetchSubscription]);

  // Valores computados
  const isAuthenticated = !!user;
  const isAdmin = !!user?.email && isAdminEmail(user.email);
  const currentPlan = subscription?.plan || 'basic';
  const isPremium = currentPlan === 'pro' || currentPlan === 'enterprise';

  const value: AuthContextValue = {
    user,
    subscription,
    isLoading,
    isAuthenticated,
    hasTenant,
    isAdmin,
    isPremium,
    refetchUser,
    refetchSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
