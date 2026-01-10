import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch additional user data from user_roles
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('tenant_id, role')
            .eq('user_id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
            role: userRole?.role || 'viewer',
            tenantId: userRole?.tenant_id || null,
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('tenant_id, role')
          .eq('user_id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
          role: userRole?.role || 'viewer',
          tenantId: userRole?.tenant_id || null,
        });
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
