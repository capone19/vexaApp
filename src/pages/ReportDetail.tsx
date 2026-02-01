import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  Eye,
  MessageSquare,
  Megaphone,
  UserX,
  ShoppingCart,
  Bot,
  Sparkles,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { useTenantReports } from '@/hooks/use-tenant-reports';
import { useGeneratedReports, type GeneratedReport } from '@/hooks/use-generated-reports';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Mapeo de tipos de reporte a información
const REPORT_INFO: Record<string, {
  title: string;
  description: string;
  icon: React.ElementType;
}> = {
  'agent-performance': {
    title: 'Análisis de rendimiento del agente',
    description: 'Métricas de tiempos de respuesta, tasas de resolución, satisfacción y eficiencia del bot.',
    icon: Bot,
  },
  'conversational-metrics': {
    title: 'Analítica de métricas conversacionales',
    description: 'Insights profundos sobre patrones de conversación, preguntas frecuentes y puntos de fricción.',
    icon: MessageSquare,
  },
  'unconverted-leads': {
    title: 'Clientes potenciales no convertidos',
    description: 'Análisis de leads que no llegaron a conversión, razones de abandono y oportunidades de mejora.',
    icon: UserX,
  },
  'converted-sales': {
    title: 'Clientes convertidos (ventas)',
    description: 'Reporte detallado de conversiones, ticket promedio, servicios más vendidos y tendencias.',
    icon: ShoppingCart,
  },
  'meta-ads': {
    title: 'Marketing / Campañas Meta Ads',
    description: 'Rendimiento de campañas publicitarias, ROAS, CPA, alcance y métricas de conversión.',
    icon: Megaphone,
  },
  'ad-advisor': {
    title: 'Asesor publicitario',
    description: 'Recomendaciones personalizadas de IA para optimizar tu inversión publicitaria y mejorar resultados.',
    icon: Sparkles,
  },
};

const ReportDetail = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { plan: currentPlan, purchasedAddons } = useTenantReports();
  const { reports, isLoading, markAsDownloaded } = useGeneratedReports(reportId);
  
  const [viewingReport, setViewingReport] = useState<GeneratedReport | null>(null);

  if (!reportId || !REPORT_INFO[reportId]) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Reporte no encontrado</h1>
          <p className="text-muted-foreground mb-6">El tipo de reporte especificado no existe.</p>
          <Button onClick={() => navigate('/reportes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Reportes
          </Button>
        </div>
      </MainLayout>
    );
  }

  const reportInfo = REPORT_INFO[reportId];
  const Icon = reportInfo.icon;

  // Verificar si el usuario tiene acceso a este reporte
  const hasAccess = 
    reportId === 'agent-performance' || // Incluido en todos los planes
    (reportId === 'conversational-metrics' && (currentPlan === 'pro' || currentPlan === 'enterprise')) ||
    (reportId === 'unconverted-leads' && (currentPlan === 'enterprise' || purchasedAddons.includes(reportId))) ||
    purchasedAddons.includes(reportId);

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acceso no disponible</h1>
          <p className="text-muted-foreground mb-6">
            Este reporte no está incluido en tu plan actual.
          </p>
          <Button onClick={() => navigate('/reportes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Reportes
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleView = (report: GeneratedReport) => {
    if (report.html_content) {
      setViewingReport(report);
    } else if (report.file_url) {
      // Si no hay HTML pero hay URL, abrir en nueva pestaña
      window.open(report.file_url, '_blank');
    } else {
      toast.error('Este reporte no tiene contenido para visualizar');
    }
  };

  const handleDownload = async (report: GeneratedReport) => {
    try {
      // Marcar como descargado
      await markAsDownloaded(report.id);

      if (report.html_content) {
        // Descargar el HTML como archivo
        const blob = new Blob([report.html_content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = report.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (report.file_url) {
        // Descargar desde URL
        const link = document.createElement('a');
        link.href = report.file_url;
        link.download = report.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('[ReportDetail] Error downloading:', error);
      toast.error('Error al descargar el reporte');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatPeriod = (start: string, end: string) => {
    try {
      const startDate = format(new Date(start), "d MMM", { locale: es });
      const endDate = format(new Date(end), "d MMM yyyy", { locale: es });
      return `${startDate} - ${endDate}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reportes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={reportInfo.title}
            subtitle={reportInfo.description}
          />
        </div>

        {/* Resumen del reporte */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Resumen</CardTitle>
                <CardDescription>
                  Historial de reportes generados para este tipo de análisis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total de reportes</span>
                </div>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Descargados</span>
                </div>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.download_count > 0).length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Último reporte</span>
                </div>
                <p className="text-sm font-medium">
                  {reports.length > 0 
                    ? formatDate(reports[0].created_at)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de reportes */}
        <Card>
          <CardHeader>
            <CardTitle>Reportes Disponibles</CardTitle>
            <CardDescription>
              Descarga los reportes generados para este análisis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aún no hay reportes generados</p>
                <p className="text-xs mt-1">
                  Los reportes se generan automáticamente cada semana
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      "hover:bg-secondary/50 transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{report.file_name}</p>
                          {report.status === 'downloaded' && (
                            <Badge variant="outline" className="text-xs">
                              Descargado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatPeriod(report.period_start, report.period_end)}
                          </span>
                          {report.file_size && (
                            <span>
                              {(report.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                          {report.download_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {report.download_count} vez{report.download_count > 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleView(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Información del Reporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Frecuencia de generación</p>
                <p className="text-muted-foreground">Semanal - Los reportes se generan automáticamente cada lunes</p>
              </div>
              <div>
                <p className="font-medium mb-1">Formato</p>
                <p className="text-muted-foreground">HTML interactivo con gráficos, tablas y análisis detallados</p>
              </div>
              <div>
                <p className="font-medium mb-1">Período cubierto</p>
                <p className="text-muted-foreground">
                  Cada reporte cubre la semana anterior (lunes a domingo)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para visualizar el reporte HTML */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] w-full max-h-[90vh] sm:max-h-[95vh] h-[90vh] sm:h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-3 sm:px-4 py-2 sm:py-3 border-b flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base truncate max-w-[60%] sm:max-w-none">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span className="truncate">{viewingReport?.file_name}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {viewingReport && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => handleDownload(viewingReport)}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Descargar</span>
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {viewingReport?.html_content && (
              <iframe
                srcDoc={viewingReport.html_content}
                className="w-full h-full border-0"
                title={viewingReport.file_name}
                sandbox="allow-scripts allow-same-origin"
                style={{ minHeight: '100%' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ReportDetail;
