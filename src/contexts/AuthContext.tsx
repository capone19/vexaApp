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

const TENANT_RESOLVE_ATTEMPTS = 3;
const TENANT_RESOLVE_ATTEMPT_TIMEOUT_MS = 3000;
const TENANT_RESOLVE_RETRY_DELAY_MS = 400;

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timeoutId = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
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
    if (!session?.user) {
      return null;
    }

    const supaUser = session.user;

    const { data: tenantIdFromRpc, error: tenantErr } = await supabase.rpc('get_user_tenant_id');
    if (tenantErr) {
      console.warn('[AuthContext] get_user_tenant_id error:', tenantErr, 'user_id:', supaUser.id);
    } else if (import.meta.env.DEV) {
      console.log('[AuthContext] get_user_tenant_id:', tenantIdFromRpc ?? null, 'user_id:', supaUser.id);
    }

    let tenantId = tenantIdFromRpc ?? null;
    let role = 'viewer';

    if (tenantId) {
      const { data: userRole, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supaUser.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (roleErr) {
        console.warn('[AuthContext] user_roles role fetch error:', roleErr);
      }
      if (userRole?.role) {
        role = userRole.role;
      }
    } else {
      const { data: userRole, error: roleErr } = await supabase
        .from('user_roles')
        .select('tenant_id, role')
        .eq('user_id', supaUser.id)
        .maybeSingle();

      if (roleErr && roleErr.code !== 'PGRST116') {
        console.warn('[AuthContext] user_roles fallback fetch error:', roleErr);
      }
      if (userRole?.tenant_id) {
        tenantId = userRole.tenant_id;
        role = userRole.role || 'viewer';
      }
    }

    return buildUserFromSession(supaUser, tenantId, role);
  }, []);

  const resolveUserWithRetry = useCallback(
    async (session: { user: SupaUser } | null): Promise<User | null> => {
      if (!session?.user) return null;

      let lastResolved: User | null = null;

      for (let attempt = 0; attempt < TENANT_RESOLVE_ATTEMPTS; attempt++) {
        const resolved = await withTimeout(
          resolveUser(session),
          TENANT_RESOLVE_ATTEMPT_TIMEOUT_MS
        );

        if (resolved?.tenantId) {
          return resolved;
        }

        if (resolved) {
          lastResolved = resolved;
        }

        if (import.meta.env.DEV) {
          console.warn(
            '[AuthContext] tenant resolve attempt',
            attempt + 1,
            'sin tenantId, user_id:',
            session.user.id
          );
        }

        if (attempt < TENANT_RESOLVE_ATTEMPTS - 1) {
          await delay(TENANT_RESOLVE_RETRY_DELAY_MS);
        }
      }

      if (import.meta.env.DEV) {
        console.warn('[AuthContext] tenant resolve agotó reintentos, user_id:', session.user.id);
      }

      return lastResolved ?? buildUserFromSession(session.user);
    },
    [resolveUser]
  );

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
          const resolved = await resolveUserWithRetry(session);
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
    [resolveUserWithRetry, applyUser, fetchSubscription]
  );

  const refetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        applyUser(null);
        return false;
      }
      setIsTenantResolving(true);
      const resolvedUser = await resolveUserWithRetry(session);
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
  }, [resolveUserWithRetry, applyUser, fetchSubscription]);

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
            applyUser(buildUserFromSession(session.user));
            resolveTenantInBackground(session);
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
  }, [applyUser, resolveTenantInBackground]);

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
