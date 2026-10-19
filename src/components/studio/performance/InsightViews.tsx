import { useState } from "react";
import { AlertTriangle, Check, CircleCheck, CircleX, Copy, Download, FlaskConical, Lightbulb, ListChecks, Scissors, Sparkles, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  HOOK_LABELS,
  SHORT_SOURCE_LABELS,
  TRIGGER_LABELS,
  type Confidence,
  type Diagnosis,
  type Replica,
} from "@/lib/studio/performance-ai";
import { cn } from "@/lib/utils";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  alta: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  media: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  baja: "bg-secondary text-muted-foreground ring-border",
};

function Score({ value }: { value: number }) {
  const tone = value >= 8 ? "text-emerald-400" : value >= 6 ? "text-amber-300" : "text-rose-400";
  return <span className={cn("text-lg font-semibold tabular-nums", tone)}>{value.toFixed(value % 1 ? 1 : 0)}<span className="text-xs text-muted-foreground">/10</span></span>;
}

function Section({ icon: Icon, title, score, children }: { icon: React.ElementType; title: string; score?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h4>
        {score !== undefined && <Score value={score} />}
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary", className)}>{children}</span>;
}

function Job({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", ok ? "text-emerald-400" : "text-rose-400")}>
      {ok ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1 px-2 text-xs", className)}
      onClick={() =>
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          })
          .catch(() => toast({ title: "No se pudo copiar", variant: "destructive" }))
      }
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copiado" : label}
    </Button>
  );
}

// ---------- Diagnóstico ----------

