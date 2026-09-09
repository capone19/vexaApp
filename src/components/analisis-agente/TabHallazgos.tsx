import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHallazgos, useSectionPressure, useVerbatims } from '@/hooks/use-learning';
import { FINDING_TYPE_LABEL, type FindingType, type WeeklyFinding } from '@/types/learning';
import { cn } from '@/lib/utils';
import { EstadoError, EstadoVacio, EsqueletoTabla } from './estados';

type TipoFiltro = FindingType | 'todos';

interface Agregado {
  taxonomy_code: string;
  label: string;
  finding_type: FindingType;
  target_section: string | null;
  total: number;
  resolved: number;
  unresolved: number;
  avg_severity: number;
}

function agregarHallazgos(rows: WeeklyFinding[]): Agregado[] {
  const map = new Map<string, Agregado & { severityWeight: number }>();

  for (const r of rows) {
    const prev = map.get(r.taxonomy_code);
    if (!prev) {
      map.set(r.taxonomy_code, {
        taxonomy_code: r.taxonomy_code,
        label: r.label,
        finding_type: r.finding_type,
        target_section: r.target_section,
        total: r.total,
        resolved: r.resolved,
        unresolved: r.unresolved,
        avg_severity: r.avg_severity,
        severityWeight: r.avg_severity * r.total,
      });
    } else {
      prev.total += r.total;
      prev.resolved += r.resolved;
      prev.unresolved += r.unresolved;
      prev.severityWeight += r.avg_severity * r.total;
      prev.avg_severity = prev.total > 0 ? prev.severityWeight / prev.total : 0;
    }
  }

  return Array.from(map.values())
    .map(({ severityWeight: _, ...rest }) => rest)
    .sort((a, b) => b.total - a.total);
}

export function TabHallazgos() {
  const [dias, setDias] = useState(30);
  const [tipo, setTipo] = useState<TipoFiltro>('todos');
  const [codigo, setCodigo] = useState<string | null>(null);

  const hallazgos = useHallazgos(dias, tipo);
  const pressure = useSectionPressure();
  const verbatims = useVerbatims(codigo, dias);

  const agregados = useMemo(
    () => agregarHallazgos(hallazgos.data ?? []),
    [hallazgos.data]
  );

  const seleccionado = agregados.find((a) => a.taxonomy_code === codigo) ?? null;
  const maxPressure = Math.max(1, ...(pressure.data ?? []).map((p) => p.last_30d));

  if (hallazgos.isLoading || pressure.isLoading) return <EsqueletoTabla filas={8} />;
  if (hallazgos.error || pressure.error) {
    return (
      <EstadoError
        error={hallazgos.error || pressure.error}
        onReintentar={() => {
          void hallazgos.refetch();
          void pressure.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Select value={String(dias)} onValueChange={(v) => setDias(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rango" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFiltro)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {(Object.keys(FINDING_TYPE_LABEL) as FindingType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {FINDING_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {agregados.length === 0 ? (
        <EstadoVacio
          titulo="Sin hallazgos en este rango"
          detalle="Cuando el extractor procese conversaciones, vas a ver objeciones, preguntas y fricciones agrupadas acá."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hallazgos agregados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Sin resolver</TableHead>
                    <TableHead className="text-right">Severidad</TableHead>
                    <TableHead>Sección</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agregados.map((row) => (
                    <TableRow
                      key={row.taxonomy_code}
                      className="cursor-pointer"
                      onClick={() => setCodigo(row.taxonomy_code)}
                    >
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {FINDING_TYPE_LABEL[row.finding_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.unresolved}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.avg_severity.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.target_section ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presión por sección del agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(pressure.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos de presión todavía.</p>
          ) : (
            (pressure.data ?? []).map((p) => {
              const frozen =
                p.frozen_until != null && new Date(p.frozen_until).getTime() > Date.now();
              const width = Math.max(4, (p.last_30d / maxPressure) * 100);
              return (
                <div key={p.target_section} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {p.section_label || p.target_section}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {p.last_30d} en 30d
                    </span>
                    {p.is_protected && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Lock className="h-3 w-3" />
                        Protegida
                      </Badge>
                    )}
                    {frozen && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-sky-500/40 bg-sky-500/10 text-xs text-sky-700 dark:text-sky-400"
                      >
                        <Snowflake className="h-3 w-3" />
                        Congelada hasta{' '}
                        {format(new Date(p.frozen_until!), 'dd MMM', { locale: es })}
                      </Badge>
                    )}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full rounded-full bg-primary/80',
                        p.is_protected && 'bg-muted-foreground/50'
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Las secciones protegidas o congeladas no reciben propuestas automáticas hasta que se
            liberen.
          </p>
        </CardContent>
      </Card>

      <Sheet open={!!codigo} onOpenChange={(open) => !open && setCodigo(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{seleccionado?.label ?? codigo}</SheetTitle>
            <SheetDescription>
              Citas textuales reales de los clientes. Es lo que hace creíble el dato.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {verbatims.isLoading && <EsqueletoTabla filas={4} />}
            {verbatims.error && (
              <EstadoError error={verbatims.error} onReintentar={() => void verbatims.refetch()} />
            )}
            {!verbatims.isLoading && !verbatims.error && (verbatims.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay citas en este rango.</p>
            )}
            {(verbatims.data ?? []).map((f) => (
              <blockquote
                key={f.id}
                className="rounded-lg border border-border bg-secondary/40 px-4 py-3"
              >
                <p className="text-sm italic text-foreground">&ldquo;{f.verbatim}&rdquo;</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Severidad {f.severity}</span>
                  <span>·</span>
                  <span>
                    {format(new Date(f.period_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  {f.resolved_by_bot === true && (
                    <Badge variant="secondary" className="text-[10px]">
                      Resuelto por el bot
                    </Badge>
                  )}
                </div>
              </blockquote>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
