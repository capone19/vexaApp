import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Lock, 
  MessageSquare,
  BarChart3,
  Megaphone,
  UserX,
  ShoppingCart,
  Bot,
  ArrowRight,
  Sparkles,
  Crown,
  CheckCircle,
  Plus,
  Check,
  X,
  FileText,
  Calendar,
  Loader2
} from 'lucide-react';
import { type PlanId } from '@/lib/plan';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useTenantReports } from '@/hooks/use-tenant-reports';

// Definición de reportes
interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
  price: number; // 0 = incluido en plan, >0 = precio adicional
  includedIn: PlanId[]; // planes donde está incluido gratis
  isPremiumAddon: boolean; // si es un addon de pago
}

const reportTypes: ReportType[] = [
  {
    id: 'agent-performance',
    title: 'Análisis de rendimiento del agente',
    description: 'Métricas de tiempos de respuesta, tasas de resolución, satisfacción y eficiencia del bot.',
    icon: Bot,
    frequency: 'Semanal',
    price: 0,
    includedIn: ['basic', 'pro', 'enterprise'], // Incluido en TODOS los planes
    isPremiumAddon: false,
  },
  {
    id: 'conversational-metrics',
    title: 'Analítica de métricas conversacionales',
    description: 'Insights profundos sobre patrones de conversación, preguntas frecuentes y puntos de fricción.',
    icon: MessageSquare,
    frequency: 'Semanal',
    price: 0,
    includedIn: ['pro', 'enterprise'], // Incluido en Pro y Enterprise
    isPremiumAddon: false,
  },
  {
    id: 'unconverted-leads',
    title: 'Clientes potenciales no convertidos',
    description: 'Análisis de leads que no llegaron a conversión, razones de abandono y oportunidades de mejora.',
    icon: UserX,
    frequency: 'Semanal',
    price: 9,
    includedIn: ['enterprise'], // Solo incluido en Enterprise
    isPremiumAddon: true,
  },
  {
    id: 'converted-sales',
    title: 'Clientes convertidos (ventas)',
    description: 'Reporte detallado de conversiones, ticket promedio, servicios más vendidos y tendencias.',
    icon: ShoppingCart,
    frequency: 'Semanal',
    price: 9,
    includedIn: [], // No incluido en ningún plan, siempre es addon
    isPremiumAddon: true,
  },
  {
    id: 'meta-ads',
    title: 'Marketing / Campañas Meta Ads',
    description: 'Rendimiento de campañas publicitarias, ROAS, CPA, alcance y métricas de conversión.',
    icon: Megaphone,
    frequency: 'Semanal',
    price: 9,
    includedIn: [], // No incluido en ningún plan, siempre es addon
    isPremiumAddon: true,
  },
  {
    id: 'ad-advisor',
    title: 'Asesor publicitario',
    description: 'Recomendaciones personalizadas de IA para optimizar tu inversión publicitaria y mejorar resultados.',
    icon: Sparkles,
    frequency: 'Semanal',
    price: 29,
    includedIn: [], // No incluido en ningún plan, siempre es addon
    isPremiumAddon: true,
  },
];

