// ============================================
// VEXA - Página de Checkout para Reportes
// ============================================
// Placeholder para integración con Mercado Pago
// ============================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  Check, 
  Loader2,
  Bot,
  MessageSquare,
  UserX,
  ShoppingCart,
  Megaphone,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { useTenantReports } from '@/hooks/use-tenant-reports';

// Información de reportes (sincronizada con Reports.tsx)
const REPORT_INFO: Record<string, { 
  title: string; 
  description: string; 
  icon: React.ElementType;
  price: number;
}> = {
  'agent-performance': {
    title: 'Análisis de rendimiento del agente',
    description: 'Métricas de tiempos de respuesta, tasas de resolución, satisfacción y eficiencia del bot.',
    icon: Bot,
    price: 9,
  },
  'conversational-metrics': {
    title: 'Analítica de métricas conversacionales',
    description: 'Insights profundos sobre patrones de conversación, preguntas frecuentes y puntos de fricción.',
    icon: MessageSquare,
    price: 9,
  },
  'unconverted-leads': {
    title: 'Clientes potenciales no convertidos',
    description: 'Análisis de leads que no llegaron a conversión, razones de abandono y oportunidades de mejora.',
    icon: UserX,
    price: 9,
  },
  'converted-sales': {
    title: 'Clientes convertidos (ventas)',
    description: 'Reporte detallado de conversiones, ticket promedio, servicios más vendidos y tendencias.',
    icon: ShoppingCart,
    price: 9,
  },
  'meta-ads': {
    title: 'Marketing / Campañas Meta Ads',
    description: 'Rendimiento de campañas publicitarias, ROAS, CPA, alcance y métricas de conversión.',
    icon: Megaphone,
    price: 9,
  },
  'ad-advisor': {
    title: 'Asesor publicitario',
    description: 'Recomendaciones personalizadas de IA para optimizar tu inversión publicitaria y mejorar resultados.',
    icon: Sparkles,
    price: 29,
  },
};

export default function ReportCheckout() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useEffectiveTenant();
  const { purchasedAddons, refetch } = useTenantReports();
  const [isProcessing, setIsProcessing] = useState(false);

  // Obtener info del reporte
  const report = reportId ? REPORT_INFO[reportId] : null;
  
  if (!report || !reportId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h1 className="text-2xl font-bold mb-4">Reporte no encontrado</h1>
          <Button onClick={() => navigate('/reportes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Reportes
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Verificar si ya está comprado
  const alreadyPurchased = purchasedAddons.includes(reportId);

  if (alreadyPurchased) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-success/10 mb-4">
            <Check className="h-12 w-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">¡Ya tienes este reporte!</h1>
          <p className="text-muted-foreground mb-6">{report.title} está activo en tu cuenta</p>
          <Button onClick={() => navigate('/reportes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Reportes
          </Button>
        </div>
      </MainLayout>
    );
  }

  const Icon = report.icon;

  const handlePayment = async () => {
    if (!tenantId) {
      toast.error('No se pudo identificar tu cuenta');
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Integrar con Mercado Pago aquí
      // Por ahora, simular el proceso de pago

      // Insertar el addon como activo (placeholder - en producción esto lo haría el webhook de pago)
      const { error } = await supabase
        .from('tenant_addons')
        .insert({
          tenant_id: tenantId,
          addon_id: reportId,
          price_usd: report.price,
          status: 'active',
          activated_at: new Date().toISOString(),
        });

      if (error) {
        // Si ya existe, puede ser un conflicto
        if (error.code === '23505') {
          toast.error('Este reporte ya está activo en tu cuenta');
        } else {
          throw error;
        }
      } else {
        toast.success(`${report.title} activado correctamente`);
        await refetch();
        navigate('/reportes');
      }
    } catch (err) {
      console.error('[ReportCheckout] Error:', err);
      toast.error('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/reportes')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Reportes
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto p-4 rounded-xl bg-primary/10 w-fit mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{report.title}</CardTitle>
            <CardDescription className="text-base">
              {report.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              <h3 className="font-medium">Incluye:</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  Reportes semanales automatizados
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  Envío directo a tu email
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  Acceso al historial de reportes
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  Cancela cuando quieras
                </li>
              </ul>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Precio mensual</span>
              <div className="text-right">
                <span className="text-3xl font-bold">${report.price}</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
            </div>

            <Separator />

            {/* Security badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
              <Shield className="h-4 w-4" />
              <span>Pago seguro procesado por Mercado Pago</span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              className="w-full h-12 text-base gap-2"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Pagar ${report.price}/mes con Mercado Pago
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Al continuar, aceptas los términos de servicio. 
              El cargo se realizará mensualmente hasta que canceles.
            </p>
          </CardFooter>
        </Card>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <Badge variant="outline" className="text-xs">
            💡 Este cargo se sumará a tu factura mensual
          </Badge>
        </div>
      </div>
    </MainLayout>
  );
}
