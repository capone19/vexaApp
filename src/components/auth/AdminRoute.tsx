import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuthContext();

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
    return <Navigate to="/auth" replace />;
  }

  // No es admin → redirigir a home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Es admin → mostrar contenido
  return <>{children}</>;
}
