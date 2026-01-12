import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveUser = useCallback(async (session: { user: any } | null) => {
    if (!session?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const supaUser = session.user;

    try {
      // Prefer RPC (Security Definer) to avoid any RLS edge cases when fetching tenant_id
      const [{ data: tenantIdRpc, error: tenantErr }, { data: userRole, error: roleErr }] = await Promise.all([
        supabase.rpc('get_user_tenant_id'),
        supabase
          .from('user_roles')
          .select('tenant_id, role')
          .eq('user_id', supaUser.id)
          .single(),
      ]);

      if (tenantErr) {
        console.warn('[useAuth] get_user_tenant_id RPC error:', tenantErr);
      }
      if (roleErr) {
        console.warn('[useAuth] user_roles fetch error:', roleErr);
      }

      const tenantId = (tenantIdRpc as string | null) ?? userRole?.tenant_id ?? null;

      setUser({
        id: supaUser.id,
        email: supaUser.email || '',
        name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuario',
        role: userRole?.role || 'viewer',
        tenantId,
      });
    } catch (error) {
      console.error('[useAuth] Error resolving user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state changed:', event);
        
        // Handle session refresh - Supabase automatically refreshes tokens
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          await resolveUser(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        } else {
          await resolveUser(session);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await resolveUser(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveUser]);

  return { user, isLoading };
}
