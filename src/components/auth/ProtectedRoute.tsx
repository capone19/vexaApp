import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);
  const location = useLocation();
  const initialCheckDone = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkTenant = async (userId: string) => {
      try {
        const { data: tenantId, error } = await supabase.rpc('get_user_tenant_id');
        if (error) {
          console.warn('[ProtectedRoute] Error getting tenant:', error);
        }
        return !!tenantId;
      } catch (e) {
        console.error('[ProtectedRoute] Exception getting tenant:', e);
        return false;
      }
    };

    // Check initial session first
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          setIsAuthenticated(true);
          const hasTenantResult = await checkTenant(session.user.id);
          if (isMounted) {
            setHasTenant(hasTenantResult);
          }
        } else {
          setIsAuthenticated(false);
          setHasTenant(null);
        }
      } catch (e) {
        console.error('[ProtectedRoute] Init error:', e);
        if (isMounted) {
          setIsAuthenticated(false);
          setHasTenant(null);
        }
      } finally {
        if (isMounted) {
          initialCheckDone.current = true;
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if initial check hasn't completed yet to avoid race condition
        if (!initialCheckDone.current) return;
        if (!isMounted) return;

        console.log('[ProtectedRoute] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setHasTenant(null);
        } else if (session?.user) {
          setIsAuthenticated(true);
          const hasTenantResult = await checkTenant(session.user.id);
          if (isMounted) {
            setHasTenant(hasTenantResult);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User is authenticated but has no tenant - redirect to pending setup
  if (hasTenant === false) {
    return <Navigate to="/pending-setup" replace />;
  }

  return <>{children}</>;
}
