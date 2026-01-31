import { useVexaAdsAccess } from '@/hooks/use-vexa-ads-access';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface VexaAdsRouteProps {
  children: React.ReactNode;
}

/**
 * Ruta protegida que solo permite acceso si el tenant tiene vexa_ads_enabled = true
 * Muestra una pantalla de contacto para usuarios sin acceso
 */
export function VexaAdsRoute({ children }: VexaAdsRouteProps) {
  const { hasAccess, isLoading } = useVexaAdsAccess();
  const navigate = useNavigate();
  
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
  
  // Si tiene acceso, mostrar el contenido
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Si no tiene acceso, mostrar pantalla de upgrade
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-primary/30 bg-primary/5">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                VEXA Ads
              </h2>
              <p className="text-muted-foreground text-sm">
                El módulo <strong>VEXA Ads</strong> está disponible bajo solicitud. 
                Potencia tus campañas publicitarias con inteligencia artificial.
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Incluido en VEXA Ads:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>• Diagnóstico automático de campañas</li>
                <li>• Estrategia personalizada con IA</li>
                <li>• Generación de creativos</li>
                <li>• Análisis de performance</li>
                <li>• Recomendaciones en tiempo real</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                className="w-full"
                onClick={() => navigate('/soporte')}
              >
                <Lock className="h-4 w-4 mr-2" />
                Solicitar acceso
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Volver al Dashboard
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Contacta a tu ejecutivo de cuenta para activar este módulo
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
