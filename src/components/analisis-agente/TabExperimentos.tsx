import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, ChevronDown, ChevronRight, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExperimentos, useLearningGate } from '@/hooks/use-learning';
import type { Experiment } from '@/types/learning';
import { cn } from '@/lib/utils';
import { EstadoError, EstadoVacio, EsqueletoTabla } from './estados';

type ReasonAction = 'reject' | 'revert';

function PromptDiff({ before, after }: { before: string | null; after: string | null }) {
  const lines = useMemo(() => {
    const a = (before ?? '').split('\n');
    const b = (after ?? '').split('\n');
    const max = Math.max(a.length, b.length);
    const out: { type: 'same' | 'del' | 'add'; text: string }[] = [];
    for (let i = 0; i < max; i++) {
      const left = a[i];
      const right = b[i];
      if (left === right) {
        if (left !== undefined) out.push({ type: 'same', text: left });
      } else {
        if (left !== undefined) out.push({ type: 'del', text: left });
        if (right !== undefined) out.push({ type: 'add', text: right });
      }
    }
    return out;
  }, [before, after]);

  if (!before && !after) {
    return <p className="text-sm text-muted-foreground">Sin diff de prompt disponible.</p>;
  }

  return (
    <div className="max-h-64 overflow-auto rounded-md border border-border bg-secondary/30 p-3 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'whitespace-pre-wrap break-words',
            line.type === 'del' && 'bg-destructive/10 text-destructive',
            line.type === 'add' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            line.type === 'same' && 'text-muted-foreground'
          )}
        >
          {line.type === 'del' ? '- ' : line.type === 'add' ? '+ ' : '  '}
          {line.text}
        </div>
      ))}
    </div>
  );
}

function EvidenceBlock({ experiment }: { experiment: Experiment }) {
  const ev = experiment.evidence;
  if (!ev) return null;
  return (
    <div className="space-y-2 text-sm">
      {ev.codes && ev.codes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ev.codes.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
      )}
      {ev.counts && Object.keys(ev.counts).length > 0 && (
        <ul className="list-inside list-disc text-muted-foreground">
          {Object.entries(ev.counts).map(([k, v]) => (
            <li key={k}>
              {k}: <span className="tabular-nums text-foreground">{v}</span>
            </li>
          ))}
        </ul>
      )}
      {ev.verbatims && ev.verbatims.length > 0 && (
        <div className="space-y-2">
          {ev.verbatims.slice(0, 5).map((v, i) => (
            <p key={i} className="rounded-md bg-secondary/50 px-3 py-2 text-xs italic">
              &ldquo;{v}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ProposedCard({
  experiment,
  onApprove,
  onReject,
  busy,
}: {
  experiment: Experiment;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const [openDiff, setOpenDiff] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{experiment.hypothesis}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Sección: <span className="font-medium text-foreground">{experiment.target_section}</span>
              {' · '}
              {experiment.target_metric} ({experiment.target_direction === 'increase' ? '↑' : '↓'})
            </p>
          </div>
          <Badge>Propuesta</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {experiment.rationale && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Por qué
            </p>
            <p className="text-sm text-foreground">{experiment.rationale}</p>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evidencia
          </p>
          <EvidenceBlock experiment={experiment} />
        </div>
        <Collapsible open={openDiff} onOpenChange={setOpenDiff}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-0">
              {openDiff ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Ver diff del prompt
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <PromptDiff before={experiment.prompt_before} after={experiment.prompt_after} />
          </CollapsibleContent>
        </Collapsible>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={onApprove}>
            <Check className="h-4 w-4" />
            Aprobar y aplicar
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={onReject}>
            <X className="h-4 w-4" />
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function verdictColor(status: string): string {
  if (status === 'kept') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  if (status === 'reverted' || status === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/30';
  return 'bg-secondary text-muted-foreground';
}

export function TabExperimentos() {
  const query = useExperimentos();
  const gate = useLearningGate();
  const [reasonOpen, setReasonOpen] = useState<{
    action: ReasonAction;
    experiment: Experiment;
  } | null>(null);
  const [reason, setReason] = useState('');

  const pending = (query.data ?? []).filter((e) => e.status === 'proposed');
  const measuring = (query.data ?? []).filter(
    (e) => e.status === 'applied' || e.status === 'measuring'
  );
  const history = (query.data ?? []).filter((e) =>
    ['kept', 'reverted', 'rejected', 'inconclusive'].includes(e.status)
  );

  const runGate = async (
    action: 'approve' | 'reject' | 'revert',
    experiment_id: string,
    gateReason?: string
  ) => {
    try {
      await gate.mutateAsync({ action, experiment_id, reason: gateReason });
      toast.success(
        action === 'approve'
          ? 'Propuesta aprobada'
          : action === 'reject'
            ? 'Propuesta rechazada'
            : 'Cambio revertido'
      );
      setReasonOpen(null);
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (query.isLoading) return <EsqueletoTabla filas={5} />;
  if (query.error) {
    return <EstadoError error={query.error} onReintentar={() => void query.refetch()} />;
  }

  if ((query.data ?? []).length === 0) {
    return (
      <EstadoVacio
        titulo="Sin propuestas todavía"
        detalle="El razonador revisa las métricas una vez por semana y propone cambios cuando encuentra evidencia suficiente."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Pendientes ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay propuestas esperando decisión.</p>
        ) : (
          pending.map((e) => (
            <ProposedCard
              key={e.id}
              experiment={e}
              busy={gate.isPending}
              onApprove={() => void runGate('approve', e.id)}
              onReject={() => {
                setReason('');
                setReasonOpen({ action: 'reject', experiment: e });
              }}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          En medición ({measuring.length})
        </h3>
        {measuring.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún cambio está en medición ahora.</p>
        ) : (
          measuring.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{e.hypothesis}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.target_section}
                    {e.applied_at && (
                      <>
                        {' · '}Aplicado{' '}
                        {format(new Date(e.applied_at), 'dd MMM yyyy', { locale: es })}
                      </>
                    )}
                    {e.freeze_until && (
                      <>
                        {' · '}Se evalúa{' '}
                        {formatDistanceToNow(new Date(e.freeze_until), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={gate.isPending}
                  onClick={() => {
                    setReason('');
                    setReasonOpen({ action: 'revert', experiment: e });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Revertir
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Historial ({history.length})</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay veredictos.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hipótesis</TableHead>
                      <TableHead>Sección</TableHead>
                      <TableHead>Veredicto</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="max-w-[240px] font-medium">{e.hypothesis}</TableCell>
                        <TableCell>{e.target_section}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={verdictColor(e.status)}>
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {e.result && typeof e.result === 'object' && 'delta' in e.result
                            ? String(e.result.delta)
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-muted-foreground">
                          {e.verdict_note ?? e.decided_by ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog
        open={!!reasonOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReasonOpen(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonOpen?.action === 'reject' ? 'Rechazar propuesta' : 'Revertir cambio'}
            </DialogTitle>
            <DialogDescription>
              El motivo es obligatorio: el sistema lo guarda para no volver a proponer lo mismo sin
              contexto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: la sección ya se ajustó a mano / no queremos ese tono"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!reason.trim() || gate.isPending}
              onClick={() => {
                if (!reasonOpen) return;
                void runGate(reasonOpen.action, reasonOpen.experiment.id, reason.trim());
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
