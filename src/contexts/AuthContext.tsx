// ============================================
// VEXA - AuthContext Global
// ============================================
// Centraliza el estado de autenticación para evitar
// re-verificaciones en cada navegación
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  isAuthReady: boolean;
  isTenantResolving: boolean;
  isAuthenticated: boolean;
  hasTenant: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  refetchUser: () => Promise<boolean>;
  refetchSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);


interface AuthProviderProps {
  children: ReactNode;
}

type SupaUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
};

function buildUserFromSession(
  supaUser: SupaUser,
  tenantId: string | null = null,
  role = 'viewer'
): User {
  return {
    id: supaUser.id,
    email: supaUser.email || '',
    name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuario',
    role,
    tenantId,
  };
}


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isTenantResolving, setIsTenantResolving] = useState(false);
  const initialSessionHandled = useRef(false);

  const resolveUser = useCallback(async (session: { user: SupaUser } | null): Promise<User | null> => {
    if (!session?.user) return null;
    const supaUser = session.user;

    const { data: userRole, error } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', supaUser.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[AuthContext] user_roles fetch error:', error);
    }

    return buildUserFromSession(supaUser, userRole?.tenant_id ?? null, userRole?.role ?? 'viewer');
  }, []);

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

  const applyUser = useCallback((resolvedUser: User | null) => {
    userRef.current = resolvedUser;
    setUser(resolvedUser);
  }, []);

  const resolveTenantInBackground = useCallback(
    (session: { user: SupaUser }) => {
      void (async () => {
        setIsTenantResolving(true);
        try {
          const resolved = await resolveUser(session);
          if (!resolved) return;
          applyUser(resolved);
          if (resolved.tenantId) {
            void fetchSubscription(resolved.tenantId);
          }
        } finally {
          setIsTenantResolving(false);
        }
      })();
    },
    [resolveUser, applyUser, fetchSubscription]
  );

  const refetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        applyUser(null);
        return false;
      }
      setIsTenantResolving(true);
      const resolvedUser = await resolveUser(session);
      applyUser(resolvedUser);
      if (resolvedUser?.tenantId) {
        void fetchSubscription(resolvedUser.tenantId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[AuthContext] refetchUser error:', err);
      return false;
    } finally {
      setIsTenantResolving(false);
    }
  }, [resolveUser, applyUser, fetchSubscription]);

  const refetchSubscription = useCallback(async () => {
    if (user?.tenantId) {
      await fetchSubscription(user.tenantId);
    }
  }, [user?.tenantId, fetchSubscription]);

  useEffect(() => {
    const handleAuthChange = async (event: string, session: { user: SupaUser } | null) => {
      console.log('[AuthContext] Auth state changed:', event);

      if (
        event === 'SIGNED_IN' &&
        initialSessionHandled.current &&
        userRef.current?.tenantId
      ) {
        setIsAuthReady(true);
        setIsLoading(false);
        return;
      }

      try {
        if (event === 'SIGNED_OUT') {
          userRef.current = null;
          setUser(null);
          setSubscription(null);
          setIsTenantResolving(false);
        } else if (event === 'SIGNED_IN') {
          // Login fresco: mostrar usuario sin tenantId de inmediato para navegar rápido,
          // resolver el tenant en background (no bloquea navegación)
          if (session?.user) {
            applyUser(buildUserFromSession(session.user));
            resolveTenantInBackground(session);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session?.user && !userRef.current?.tenantId) {
            resolveTenantInBackground(session);
          }
        } else if (event === 'INITIAL_SESSION') {
          if (!session?.user) {
            applyUser(null);
          } else {
            // Sesión guardada: resolver tenant ANTES de marcar ready para que
            // el dashboard ya tenga tenantId al llegar y cargue de inmediato
            applyUser(buildUserFromSession(session.user));
            const resolved = await resolveUser(session);
            if (resolved) {
              applyUser(resolved);
              if (resolved.tenantId) void fetchSubscription(resolved.tenantId);
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error handling auth change:', error);
        if (session?.user) {
          applyUser(buildUserFromSession(session.user));
        } else {
          userRef.current = null;
          setUser(null);
        }
      } finally {
        if (event === 'INITIAL_SESSION') {
          initialSessionHandled.current = true;
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setIsAuthReady(true);
        }
        setIsLoading(false);
      }
    };

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => {
          void handleAuthChange(event, session);
        }, 0);
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [applyUser, resolveUser, fetchSubscription, resolveTenantInBackground]);

  const isAuthenticated = !!user;
  const hasTenant = !!user?.tenantId;
  const isAdmin = !!user?.email && isAdminEmail(user.email);
  const currentPlan = subscription?.plan || 'basic';
  const isPremium = currentPlan === 'pro' || currentPlan === 'enterprise';

  const value: AuthContextValue = {
    user,
    subscription,
    isLoading,
    isAuthReady,
    isTenantResolving,
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

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
