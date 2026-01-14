import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/shared/Logo';
import { Clock, Mail, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export default function PendingSetup() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Si el usuario ya tiene tenant, redirigir al dashboard
  useEffect(() => {
    if (!isLoading && user?.tenantId) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/auth');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <Card className="max-w-md w-full shadow-xl border-border">
        <CardContent className="p-8 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <Logo variant="full" color="dark" className="h-10" />
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-amber-100">
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Configuración Pendiente
            </h1>
            <p className="text-muted-foreground">
              Tu cuenta ha sido creada exitosamente. Nuestro equipo técnico está preparando tu espacio de trabajo.
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">¿Qué sigue?</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Recibirás un correo cuando tu cuenta esté lista</li>
                  <li>• El proceso toma menos de 24 horas hábiles</li>
                  <li>• Puedes contactar a soporte si tienes dudas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* User info */}
          {user && (
            <p className="text-sm text-muted-foreground">
              Conectado como: <span className="font-medium">{user.email}</span>
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleRefresh} className="w-full">
              Verificar estado
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
