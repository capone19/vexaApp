import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  DollarSign,
  BarChart3,
  PieChart,
  ArrowRight,
  Sparkles,
  Crown,
  CheckCircle
} from 'lucide-react';
import { isPremiumPlan, onPlanChange, getCurrentPlan, type PlanId } from '@/lib/plan';

const reportTypes = [
  {
    id: 'performance',
    title: 'Rendimiento del Agente',
    description: 'Análisis detallado de tiempos de respuesta, tasas de resolución y satisfacción.',
    icon: TrendingUp,
    frequency: 'Semanal',
    requiresPremium: false, // Always available
  },
  {
    id: 'conversations',
    title: 'Análisis de Conversaciones',
    description: 'Insights sobre patrones de conversación, preguntas frecuentes y puntos de fricción.',
    icon: MessageSquare,
    frequency: 'Semanal',
    requiresPremium: true,
  },
  {
    id: 'funnel',
    title: 'Reporte de Funnel',
    description: 'Análisis profundo del embudo de conversión con recomendaciones de mejora.',
    icon: BarChart3,
    frequency: 'Mensual',
    requiresPremium: true,
  },
  {
    id: 'revenue',
    title: 'Impacto en Ingresos',
    description: 'ROI del agente, ingresos generados y proyecciones de crecimiento.',
    icon: DollarSign,
    frequency: 'Mensual',
    requiresPremium: true,
  },
  {
    id: 'whatsapp',
    title: 'Rendimiento WhatsApp',
    description: 'Métricas detalladas de rendimiento del funnel de ventas por WhatsApp.',
    icon: PieChart,
    frequency: 'Semanal',
    requiresPremium: true,
  },
  {
    id: 'customers',
    title: 'Segmentación de Clientes',
    description: 'Análisis de comportamiento, preferencias y valor de vida del cliente.',
    icon: Users,
    frequency: 'Mensual',
    requiresPremium: true,
  },
];

const scheduledReports = [
  { name: 'Rendimiento Semanal', nextDate: 'Lunes 10:00', enabled: true },
  { name: 'Resumen Mensual', nextDate: '1 de cada mes', enabled: false },
];

const Reports = () => {
  const navigate = useNavigate();
  const [hasPremium, setHasPremium] = useState(isPremiumPlan());
  const [currentPlan, setCurrentPlanState] = useState<PlanId>(getCurrentPlan());

  // Listen for plan changes
  useEffect(() => {
    const unsubscribe = onPlanChange((plan) => {
      setHasPremium(isPremiumPlan());
      setCurrentPlanState(plan);
    });
    return unsubscribe;
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reportes"
          subtitle="Análisis avanzados e insights de tu agente"
        />

        {/* Upgrade Banner - Only show if not premium */}
        {!hasPremium && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Desbloquea Reportes Avanzados
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Obtén insights profundos sobre el rendimiento de tu agente, 
                      análisis de conversaciones con IA y reportes automáticos programados.
                    </p>
                  </div>
                </div>
                <Button className="gap-2 shrink-0" onClick={() => navigate('/facturacion')}>
                  <Sparkles className="h-4 w-4" />
                  Actualizar a Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium Success Banner - Show when premium */}
        {hasPremium && (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/20">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 text-success">
                    Plan {currentPlan === 'pro' ? 'Pro' : 'Enterprise'} Activo
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Tienes acceso a todos los reportes avanzados, exportación de datos y reportes programados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isLocked = report.requiresPremium && !hasPremium;
            
            return (
              <Card 
                key={report.id}
                className={`relative overflow-hidden transition-all ${
                  isLocked 
                    ? 'border-border opacity-75' 
                    : 'border-border hover:border-primary/50 hover:shadow-md cursor-pointer'
                }`}
              >
                {isLocked && (
                  <div className="absolute top-3 right-3">
                    <div className="p-1.5 rounded-full bg-secondary">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isLocked ? 'bg-secondary' : 'bg-primary/10'
                  }`}>
                    <Icon className={`h-5 w-5 ${isLocked ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={isLocked ? 'opacity-50' : ''}>
                      {report.frequency}
                    </Badge>
                    {isLocked ? (
                      <Button variant="ghost" size="sm" className="text-primary gap-1" disabled>
                        <Lock className="h-3.5 w-3.5" />
                        Pro
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-primary gap-1">
                        Ver
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Scheduled Reports Section */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasPremium ? 'bg-primary/10' : 'bg-secondary'}`}>
                  <Calendar className={`h-5 w-5 ${hasPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Reportes Programados
                    {!hasPremium && (
                      <div className="p-1 rounded-full bg-secondary">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Recibe reportes automáticos en tu correo
                  </CardDescription>
                </div>
              </div>
              {!hasPremium && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Pro
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`space-y-3 ${!hasPremium ? 'opacity-50' : ''}`}>
              {scheduledReports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{report.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{report.nextDate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasPremium ? 'bg-primary/10' : 'bg-secondary'}`}>
                <Download className={`h-5 w-5 ${hasPremium ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Exportación de Datos
                  {!hasPremium && (
                    <div className="p-1 rounded-full bg-muted/50">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  Descarga tus datos en formatos CSV, Excel o PDF
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex flex-wrap gap-2 ${!hasPremium ? 'opacity-50' : ''}`}>
              <Button variant="outline" size="sm" disabled={!hasPremium}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Chats
              </Button>
              <Button variant="outline" size="sm" disabled={!hasPremium}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Citas
              </Button>
              <Button variant="outline" size="sm" disabled={!hasPremium}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Métricas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Comparison - Only show if not premium */}
        {!hasPremium && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Compara Planes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Básico</Badge>
                    {currentPlan === 'basic' && (
                      <span className="text-sm text-muted-foreground">Tu plan actual</span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Dashboard básico
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Métricas en tiempo real
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                      1 reporte básico
                    </li>
                  </ul>
                </div>

                {/* Pro */}
                <div className="space-y-4 p-4 -m-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary">Pro</Badge>
                    <span className="text-sm text-primary">Recomendado</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Todo del plan Básico
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      6 tipos de reportes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Reportes programados
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Exportación de datos
                    </li>
                  </ul>
                </div>

                {/* Enterprise */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Enterprise</Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Todo del plan Pro
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Reportes personalizados
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      API de datos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Soporte prioritario
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Reports;