export function DiagnosisView({ d, onSeek }: { d: Diagnosis; onSeek?: (seconds: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-primary/10 p-4 ring-1 ring-primary/25">
        <p className="font-medium text-foreground">{d.verdict_es}</p>
        <p className="mt-2 text-sm text-muted-foreground">{d.performance_read_es}</p>
        {d.sample_warning_es && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {d.sample_warning_es}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="h-4 w-4 text-primary" />
          Por qué rindió así (hipótesis)
        </h4>
        {d.hypotheses.map((h, i) => (
          <div key={i} className="rounded-xl border border-border/70 bg-background/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                H{i + 1}. {h.claim_es}
              </p>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1", CONFIDENCE_STYLES[h.confidence])}>{h.confidence}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">Evidencia:</span> {h.evidence_es}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">Cómo probarla:</span> {h.test_es}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section icon={Target} title="Empaque (título + miniatura)" score={d.packaging.score}>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{TRIGGER_LABELS[d.packaging.trigger] ?? d.packaging.trigger}</Chip>
            <Chip className="bg-secondary text-foreground">{d.packaging.title_formula_es}</Chip>
          </div>
          <p>
            <span className="text-foreground/80">Promesa:</span> {d.packaging.promise_es}
          </p>
          <p>{d.packaging.analysis_es}</p>
          {d.packaging.title_alternatives.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs font-semibold text-foreground/80">Títulos para probar (Probar y comparar de YouTube):</p>
              {d.packaging.title_alternatives.map((t) => (
                <div key={t} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-foreground">
                  {t}
                  <CopyButton text={t} label="" className="h-6 px-1.5" />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon={Sparkles} title="Gancho" score={d.hook.score}>
          <blockquote className="border-l-2 border-primary/60 pl-3 text-xs italic text-foreground/90">“{d.hook.quote}”</blockquote>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Chip>{HOOK_LABELS[d.hook.hook_type] ?? d.hook.hook_type}</Chip>
            <Job ok={d.hook.confirms_click} label="Confirma el clic" />
            <Job ok={d.hook.sets_stakes} label="Fija lo que está en juego" />
            <Job ok={d.hook.opens_loop} label="Abre un bucle" />
          </div>
          <p>{d.hook.analysis_es}</p>
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground/80">Gancho mejorado</p>
              <CopyButton text={d.hook.rewrite} />
            </div>
            <p className="text-xs text-foreground">{d.hook.rewrite}</p>
          </div>
        </Section>

        <Section icon={Lightbulb} title="Tema" score={d.topic.score}>
          <p className="font-medium text-foreground">{d.topic.core_topic_es}</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{TRIGGER_LABELS[d.topic.emotional_driver] ?? d.topic.emotional_driver}</Chip>
          </div>
          <p>
            <span className="text-foreground/80">Quién hace clic:</span> {d.topic.audience_identity_es}
          </p>
          <p>{d.topic.why_it_resonates_es}</p>
        </Section>

        <Section icon={ListChecks} title="Estructura" score={d.structure.score}>
          <p>{d.structure.analysis_es}</p>
          <p className="text-xs">
            {d.structure.rehooks} re-ganchos · desenlace: {d.structure.payoff_timing_es}
          </p>
          <ol className="space-y-1 pt-1">
            {d.structure.beats.map((b, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSeek?.(b.at_s)}
                  className="shrink-0 rounded bg-secondary px-1.5 font-mono tabular-nums text-foreground hover:bg-primary/20"
                >
                  {mmss(b.at_s)}
                </button>
                <span>
                  <span className="text-foreground">{b.beat_es}</span> — {b.purpose_es}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {d.retention_events.length > 0 && (
        <Section icon={Target} title="Qué pasa en la curva de retención">
          {d.retention_events.map((e, i) => (
            <div key={i} className="flex gap-2.5 border-b border-border/50 pb-2 last:border-0 last:pb-0">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                  e.type === "caida" ? "bg-rose-500/15 text-rose-300" : e.type === "pico" ? "bg-emerald-500/15 text-emerald-300" : "bg-secondary text-foreground"
                )}
              >
                {mmss(e.at_s)}
              </span>
              <div className="min-w-0 text-xs">
                {e.quote && <p className="italic text-foreground/80">“{e.quote}”</p>}
                <p className="mt-0.5">{e.cause_es}</p>
                <p className="mt-0.5 text-foreground/90">→ {e.fix_es}</p>
              </div>
            </div>
          ))}
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Section icon={Star} title="Repite esto">
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {d.repeat_es.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
        <Section icon={AlertTriangle} title="Evita esto">
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {d.avoid_es.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="pt-1 text-xs">
            <span className="text-foreground/80">Horario:</span> {d.timing_es}
          </p>
        </Section>
      </div>
    </div>
  );
}

// ---------- Réplica ----------

const RISK_STYLES = { bajo: "text-emerald-400", medio: "text-amber-300", alto: "text-rose-400" } as const;

export function ReplicaView({
  r,
  brief,
  onOpenFactory,
  onDownload,
}: {
  r: Replica;
  /** Brief en Markdown de un ángulo */
  brief: (angle: number) => string;
  onOpenFactory: () => void;
  onDownload: (angle: number) => void;
}) {
  const [angle, setAngle] = useState(r.recommended_angle ?? 0);
  const a = r.angles[angle] ?? r.angles[0];

  return (
    <div className="space-y-3">
      <Section icon={FlaskConical} title="El ADN que funcionó">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{TRIGGER_LABELS[r.dna.curiosity_type] ?? r.dna.curiosity_type}</Chip>
          <Chip>{TRIGGER_LABELS[r.dna.emotion] ?? r.dna.emotion}</Chip>
        </div>
        <p>
          <span className="text-foreground/80">Promesa:</span> {r.dna.title_promise_es}
        </p>
        <p>
          <span className="text-foreground/80">Espectador:</span> {r.dna.audience_identity_es}
        </p>
        <p>{r.dna.what_made_it_work_es}</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-xs">
          {r.dna.skeleton_es.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>

      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {r.angles.map((x, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAngle(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                i === angle ? "bg-primary/20 text-foreground ring-1 ring-primary/40" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {i === r.recommended_angle && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              {x.name_es}
            </button>
          ))}
        </div>
        {angle === r.recommended_angle && <p className="mb-2 text-xs text-amber-300">Recomendado: {r.recommended_reason_es}</p>}

        <div className="space-y-3 rounded-xl border border-primary/30 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{a.premise_es}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground/80">Por qué va más hondo:</span> {a.why_deeper_es}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground/80">Títulos</p>
            {a.titles.map((t) => (
              <div key={t} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-sm text-foreground">
                {t}
                <CopyButton text={t} label="" className="h-6 px-1.5" />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground/80">Miniatura</p>
              <p className="mb-1 text-base font-black uppercase tracking-tight text-foreground">{a.thumbnail.text}</p>
              <p>{a.thumbnail.concept_es}</p>
              <p className="mt-1">{a.thumbnail.composition_es}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-foreground/80">Gancho</p>
                <CopyButton text={a.hook_script} />
              </div>
              <p className="whitespace-pre-line text-foreground">{a.hook_script}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-foreground/80">Esqueleto con re-ganchos</p>
            <ol className="space-y-1.5">
              {a.outline.map((o, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="shrink-0 rounded bg-secondary px-1.5 font-mono tabular-nums text-foreground">{o.mark}</span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{o.beat_es}</span>
                    {o.rehook && <span className="block italic text-primary/90">“{o.rehook}”</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground/80">Qué investigar</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {a.research_es.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground/80">Diferencia con el original:</span> {a.difference.changes_es}
              </p>
              <p>
                <span className="font-semibold text-foreground/80">Riesgo de contenido repetido:</span>{" "}
                <span className={cn("font-semibold uppercase", RISK_STYLES[a.difference.overlap_risk])}>{a.difference.overlap_risk}</span> — {a.difference.why_not_repetitive_es}
              </p>
              <p>
                <span className="font-semibold text-foreground/80">Meta:</span> ×{a.prediction.ratio_min}–{a.prediction.ratio_max} lo normal. {a.prediction.rationale_es}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <CopyButton text={brief(angle)} label="Copiar brief para Claude" className="h-8 bg-primary/15 px-3 text-foreground hover:bg-primary/25" />
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDownload(angle)}>
              <Download className="h-3.5 w-3.5" />
              Descargar .md
            </Button>
          </div>
        </div>
      </div>

      <Section icon={ListChecks} title="Plan para aprovechar la ola">
        <ol className="list-decimal space-y-1 pl-5 text-xs">
          {r.wave_plan_es.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="pt-1 text-xs">
          <span className="text-foreground/80">Publicación:</span> {r.publish_es}
        </p>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Section icon={Scissors} title="Shorts derivados">
          <Chip>{SHORT_SOURCE_LABELS[r.shorts_plan.source]}</Chip>
          <p className="text-xs">{r.shorts_plan.why_es}</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {r.shorts_plan.moments_es.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {r.shorts_plan.source !== "secuela" && (
            <Button size="sm" className="mt-1 h-8 gap-1.5 text-xs" onClick={onOpenFactory}>
              <Scissors className="h-3.5 w-3.5" />
              Abrir la Fábrica en modo ola
            </Button>
          )}
        </Section>
        <Section icon={Lightbulb} title="Comentario fijado y playlist">
          <div className="rounded-lg bg-secondary/50 p-2.5 text-xs text-foreground">
            {r.pinned_comment}
            <div className="mt-1 flex justify-end">
              <CopyButton text={r.pinned_comment} />
            </div>
          </div>
          <p className="text-xs">
            <span className="font-semibold text-foreground">{r.playlist.title}</span> — {r.playlist.description}
          </p>
          <p className="text-xs">{r.playlist.why_es}</p>
        </Section>
      </div>
    </div>
  );
}
