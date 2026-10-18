import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthReady, isAuthenticated } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  const shouldRedirect = !(isLoading || !isAuthReady) && !isAuthenticated;

  // No autenticado → redirigir a login
  useEffect(() => {
    if (!shouldRedirect) return;
    const from = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(`/auth?from=${encodeURIComponent(from)}`);
  }, [shouldRedirect, pathname, router]);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Autenticado y con tenant (real o impersonado) → mostrar contenido
  return <>{children}</>;
}
