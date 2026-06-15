import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthReady, isTenantResolving, isAuthenticated, user, isAdmin } = useAuthContext();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  // Mostrar loader mientras auth/tenant aún se resuelve
  if (isLoading || !isAuthReady || (isAuthenticated && isTenantResolving)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No autenticado → redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Sin tenant: solo redirigir cuando la resolución de tenant terminó
  if (isAuthReady && !isTenantResolving && !user?.tenantId && (!isAdmin || !isImpersonating)) {
    return <Navigate to="/cuenta-pendiente" replace />;
  }

  // Autenticado y con tenant (real o impersonado) → mostrar contenido
  return <>{children}</>;
}
