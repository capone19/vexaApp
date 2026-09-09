import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Clock, FlaskConical, MessageSquare, MessageSquareOff, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useExperimentosTimeline,
  useLearningSummary,
  useMetricsSemanales,
  useUltimaCorrida,
} from '@/hooks/use-learning';
import { cn } from '@/lib/utils';
import { EstadoError, EstadoVacio, EsqueletoTarjetas } from './estados';

interface TabResumenProps {
  onIrAExperimentos: () => void;
}

function pct(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${(rate * 100).toFixed(1)} %`;
}

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export function TabResumen({ onIrAExperimentos }: TabResumenProps) {
  const summary = useLearningSummary();
  const ultima = useUltimaCorrida();
  const metrics = useMetricsSemanales(12);
  const timeline = useExperimentosTimeline();

  const loading = summary.isLoading || ultima.isLoading || metrics.isLoading;
  const error = summary.error || ultima.error || metrics.error;

  if (loading) return <EsqueletoTarjetas n={4} />;
  if (error) {
    return (
      <EstadoError
        error={error}
        onReintentar={() => {
          void summary.refetch();
          void ultima.refetch();
          void metrics.refetch();
          void timeline.refetch();
        }}
      />
    );
  }

  const data = summary.data;
  if (!data) {
    return (
      <EstadoVacio
        titulo="Todavía no hay análisis"
        detalle="El extractor corre cada noche y analiza los chats del día anterior que ya quedaron inactivos."
      />
    );
  }

  const last = ultima.data;
  const hours = last ? horasDesde(last.created_at) : null;
  const stale = hours != null && hours > 36;

  const weeks = metrics.data ?? [];
  const latest = weeks.length > 0 ? weeks[weeks.length - 1] : undefined;
  const prev = weeks.length > 1 ? weeks[weeks.length - 2] : undefined;

  const sampleOk = (m: typeof latest) =>
    !!m && m.conversations_analyzed >= 20 && m.won_count > 0;

  const delta =
    sampleOk(latest) &&
    sampleOk(prev) &&
    latest!.close_rate != null &&
    prev!.close_rate != null
      ? (latest!.close_rate - prev!.close_rate) * 100
      : null;

  const deltaComparable = sampleOk(latest) && sampleOk(prev);

  const ghostedPct =
    latest && latest.conversations_analyzed > 0
      ? ((latest.ghosted_count / latest.conversations_analyzed) * 100).toFixed(1)
      : null;

  const chartData = weeks.map((m) => ({
    week: m.period_start.slice(0, 10),
    conversion: m.close_rate != null ? +(m.close_rate * 100).toFixed(1) : null,
    unresolved:
      m.unresolved_objection_rate != null
        ? +(m.unresolved_objection_rate * 100).toFixed(1)
        : null,
  }));

  const appliedLines = (timeline.data ?? []).filter((e) => e.applied_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Vista general de lo que el sistema observó en las conversaciones.
        </p>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 font-normal',
            stale && 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {last
            ? `Última extracción: ${formatDistanceToNow(new Date(last.created_at), {
                addSuffix: false,
                locale: es,
              })}`
            : 'Nunca corrió'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Analizadas (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{data.analyzed_7d}</p>
            <p className="text-xs text-muted-foreground">{data.analyzed_total} en total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Tasa de cierre real (semana)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {pct(latest?.close_rate)}
            </p>
            {prev == null ? (
              <p className="text-xs text-muted-foreground">Sin semana previa para comparar</p>
            ) : !deltaComparable ? (
              <p className="text-xs text-muted-foreground">Muestra insuficiente para comparar</p>
            ) : delta != null ? (
              <p
                className={cn(
                  'flex items-center gap-1 text-xs',
                  delta >= 0 ? 'text-emerald-600' : 'text-destructive'
                )}
              >
                {delta >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {delta >= 0 ? '+' : ''}
                {delta.toFixed(1)} pts vs. semana previa
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sin semana previa para comparar</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquareOff className="h-4 w-4" />
              Se fueron sin responder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {latest?.ghosted_count ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {latest && ghostedPct != null
                ? `${latest.ghosted_count} de ${latest.conversations_analyzed} (${ghostedPct}%)`
                : 'Sin datos semanales'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FlaskConical className="h-4 w-4" />
              Propuestas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{data.pending_proposals}</p>
            <p className="text-xs text-muted-foreground">Esperan tu decisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Experimentos activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{data.experiments_running}</p>
            <p className="text-xs text-muted-foreground">
              {data.experiments_kept} mantenidos · {data.experiments_reverted} revertidos
            </p>
          </CardContent>
        </Card>
      </div>

      {data.pending_proposals > 0 && (
        <Alert className="border-primary/30 bg-primary/5">
          <FlaskConical className="h-4 w-4 text-primary" />
          <AlertTitle>Hay {data.pending_proposals} propuesta{data.pending_proposals === 1 ? '' : 's'} pendiente{data.pending_proposals === 1 ? '' : 's'}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              El sistema encontró evidencia suficiente para sugerir cambios al prompt. Revisalas y
              aprobá o rechazá.
            </span>
            <Button size="sm" onClick={onIrAExperimentos} className="shrink-0">
              Ver experimentos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución semanal</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 3 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-10 text-center">
              <p className="text-2xl font-semibold text-foreground">
                {pct(latest?.close_rate)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Se necesitan al menos 3 semanas para ver una tendencia
              </p>
              {chartData.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ahora hay {chartData.length} semana{chartData.length === 1 ? '' : 's'} con métricas
                </p>
              )}
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    unit="%"
                    domain={[0, 'auto']}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversion"
                    name="Tasa de cierre %"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="unresolved"
                    name="Objeciones sin resolver %"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                  {appliedLines.map((e) => {
                    const week = e.applied_at!.slice(0, 10);
                    return (
                      <ReferenceLine
                        key={e.id}
                        x={week}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="2 2"
                        label={{
                          value: e.section_label || e.target_section,
                          position: 'insideTopRight',
                          fontSize: 10,
                          fill: 'hsl(var(--muted-foreground))',
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Los desenlaces los infiere un modelo a partir del texto de las conversaciones. No son ventas
        confirmadas: úsalos como señal, no como contabilidad.
      </p>
    </div>
  );
}
