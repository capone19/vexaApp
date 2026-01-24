import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, hasTenant, isAdmin } = useAuthContext();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  // Mostrar loader solo durante la carga inicial
  if (isLoading) {
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

  // Autenticado pero sin tenant → verificar si es admin impersonando
  // Si es admin impersonando, permitir acceso (para ver dashboard del cliente)
  // Si no es admin o no está impersonando, bloquear (usuarios normales sin tenant)
  if (!hasTenant && (!isAdmin || !isImpersonating)) {
    return <Navigate to="/auth" replace />;
  }

  // Autenticado y con tenant (real o impersonado) → mostrar contenido
  return <>{children}</>;
}
