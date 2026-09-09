import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import {
  CONVERSACIONES_POR_PAGINA,
  useConversaciones,
  useHallazgosDeConversacion,
} from '@/hooks/use-learning';
import { FINDING_TYPE_LABEL, OUTCOME_LABEL, type ConversationAnalysis, type Outcome } from '@/types/learning';
import { cn } from '@/lib/utils';
import { EstadoError, EstadoVacio, EsqueletoTabla } from './estados';

type OutcomeFiltro = Outcome | 'todos';

const OUTCOME_COLOR: Partial<Record<Outcome, string>> = {
  won: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  lost: 'bg-destructive/10 text-destructive border-destructive/30',
  open: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  no_intent: 'bg-secondary text-muted-foreground',
  ghosted: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  committed: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
};

function contacto(sessionId: string): string {
  return sessionId.split('@')[0] || sessionId;
}

function outcomeDisplay(outcome: string): { label: string; color: string } {
  const label = OUTCOME_LABEL[outcome as Outcome] ?? outcome;
  const color = OUTCOME_COLOR[outcome as Outcome] ?? 'bg-muted text-muted-foreground';
  return { label, color };
}

function DetalleConversacion({ analysis }: { analysis: ConversationAnalysis }) {
  const hallazgos = useHallazgosDeConversacion(analysis.id);
  const low = analysis.outcome_confidence < 0.6;

  return (
    <div className="mt-6 space-y-5">
      {low && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Confianza baja ({Math.round(analysis.outcome_confidence * 100)} %). Tomá este desenlace
          como señal débil.
        </div>
      )}

      {analysis.summary && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resumen
          </p>
          <p className="text-sm text-foreground">{analysis.summary}</p>
        </div>
      )}

      {analysis.drop_off_point && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dónde se cayó
          </p>
          <p className="text-sm text-foreground">{analysis.drop_off_point}</p>
        </div>
      )}

      {analysis.outcome_evidence && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evidencia del desenlace
          </p>
          <blockquote className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm italic">
            &ldquo;{analysis.outcome_evidence}&rdquo;
          </blockquote>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hallazgos de este chat
        </p>
        {hallazgos.isLoading && <EsqueletoTabla filas={3} />}
        {hallazgos.error && (
          <EstadoError error={hallazgos.error} onReintentar={() => void hallazgos.refetch()} />
        )}
        {!hallazgos.isLoading && (hallazgos.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Sin hallazgos tipificados.</p>
        )}
        <div className="space-y-2">
          {(hallazgos.data ?? []).map((f) => (
            <div key={f.id} className="rounded-md border border-border px-3 py-2">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{FINDING_TYPE_LABEL[f.finding_type]}</Badge>
                <span className="text-xs text-muted-foreground">sev. {f.severity}</span>
                {f.resolved_by_bot === true && (
                  <Badge variant="outline" className="text-[10px]">
                    Resuelto por el bot
                  </Badge>
                )}
              </div>
              <p className="text-sm italic text-foreground">&ldquo;{f.verbatim}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Analizado el{' '}
        {format(new Date(analysis.analyzed_at), "dd MMM yyyy HH:mm", { locale: es })}
        {analysis.model_used ? ` con ${analysis.model_used}` : ''}
      </p>
    </div>
  );
}

export function TabConversaciones() {
  const [pagina, setPagina] = useState(0);
  const [outcome, setOutcome] = useState<OutcomeFiltro>('todos');
  const [selected, setSelected] = useState<ConversationAnalysis | null>(null);

  const query = useConversaciones(pagina, outcome);
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CONVERSACIONES_POR_PAGINA));
  const filas = query.data?.filas ?? [];

  if (query.isLoading) return <EsqueletoTabla filas={8} />;
  if (query.error) {
    return <EstadoError error={query.error} onReintentar={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={outcome}
          onValueChange={(v) => {
            setOutcome(v as OutcomeFiltro);
            setPagina(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Desenlace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los desenlaces</SelectItem>
            {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
              <SelectItem key={o} value={o}>
                {OUTCOME_LABEL[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          Página {pagina + 1} de {totalPages} · {total} conversaciones
        </p>
      </div>

      {filas.length === 0 ? (
        <EstadoVacio
          titulo="Sin conversaciones analizadas"
          detalle="El extractor corre cada noche y analiza los chats del día anterior que ya quedaron inactivos."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Desenlace</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead className="text-right">Msgs</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((row) => {
                    const low = row.outcome_confidence < 0.6;
                    const { label: outcomeLabel, color: outcomeColor } = outcomeDisplay(row.outcome);
                    return (
                      <TableRow
                        key={row.id}
                        className={cn('cursor-pointer', low && 'opacity-55')}
                        onClick={() => setSelected(row)}
                      >
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {row.period_date}
                        </TableCell>
                        <TableCell className="font-medium">{contacto(row.session_id)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className={outcomeColor}>
                              {outcomeLabel}
                            </Badge>
                            {row.outcome_signal === 'hard' && (
                              <Badge variant="secondary" className="text-[10px]">
                                dura
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={row.outcome_confidence * 100}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {Math.round(row.outcome_confidence * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.message_count}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.funnel_reached ?? '—'}
                        </TableCell>
                        <TableCell>
                          {row.handoff_happened && (
                            <span title="Requirió humano" className="inline-flex">
                              <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina === 0}
          onClick={() => setPagina((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina + 1 >= totalPages}
          onClick={() => setPagina((p) => p + 1)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{contacto(selected.session_id)}</SheetTitle>
                <SheetDescription>
                  {outcomeDisplay(selected.outcome).label} · {selected.period_date}
                </SheetDescription>
              </SheetHeader>
              <DetalleConversacion analysis={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
