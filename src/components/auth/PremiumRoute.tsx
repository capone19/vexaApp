import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/use-subscription';
import { Loader2, Lock, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PlanId } from '@/lib/plan';

interface PremiumRouteProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * Ruta protegida que solo permite acceso a planes pro/enterprise
 * Muestra una pantalla de upgrade para usuarios con plan básico
 */
export function PremiumRoute({ children, feature = 'esta función' }: PremiumRouteProps) {
  const { subscription, isLoading } = useSubscription();
  
  // Mientras carga, mostrar loader
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }
  
  const currentPlan: PlanId = (subscription?.plan as PlanId) || 'basic';
  const isPremium = currentPlan === 'pro' || currentPlan === 'enterprise';
  
  // Si tiene plan premium, mostrar el contenido
  if (isPremium) {
    return <>{children}</>;
  }
  
  // Si no tiene plan premium, mostrar pantalla de upgrade
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-warning/30 bg-warning/5">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-warning" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Función Premium
              </h2>
              <p className="text-muted-foreground text-sm">
                {feature} está disponible únicamente en los planes <strong>Pro</strong> y <strong>Enterprise</strong>.
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Incluido en Plan Pro:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>• Hasta 1,000 conversaciones/mes</li>
                <li>• Módulo de WhatsApp Marketing</li>
                <li>• 3 números de WhatsApp conectados</li>
                <li>• Reportes avanzados</li>
              </ul>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => window.location.href = '/facturacion'}
            >
              <Zap className="h-4 w-4 mr-2" />
              Ver planes disponibles
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Contacta a soporte para actualizar tu plan
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
