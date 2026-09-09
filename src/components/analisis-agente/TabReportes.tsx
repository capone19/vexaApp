import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReportes } from '@/hooks/use-learning';
import type { LearningReport } from '@/types/learning';
import { EstadoError, EstadoVacio, EsqueletoTabla } from './estados';

function descargarHtml(report: LearningReport) {
  if (!report.html_content) return;
  const blob = new Blob([report.html_content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.replace(/[^\w\-]+/g, '_') || 'reporte'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TabReportes() {
  const query = useReportes();
  const [activo, setActivo] = useState<LearningReport | null>(null);

  if (query.isLoading) return <EsqueletoTabla filas={4} />;
  if (query.error) {
    return <EstadoError error={query.error} onReintentar={() => void query.refetch()} />;
  }

  const reportes = query.data ?? [];

  if (reportes.length === 0) {
    return (
      <EstadoVacio
        titulo="Sin reportes todavía"
        detalle="El reporte semanal se arma los lunes, después de recalcular las métricas."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reportes.map((r) => {
        const sinHtml = !r.html_content;
        return (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.period_start} – {r.period_end}
                    {' · '}
                    Creado{' '}
                    {format(new Date(r.created_at), 'dd MMM yyyy', { locale: es })}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {r.report_type}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={sinHtml}
                  onClick={() => setActivo(r)}
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={sinHtml}
                  onClick={() => descargarHtml(r)}
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!activo} onOpenChange={(open) => !open && setActivo(null)}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{activo?.title}</DialogTitle>
            <DialogDescription>
              {activo ? `${activo.period_start} – ${activo.period_end}` : ''}
            </DialogDescription>
          </DialogHeader>
          {activo?.html_content ? (
            <iframe
              title={activo.title}
              sandbox=""
              srcDoc={activo.html_content}
              className="min-h-0 flex-1 w-full rounded-md border border-border bg-background"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Este reporte no tiene HTML.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
