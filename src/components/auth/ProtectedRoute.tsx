import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session);
        
        if (session?.user) {
          // Check if user has a tenant assigned
          const { data: tenantId } = await supabase.rpc('get_user_tenant_id');
          setHasTenant(!!tenantId);
        } else {
          setHasTenant(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        const { data: tenantId } = await supabase.rpc('get_user_tenant_id');
        setHasTenant(!!tenantId);
      }
      
      setIsLoading(false);
    });

    return () => {
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
