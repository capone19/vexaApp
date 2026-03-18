import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { logout } from "@/lib/auth";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";

/**
 * Usuario autenticado en Supabase pero sin fila en user_roles / tenant.
 * El onboarding es manual (setup_new_client en admin). Evita bucle /auth ↔ /.
 */
export default function PendingAccount() {
  const { isLoading, isAuthenticated, hasTenant, user } = useAuthContext();

  useEffect(() => {
    document.title = "Cuenta pendiente | VEXA";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (hasTenant) {
    return <Navigate to="/" replace />;
  }
  if (user?.email && isAdminEmail(user.email)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl shadow-lg p-8 text-center space-y-6">
        <Logo variant="full" color="dark" className="h-10 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Cuenta en activación</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tu correo <span className="font-medium text-foreground">{user?.email}</span> está
            registrado, pero aún no tiene un espacio de trabajo asignado. El equipo de VEXA debe
            completar el alta (tenant) antes de que puedas usar el panel.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <a
            href="mailto:soporte@vexa.io"
            className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            Contactar soporte
          </a>
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
