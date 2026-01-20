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

  // Resolver usuario desde sesión
  const resolveUser = useCallback(async (session: { user: any } | null): Promise<User | null> => {
    if (!session?.user) {
      return null;
    }

    const supaUser = session.user;

    try {
      const [{ data: tenantIdRpc, error: tenantErr }, { data: userRole, error: roleErr }] = await Promise.all([
        supabase.rpc('get_user_tenant_id'),
        supabase
          .from('user_roles')
          .select('tenant_id, role')
          .eq('user_id', supaUser.id)
          .single(),
      ]);

      if (tenantErr) {
        console.warn('[AuthContext] get_user_tenant_id RPC error:', tenantErr);
      }
      if (roleErr) {
        console.warn('[AuthContext] user_roles fetch error:', roleErr);
      }

      const tenantId = (tenantIdRpc as string | null) ?? userRole?.tenant_id ?? null;

      return {
        id: supaUser.id,
        email: supaUser.email || '',
        name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuario',
        role: userRole?.role || 'viewer',
        tenantId,
      };
    } catch (error) {
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

  // Inicializar auth
  const initAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const resolvedUser = await resolveUser(session);
      setUser(resolvedUser);
      setHasTenant(!!resolvedUser?.tenantId);
      
      // Cargar suscripción si hay tenant
      if (resolvedUser?.tenantId) {
        await fetchSubscription(resolvedUser.tenantId);
      }
    } catch (error) {
      console.error('[AuthContext] Init error:', error);
      setUser(null);
      setHasTenant(false);
    } finally {
      setIsLoading(false);
    }
  }, [resolveUser, fetchSubscription]);

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
    initAuth();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscription(null);
          setHasTenant(false);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const resolvedUser = await resolveUser(session);
          setUser(resolvedUser);
          setHasTenant(!!resolvedUser?.tenantId);
          
          if (resolvedUser?.tenantId) {
            await fetchSubscription(resolvedUser.tenantId);
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [initAuth, resolveUser, fetchSubscription]);

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