const Reports = () => {
  const navigate = useNavigate();
  const { plan: currentPlan, purchasedAddons, isLoading } = useTenantReports();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Check if a report is available for the current user
  const isReportAvailable = (report: ReportType): boolean => {
    // Incluido en el plan actual
    if (report.includedIn.includes(currentPlan)) return true;
    // Comprado como addon
    if (purchasedAddons.includes(report.id)) return true;
    return false;
  };

  // Check if report is included in current plan (free)
  const isIncludedInPlan = (report: ReportType): boolean => {
    return report.includedIn.includes(currentPlan);
  };

  // Get the label for the report status
  const getReportStatus = (report: ReportType): { label: string; variant: 'included' | 'addon' | 'locked' } => {
    if (isIncludedInPlan(report)) {
      return { label: 'Incluido', variant: 'included' };
    }
    if (purchasedAddons.includes(report.id)) {
      return { label: 'Activo', variant: 'included' };
    }
    if (report.price > 0) {
      return { label: `+$${report.price}/mes`, variant: 'addon' };
    }
    return { label: 'Bloqueado', variant: 'locked' };
  };

  // Get minimum plan required for a report
  const getMinimumPlan = (report: ReportType): string | null => {
    if (report.includedIn.includes('basic')) return null;
    if (report.includedIn.includes('pro')) return 'Pro';
    if (report.includedIn.includes('enterprise')) return 'Enterprise';
    return null;
  };

  const handleReportClick = (report: ReportType) => {
    if (isReportAvailable(report)) {
      // Abrir el reporte (en el futuro, navegar a la vista del reporte)
      toast.success(`Abriendo ${report.title}...`);
    } else {
      // Si es addon, ir al checkout; si requiere plan superior, mostrar modal
      if (report.isPremiumAddon && report.price > 0) {
        navigate(`/reportes/checkout/${report.id}`);
      } else {
        // Requiere plan superior
        setSelectedReport(report);
        setIsDialogOpen(true);
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reportes"
          subtitle="Análisis avanzados e insights de tu negocio"
        />

        {/* Current Plan Info */}
        <Card className={cn(
          "border-2",
          currentPlan === 'basic' ? "border-border bg-secondary/30" :
          currentPlan === 'pro' ? "border-primary/30 bg-primary/5" :
          "border-amber-500/30 bg-amber-50"
        )}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  currentPlan === 'basic' ? "bg-secondary" :
                  currentPlan === 'pro' ? "bg-primary/20" :
                  "bg-amber-500/20"
                )}>
                  {currentPlan === 'basic' ? (
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  ) : currentPlan === 'pro' ? (
                    <Crown className="h-6 w-6 text-primary" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Plan {currentPlan === 'basic' ? 'Básico' : currentPlan === 'pro' ? 'Pro' : 'Enterprise'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {currentPlan === 'basic' && "1 reporte incluido. Agrega más según tu necesidad."}
                    {currentPlan === 'pro' && "2 reportes incluidos. Acceso a reportes avanzados."}
                    {currentPlan === 'enterprise' && "3 reportes incluidos. Máxima analítica disponible."}
                  </p>
                </div>
              </div>
              {currentPlan === 'basic' && (
                <Button className="gap-2 shrink-0" onClick={() => navigate('/facturacion')}>
                  <Sparkles className="h-4 w-4" />
                  Actualizar Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const available = isReportAvailable(report);
            const status = getReportStatus(report);
            const minPlan = getMinimumPlan(report);
            
            return (
              <Card 
                key={report.id}
                className={cn(
                  "relative overflow-hidden transition-all cursor-pointer",
                  available 
                    ? "border-border hover:border-primary/50 hover:shadow-md" 
                    : "border-border"
                )}
                onClick={() => handleReportClick(report)}
              >
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {status.variant === 'included' ? (
                    <Badge className="bg-success/10 text-success border-success/30 gap-1">
                      <Check className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  ) : status.variant === 'addon' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1">
                      <Plus className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-secondary text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      {minPlan}
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    available ? "bg-primary/10" : "bg-secondary"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      available ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <CardTitle className={cn("text-base pr-20", !available && "text-muted-foreground")}>
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={!available ? 'opacity-50' : ''}>
                      {report.frequency}
                    </Badge>
                    {available ? (
                      <Button variant="ghost" size="sm" className="text-primary gap-1">
                        Ver reporte
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-amber-600 gap-1">
                        {report.price > 0 ? 'Agregar' : 'Desbloquear'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Weekly Reports Section */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Reportes Semanales</CardTitle>
                  <CardDescription>
                    Historial de reportes generados automáticamente cada semana
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Empty state - no reports yet */}
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aún no hay reportes generados</p>
                <p className="text-xs mt-1">Los reportes se generan automáticamente cada semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Compara Planes - Reportes Incluidos</CardTitle>
            <CardDescription>
              Cada plan incluye diferentes reportes. Puedes agregar más como addons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Reporte</th>
                    <th className="text-center py-3 px-2 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline">Básico</Badge>
                        <span className="text-xs text-muted-foreground">$99/mes</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className="bg-primary">Pro</Badge>
                        <span className="text-xs text-muted-foreground">$199/mes</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className="bg-amber-500">Enterprise</Badge>
                        <span className="text-xs text-muted-foreground">$499/mes</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <span className="text-muted-foreground">Addon</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportTypes.map((report) => (
                    <tr key={report.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <report.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className={cn(isMobile && "text-xs")}>{report.title}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        {report.includedIn.includes('basic') ? (
                          <CheckCircle className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {report.includedIn.includes('pro') || report.includedIn.includes('basic') ? (
                          <CheckCircle className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {report.includedIn.includes('enterprise') || report.includedIn.includes('pro') || report.includedIn.includes('basic') ? (
                          <CheckCircle className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {report.price > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            +${report.price}/mes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Nota:</strong> Todos los reportes se generan semanalmente. 
                Los addons se suman al costo de tu plan mensual. 
                El <strong>Asesor publicitario</strong> incluye recomendaciones personalizadas de IA.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && <selectedReport.icon className="h-5 w-5 text-primary" />}
              {selectedReport?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4 py-4">
              {/* Si el reporte requiere un plan superior */}
              {!selectedReport.isPremiumAddon && getMinimumPlan(selectedReport) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Este reporte está incluido en el plan <strong>{getMinimumPlan(selectedReport)}</strong> o superior.
                  </p>
                  <Button 
                    className="mt-3 w-full" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      navigate('/facturacion');
                    }}
                  >
                    Ver planes disponibles
                  </Button>
                </div>
              )}

              {/* Si el reporte es un addon de pago */}
              {selectedReport.isPremiumAddon && selectedReport.price > 0 && (
                <>
                  {/* Check if included in higher plan */}
                  {selectedReport.includedIn.length > 0 && !selectedReport.includedIn.includes(currentPlan) && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 Este reporte está <strong>incluido gratis</strong> en el plan {selectedReport.includedIn.includes('pro') ? 'Pro' : 'Enterprise'}.
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Costo mensual adicional</span>
                      <span className="text-2xl font-bold">${selectedReport.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se suma a tu plan actual. Puedes cancelar en cualquier momento.
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      navigate(`/reportes/checkout/${selectedReport.id}`);
                    }}
                  >
                    Agregar por ${selectedReport.price}/mes
                  </Button>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Reports;
