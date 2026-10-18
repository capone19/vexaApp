import { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  
  const [viewingReport, setViewingReport] = useState<GeneratedReport | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [iframeWidth, setIframeWidth] = useState<number | null>(null);

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

  // Calcular dinámicamente el ancho del contenedor del iframe
  useEffect(() => {
    if (!iframeContainerRef.current || !viewingReport) {
      setIframeWidth(null);
      return;
    }
    
    const updateWidth = () => {
      // Intentar obtener el ancho del contenedor del iframe
      const container = iframeContainerRef.current;
      if (container) {
        // Usar getBoundingClientRect para obtener el ancho real
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        // Solo actualizar si el ancho es válido y mayor a 0
        if (width > 0 && width !== iframeWidth) {
          setIframeWidth(Math.floor(width));
        }
      }
    };
    
    // Calcular después de que el Dialog esté completamente renderizado y animado
    // Los diálogos de Radix UI tienen animaciones que pueden afectar el tamaño inicial
    const timeouts: NodeJS.Timeout[] = [];
    
    // Primera medición después de un delay corto
    timeouts.push(setTimeout(updateWidth, 50));
    
    // Segunda medición después de que las animaciones deberían haber terminado
    timeouts.push(setTimeout(updateWidth, 200));
    
    // Tercera medición como fallback
    timeouts.push(setTimeout(updateWidth, 500));
    
    // Observar cambios de tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      // Usar requestAnimationFrame para asegurar que el cálculo se haga después del layout
      requestAnimationFrame(() => {
        requestAnimationFrame(updateWidth); // Doble RAF para asegurar que el layout está completo
      });
    });
    
    if (iframeContainerRef.current) {
      resizeObserver.observe(iframeContainerRef.current);
    }
    
    return () => {
      timeouts.forEach(clearTimeout);
      resizeObserver.disconnect();
    };
  }, [viewingReport, iframeWidth]);

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
                      // Mobile: stack content + actions to avoid overlap
                      "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 p-4 rounded-lg border",
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
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                    {/* Actions: mobile uses 2-column grid to prevent overlap; desktop keeps current inline layout */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0 sm:ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => handleView(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
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
        <DialogContent 
          className="max-w-[95vw] sm:max-w-[90vw] w-full max-h-[90vh] sm:max-h-[95vh] h-[90vh] sm:h-[95vh] p-0 flex flex-col [&>button]:hidden"
          style={{ width: '100%', maxWidth: '95vw' }}
        >
          <DialogHeader className="px-3 sm:px-4 py-2 sm:py-3 border-b flex flex-row items-center justify-between shrink-0 relative">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base truncate flex-1 min-w-0 pr-2">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span className="truncate">{viewingReport?.file_name}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {viewingReport && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-3 h-8"
                    onClick={() => handleDownload(viewingReport)}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Descargar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setViewingReport(null)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>
          <div 
            ref={iframeContainerRef} 
            className={cn(
              "flex-1 min-h-0 w-full",
              isMobile ? "overflow-auto" : "overflow-hidden"
            )}
            style={{ width: '100%', minWidth: 0 }}
          >
            {viewingReport?.html_content && (
              <iframe
                key={`${viewingReport.id}-${iframeWidth || 'initial'}`}
                srcDoc={(() => {
                  let html = viewingReport.html_content;
                  
                  // Estrategia mejorada para el viewport:
                  // Si tenemos el ancho calculado, usarlo; si no, usar device-width pero con CSS que fuerce el ancho completo
                  let viewportMeta: string;
                  if (iframeWidth && iframeWidth > 0) {
                    // Usar el ancho específico calculado del contenedor
                    viewportMeta = `<meta name="viewport" content="width=${iframeWidth}, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">`;
                  } else {
                    // Fallback: usar device-width pero el CSS forzará el ancho completo
                    viewportMeta = `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">`;
                  }
                  
                  // Reemplazar viewport existente o agregar uno nuevo
                  if (html.includes('name="viewport"') || html.includes("name='viewport'")) {
                    // Reemplazar viewport existente
                    html = html.replace(
                      /<meta\s+name=["']viewport["'][^>]*>/i,
                      viewportMeta
                    );
                  } else {
                    // Agregar nuevo viewport
                    if (html.includes('<head>')) {
                      html = html.replace('<head>', `<head>${viewportMeta}`);
                    } else if (html.includes('<html')) {
                      html = html.replace(/<html[^>]*>/, `$&<head>${viewportMeta}</head>`);
                    } else {
                      html = `<!DOCTYPE html><html><head>${viewportMeta}</head><body>${html}</body></html>`;
                    }
                  }
                  
                  // Agregar CSS adicional MUY AGRESIVO para asegurar que el contenido use el ancho completo
                  // Esto sobrescribe cualquier max-width, width fijo, o constraint que pueda estar limitando el ancho
                  const cssFix = `
                    <style id="vexa-report-width-fix">
                      /* Reset completo para html y body - máxima prioridad */
                      html, body {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        overflow-x: auto !important;
                      }
                      
                      /* Box-sizing para todos los elementos */
                      *, *::before, *::after {
                        box-sizing: border-box !important;
                      }
                      
                      /* Forzar que TODOS los elementos usen el ancho disponible */
                      /* Usar selectores muy específicos para máxima prioridad */
                      html body,
                      html body > *,
                      html body > * > *,
                      html body [class*="container"],
                      html body [class*="wrapper"],
                      html body [class*="content"],
                      html body [class*="main"],
                      html body [class*="section"],
                      html body [id*="container"],
                      html body [id*="wrapper"],
                      html body [id*="content"],
                      html body main,
                      html body article,
                      html body section,
                      html body div {
                        max-width: 100% !important;
                        width: auto !important;
                        min-width: 0 !important;
                      }
                      
                      /* Eliminar márgenes y padding laterales */
                      html body > *:first-child,
                      html body > * > *:first-child {
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                      }
                      
                      /* Asegurar que los elementos con width fijo se adapten */
                      html body [style*="width"],
                      html body [style*="max-width"] {
                        max-width: 100% !important;
                      }
                      
                      /* Forzar que las tablas usen el ancho completo */
                      html body table, 
                      html body .table,
                      html body [class*="table"] {
                        width: 100% !important;
                        max-width: 100% !important;
                        table-layout: auto !important;
                      }
                      
                      /* Asegurar que los contenedores flex y grid usen el ancho completo */
                      html body [class*="flex"],
                      html body [class*="grid"],
                      html body .flex,
                      html body .grid {
                        max-width: 100% !important;
                        width: 100% !important;
                      }
                      
                      /* Forzar que cualquier elemento con clase que contenga 'max-w' use 100% */
                      html body [class*="max-w"] {
                        max-width: 100% !important;
                      }
                      
                      /* Asegurar que los elementos con width en porcentaje o px se adapten */
                      html body [style*="width:"] {
                        max-width: 100% !important;
                      }
                    </style>
                  `;
                  
                  // Insertar el CSS en el head
                  if (html.includes('</head>')) {
                    html = html.replace('</head>', `${cssFix}</head>`);
                  } else if (html.includes('<head>')) {
                    html = html.replace('<head>', `<head>${cssFix}`);
                  } else if (html.includes('<html')) {
                    html = html.replace(/<html[^>]*>/, `$&<head>${cssFix}</head>`);
                  }
                  
                  return html;
                })()}
                className="w-full h-full border-0"
                title={viewingReport.file_name}
                sandbox="allow-scripts allow-same-origin allow-forms"
                style={{ 
                  minHeight: '100%', 
                  width: '100%',
                  display: 'block',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  ...(isMobile ? { 
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch' 
                  } : {})
                }}
                scrolling={isMobile ? "yes" : "auto"}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ReportDetail;
