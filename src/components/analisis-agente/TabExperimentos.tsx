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
import { useAuth } from '@/hooks/use-auth';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { getSectionTitle } from '@/lib/agent-settings-sections';
import { FIELD_OP_LABEL, getFieldLabel } from '@/lib/learning/field-labels';
import { persistExperimentFieldChange } from '@/lib/learning/persist-field-experiment';
import type { FieldOp } from '@/lib/learning/apply-field-change';
import type { Experiment } from '@/types/learning';
import { cn } from '@/lib/utils';
import { EstadoError, EstadoVacio, EsqueletoTabla } from './estados';

type ReasonAction = 'reject' | 'revert';

function isFieldExperiment(experiment: Experiment): boolean {
  return experiment.target_field != null;
}

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

function ObjectValuePreview({ value }: { value: unknown }) {
  if (value == null) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return <p className="text-sm text-foreground">{String(value)}</p>;
  }

  const rec = value as Record<string, unknown>;
  const rows: { label: string; text: string }[] = [];
  if (typeof rec.instruction === 'string') rows.push({ label: 'Instrucción', text: rec.instruction });
  if (typeof rec.question === 'string') rows.push({ label: 'Pregunta', text: rec.question });
  if (typeof rec.answer === 'string') rows.push({ label: 'Respuesta', text: rec.answer });
  if (typeof rec.priority === 'string') rows.push({ label: 'Prioridad', text: rec.priority });
  if (typeof rec.order === 'number') rows.push({ label: 'Paso', text: String(rec.order) });
  if (rows.length === 0 && typeof rec.id === 'string') {
    rows.push({ label: 'Id', text: rec.id });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin detalle legible.</p>;
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="whitespace-pre-wrap text-foreground">{row.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function FieldChangePreview({ experiment }: { experiment: Experiment }) {
  const op = experiment.field_op as FieldOp | null;
  const sample = experiment.value_after ?? experiment.value_before;
  const before = experiment.value_before;
  const after = experiment.value_after;
  const bothStrings =
    (before == null || typeof before === 'string') &&
    (after == null || typeof after === 'string') &&
    (typeof before === 'string' || typeof after === 'string');

  return (
    <div className="space-y-3 rounded-md border border-border bg-secondary/20 p-3">
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sección
          </dt>
          <dd className="text-foreground">
            {getSectionTitle(experiment.settings_section_key)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Campo
          </dt>
          <dd className="text-foreground">{getFieldLabel(experiment.target_field, sample)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Operación
          </dt>
          <dd className="text-foreground">{op ? FIELD_OP_LABEL[op] : '—'}</dd>
        </div>
      </dl>
      {bothStrings ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Antes / Después
          </p>
          <PromptDiff
            before={typeof before === 'string' ? before : null}
            after={typeof after === 'string' ? after : null}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border-2 border-zinc-700 bg-transparent p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Antes
            </p>
            <ObjectValuePreview value={before} />
          </div>
          <div className="rounded-md border-2 border-[#39FF14] bg-transparent p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Después
            </p>
            <ObjectValuePreview value={after} />
          </div>
        </div>
      )}
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
  const fieldBased = isFieldExperiment(experiment);

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
        {fieldBased ? (
          <FieldChangePreview experiment={experiment} />
        ) : (
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
        )}
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

function canRevertFieldExperiment(experiment: Experiment): boolean {
  return (
    isFieldExperiment(experiment) &&
    ['applied', 'measuring', 'kept', 'inconclusive'].includes(experiment.status)
  );
}

export function TabExperimentos() {
  const query = useExperimentos();
  const gate = useLearningGate();
  const { user } = useAuth();
  const { tenantId } = useEffectiveTenant();
  const [reasonOpen, setReasonOpen] = useState<{
    action: ReasonAction;
    experiment: Experiment;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = (query.data ?? []).filter((e) => e.status === 'proposed');
  const measuring = (query.data ?? []).filter(
    (e) => e.status === 'applied' || e.status === 'measuring'
  );
  const history = (query.data ?? []).filter((e) =>
    ['kept', 'reverted', 'rejected', 'inconclusive'].includes(e.status)
  );

  const busy = gate.isPending || busyId !== null;

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

  const approveExperiment = async (experiment: Experiment) => {
    if (!isFieldExperiment(experiment)) {
      await runGate('approve', experiment.id);
      return;
    }
    if (!tenantId) {
      toast.error('No hay un tenant activo para aplicar el cambio.');
      return;
    }
    setBusyId(experiment.id);
    try {
      await persistExperimentFieldChange(experiment, 'apply', tenantId, user?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
      setBusyId(null);
      return;
    }

    try {
      await gate.mutateAsync({ action: 'approve', experiment_id: experiment.id });
      toast.success(
        `Cambio aplicado en ${getSectionTitle(experiment.settings_section_key)} · ${getFieldLabel(
          experiment.target_field,
          experiment.value_after ?? experiment.value_before
        )}. El prompt se regenera en unos segundos.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusyId(null);
    }
  };

  const revertExperiment = async (experiment: Experiment, gateReason: string) => {
    if (isFieldExperiment(experiment)) {
      if (!tenantId) {
        toast.error('No hay un tenant activo para revertir el cambio.');
        return;
      }
      setBusyId(experiment.id);
      try {
        await persistExperimentFieldChange(experiment, 'revert', tenantId, user?.id ?? null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo revertir el cambio.');
        setBusyId(null);
        return;
      }
      setBusyId(null);
    }
    await runGate('revert', experiment.id, gateReason);
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
              busy={busy}
              onApprove={() => void approveExperiment(e)}
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
                    {isFieldExperiment(e)
                      ? `${getSectionTitle(e.settings_section_key)} · ${getFieldLabel(
                          e.target_field,
                          e.value_after ?? e.value_before
                        )}`
                      : e.target_section}
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
                  disabled={busy}
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
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="max-w-[240px] font-medium">{e.hypothesis}</TableCell>
                        <TableCell>
                          {isFieldExperiment(e)
                            ? getSectionTitle(e.settings_section_key)
                            : e.target_section}
                        </TableCell>
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
                        <TableCell>
                          {canRevertFieldExperiment(e) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={busy}
                              onClick={() => {
                                setReason('');
                                setReasonOpen({ action: 'revert', experiment: e });
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Revertir
                            </Button>
                          )}
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
              disabled={!reason.trim() || busy}
              onClick={() => {
                if (!reasonOpen) return;
                if (reasonOpen.action === 'revert') {
                  void revertExperiment(reasonOpen.experiment, reason.trim());
                  return;
                }
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
