import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, hasTenant } = useAuthContext();
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

  // Autenticado pero sin tenant → redirigir a pending setup
  if (!hasTenant) {
    return <Navigate to="/pending-setup" replace />;
  }

  // Autenticado y con tenant → mostrar contenido
  return <>{children}</>;
}
