import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthReady, isAuthenticated } = useAuthContext();
  const location = useLocation();

  // Mostrar loader mientras auth aún se resuelve
  if (isLoading || !isAuthReady) {
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

  // Autenticado y con tenant (real o impersonado) → mostrar contenido
  return <>{children}</>;
}
