import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  FolderOpen,
  Instagram,
  ListChecks,
  Loader2,
  Music2,
  Play,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { StudioCard } from "@/components/studio/StudioUI";
import { useToast } from "@/hooks/use-toast";
import {
  buildTimeline,
  FX_LABELS,
  MOOD_LABELS,
  normalizePlan,
  SCORE_LABELS,
  SCORE_WEIGHTS,
  SFX_LABELS,
  timelineToSrt,
  totalScore,
  type MusicMood,
  type ShortPlan,
  type ShortScore,
  type StoredRender,
} from "@/lib/studio/shorts";
import type { IdeaCheck, IdeaCheckItem, IdeaLevel } from "@/lib/studio/short-ideas";
import { renderExtension, ShortEngine } from "@/lib/studio/shorts-render";
import type { Cue } from "@/lib/studio/subtitles";
import { cn } from "@/lib/utils";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const srcClock = (s: number) => `${clock(s)}.${Math.floor((s % 1) * 10)}`;

export function scoreTone(total: number) {
  if (total >= 80) return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30";
  if (total >= 70) return "bg-primary/15 text-primary ring-primary/30";
  return "bg-amber-500/15 text-amber-300 ring-amber-400/30";
}

const SIMILARITY_TONES: Record<IdeaLevel, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  cercana: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  repetida: "bg-red-500/15 text-red-300 ring-red-400/30",
  sin_dato: "bg-secondary text-muted-foreground ring-border",
};

/** Parecido con lo ya hecho en el canal (lo calcula n8n con embeddings) */
export function SimilarityBadge({ idea, className }: { idea: Pick<IdeaCheck, "similarity" | "level" | "reason">; className?: string }) {
  return (
    <span
      className={cn("whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold ring-1", SIMILARITY_TONES[idea.level], className)}
      title={idea.reason || undefined}
    >
      {idea.similarity === null ? "Sin comparar" : `Parecido ${idea.similarity} %`}
    </span>
  );
}

const VIDEO_SIZES: { value: string; label: string }[] = [
  { value: "1", label: "16:9 completo" },
  { value: "1.33", label: "4:3 (más grande)" },
  { value: "1.78", label: "Cuadrado (máximo)" },
];

interface Props {
  rank: number;
  plan: ShortPlan;
  cues: Cue[];
  file: File;
  render: StoredRender | null;
  /** Otro Short está reproduciendo o renderizando */
  locked: boolean;
  scheduledDraftId?: string;
  onChange: (plan: ShortPlan) => void;
  onRevise: (instruction: string) => Promise<void>;
  /** Se llama dentro del clic de "Renderizar" (para pedir la carpeta o su permiso) */
  onBeforeRender?: () => Promise<void>;
  onRendered: (render: StoredRender) => Promise<void>;
  onSend: () => Promise<void>;
  /** Abre el compositor de Instagram con este render (solo si hay una cuenta de Instagram gestionada) */
  onSendInstagram?: () => void;
  onDelete: () => void;
  onActive: (active: boolean) => void;
  /** Ítems de la lista de control que calcula la app (video relacionado y cuadro de apertura) */
  appChecks?: IdeaCheckItem[];
}

export function ShortPlanCard({
  rank,
  plan,
  cues,
  file,
  render,
  locked,
  scheduledDraftId,
  onChange,
  onRevise,
  onBeforeRender,
  onRendered,
  onSend,
  onSendInstagram,
  onDelete,
  onActive,
  appChecks = [],
}: Props) {
  const { toast } = useToast();
  const idea = plan.idea;
  const checks = [...(idea?.checks ?? []), ...appChecks];
  const passed = checks.filter((c) => c.ok).length;
  // Repetido: se confirma antes de mandarlo a Programación o a Instagram
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const guard = (action: () => void) => (idea?.level === "repetida" ? setConfirmAction(() => action) : action());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShortEngine | null>(null);
  const [mode, setMode] = useState<"idle" | "preview" | "render">("idle");
  const [progress, setProgress] = useState(0);
  const [monitor, setMonitor] = useState(true);
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(rank === 1);

  const timeline = useMemo(() => buildTimeline(plan, cues), [plan, cues]);
  const total = totalScore(plan.score);
  const rendered = render && render.revision === plan.revision ? render : null;

  // Motor propio de este Short: se recrea si cambia el video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ShortEngine(canvas, file);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [file]);

  // Cada cambio del plan redibuja la portada
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || engine.isRunning) return;
    const timer = setTimeout(() => {
      void engine
        .load(plan, cues)
        .then(() => engine.showAt(Math.min(1.2, timeline.duration / 2)))
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [plan, cues, timeline.duration]);

  // Todo cambio del plan sube la revisión: el render anterior deja de valer
  const update = (patch: Partial<ShortPlan>) => onChange(normalizePlan({ ...plan, ...patch, revision: plan.revision + 1 }, cues, Infinity));

  const run = async (record: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (record) await onBeforeRender?.();
    setMode(record ? "render" : "preview");
    setProgress(0);
    onActive(true);
    try {
      await engine.load(plan, cues);
      const blob = await engine.play({ record, monitor: record ? monitor : true, onProgress: (t, d) => setProgress(d ? t / d : 0) });
      if (record && blob) {
        const slug = (plan.title || "short").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 50);
        const out = new File([blob], `${slug || "short"}.${renderExtension(blob)}`, { type: blob.type });
        await onRendered({ planId: plan.id, revision: plan.revision, file: out, srt: timelineToSrt(timeline) });
      }
    } catch (e) {
      toast({ title: "No se pudo terminar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setMode("idle");
      onActive(false);
      void engine.showAt(Math.min(1.2, timeline.duration / 2)).catch(() => undefined);
    }
  };

  const download = () => {
    if (!rendered) return;
    const url = URL.createObjectURL(rendered.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = rendered.file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Mover el inicio o el final al subtítulo anterior/siguiente
  const nudge = (edge: "start" | "end", dir: -1 | 1) => {
    const segments = plan.segments.map((s) => ({ ...s }));
    if (edge === "start") {
      const seg = segments[0];
      const starts = cues.map((c) => c.start).filter((s) => (dir < 0 ? s < seg.start - 0.05 : s > seg.start + 0.05 && s < seg.end - 1));
      if (!starts.length) return;
      seg.start = dir < 0 ? Math.max(...starts) : Math.min(...starts);
    } else {
      const seg = segments[segments.length - 1];
      const ends = cues.map((c) => c.end).filter((e) => (dir > 0 ? e > seg.end + 0.05 : e < seg.end - 0.05 && e > seg.start + 1));
      if (!ends.length) return;
      seg.end = dir > 0 ? Math.min(...ends) : Math.max(...ends);
    }
    update({ segments });
  };

  const revise = async () => {
    if (!instruction.trim()) return;
    setRevising(true);
    try {
      await onRevise(instruction.trim());
      setInstruction("");
    } catch (e) {
      toast({ title: "La IA no pudo corregirlo", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRevising(false);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      await onSend();
    } finally {
      setSending(false);
    }
  };

  const busy = mode !== "idle";
  const disabled = (locked && !busy) || revising;
  const decisions = [
    ...timeline.effects.map((e) => ({ id: e.id, at: e.outAt, label: FX_LABELS[e.type] + (e.text ? ` «${e.text}»` : ""), kind: "fx" as const, detail: `${e.duration.toFixed(1)} s` })),
    ...timeline.sfx.map((s) => ({ id: s.id, at: s.outAt, label: SFX_LABELS[s.type], kind: "sfx" as const, detail: "sonido" })),
    ...timeline.musicCuts.map((c, i) => ({ id: `cut-${i}`, at: c, label: "Corte de música", kind: "cut" as const, detail: "silencio antes del remate" })),
  ].sort((a, b) => a.at - b.at);

  return (
    <StudioCard className="p-4">
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Vista previa 9:16 */}
        <div className="mx-auto w-[230px] shrink-0 space-y-3 sm:w-[260px]">
          <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-border">
            <canvas ref={canvasRef} className="block aspect-[9/16] w-full" />
            {busy && (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2">
                <Progress value={progress * 100} className="h-1.5" />
                <p className="mt-1 text-center text-[11px] text-white/80">
                  {mode === "render" ? "Renderizando en tiempo real…" : "Vista previa"} {clock(progress * timeline.duration)} / {clock(timeline.duration)}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {busy ? (
              <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => engineRef.current?.stop()}>
                <Square className="h-4 w-4" />
                Detener
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => void run(false)} disabled={disabled}>
                  <Play className="h-4 w-4" />
                  Ver
                </Button>
                <Button size="sm" className="flex-1 gap-1.5" onClick={() => void run(true)} disabled={disabled}>
                  <Clapperboard className="h-4 w-4" />
                  {rendered ? "Volver a renderizar" : "Renderizar"}
                </Button>
              </>
            )}
          </div>
          {!busy && (
            <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                Escuchar al renderizar
              </span>
              <Switch checked={monitor} onCheckedChange={setMonitor} />
            </label>
          )}
          {mode === "render" && <p className="text-[11px] text-amber-300">No cambies de pestaña hasta que termine.</p>}
          {rendered && !busy && (
            <div className="space-y-2 rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-400/20">
              <p className="text-xs font-medium text-emerald-300">Render listo · {(rendered.file.size / 1024 ** 2).toFixed(1)} MB</p>
              {rendered.path && (
                <p className="flex items-center gap-1 truncate text-[11px] text-emerald-200/80" title={rendered.path.join("/")}>
                  <FolderOpen className="h-3 w-3 shrink-0" />
                  {rendered.path.join("/")}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={download}>
                  <Download className="h-4 w-4" />
                  Bajar
                </Button>
                {scheduledDraftId ? (
                  <Button asChild size="sm" variant="secondary" className="flex-1">
                    <Link href="/studio/youtube/programar">Ver en Programación</Link>
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => guard(() => void send())} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                    Programar
                  </Button>
                )}
              </div>
              {onSendInstagram && (
                <Button variant="ghost" size="sm" className="h-8 w-full gap-1.5 text-pink-300 hover:text-pink-200" onClick={() => guard(onSendInstagram)}>
                  <Instagram className="h-4 w-4" />
                  También a Instagram
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Plan */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Short #{rank} · {clock(timeline.duration)}
              </p>
              <Input
                value={plan.title}
                onChange={(e) => onChange({ ...plan, title: e.target.value.slice(0, 100) })}
                className="h-9 text-base font-semibold"
                placeholder="Título del Short en YouTube"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {idea && <SimilarityBadge idea={idea} />}
              <span className={cn("rounded-xl px-3 py-1.5 text-lg font-bold ring-1", scoreTone(total))} title="Puntaje viral (rúbrica de 100)">
                {total}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onDelete} disabled={busy} title="Quitar este Short">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Por qué puede funcionar
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.rationale}</p>
            {plan.editingNotes && <p className="mt-2 text-xs text-muted-foreground/80">Edición: {plan.editingNotes}</p>}
          </div>

          {checks.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ring-1",
                    passed === checks.length ? "bg-emerald-500/5 text-emerald-300 ring-emerald-400/20" : "bg-amber-500/5 text-amber-300 ring-amber-400/20"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" />
                    Lista de control {passed}/{checks.length}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1.5 px-1">
                  {checks.map((c) => (
                    <li key={c.key} className="flex items-start gap-2 text-xs">
                      {c.ok ? <Check className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="mt-px h-3.5 w-3.5 shrink-0 text-red-400" />}
                      <span className="min-w-0">
                        <span className="text-foreground">{c.label}</span>
                        {c.detail && <span className="text-muted-foreground"> · {c.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {(Object.keys(SCORE_LABELS) as (keyof ShortScore)[]).map((k) => (
              <div key={k} title={SCORE_LABELS[k].help}>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {SCORE_LABELS[k].label} <span className="opacity-60">×{SCORE_WEIGHTS[k]}</span>
                  </span>
                  <span className="font-medium text-foreground">{plan.score[k]}/10</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", plan.score[k] >= 8 ? "bg-emerald-400" : plan.score[k] >= 6 ? "bg-primary" : "bg-amber-400")}
                    style={{ width: `${plan.score[k] * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-medium text-foreground hover:text-primary">
                Editar textos, formato, música y guion de edición
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título en pantalla (gancho)</Label>
                  <Input value={plan.hookText} onChange={(e) => update({ hookText: e.target.value })} maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Llamado final</Label>
                  <Input value={plan.endText} onChange={(e) => update({ endText: e.target.value })} maxLength={40} placeholder="Sin llamado" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Formato</Label>
                  <Select value={plan.layout} onValueChange={(v) => update({ layout: v as ShortPlan["layout"] })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clasico">Clásico (título + video + subtítulos)</SelectItem>
                      <SelectItem value="completo">Pantalla completa (paneo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {plan.layout === "clasico" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tamaño del video</Label>
                    <Select value={String(plan.videoZoom)} onValueChange={(v) => update({ videoZoom: Number(v) })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qué parte del cuadro se ve</Label>
                    <Slider value={[plan.focusX * 100]} min={0} max={100} step={5} onValueChange={([v]) => update({ focusX: v / 100 })} className="pt-3" />
                  </div>
                )}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between text-xs text-muted-foreground">
                    Subtítulos animados
                    <Switch checked={plan.captionsOn} onCheckedChange={(v) => update({ captionsOn: v })} />
                  </label>
                  <label className="flex items-center justify-between text-xs text-muted-foreground">
                    Efectos y sonidos
                    <Switch checked={plan.effectsOn} onCheckedChange={(v) => update({ effectsOn: v })} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Music2 className="h-3.5 w-3.5" />
                    Música de fondo
                  </Label>
                  <Select value={plan.music.mood} onValueChange={(v) => update({ music: { ...plan.music, mood: v as MusicMood } })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MOOD_LABELS) as MusicMood[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {MOOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Volumen de la música · {Math.round(plan.music.volume * 100)}%</Label>
                  <Slider
                    value={[plan.music.volume * 100]}
                    min={0}
                    max={40}
                    step={1}
                    disabled={plan.music.mood === "ninguna"}
                    onValueChange={([v]) => update({ music: { ...plan.music, volume: v / 100 } })}
                    className="pt-3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Cortes (del video original)</p>
                {plan.segments.map((s, i) => (
                  <div key={`${s.start}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">Tramo {i + 1}</span>
                    <span className="text-muted-foreground">
                      {srcClock(s.start)} → {srcClock(s.end)} · {(s.end - s.start).toFixed(1)} s
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground/80">
                      «{cues.filter((c) => c.end > s.start && c.start < s.end).map((c) => c.text).join(" ").slice(0, 90)}…»
                    </span>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => nudge("start", -1)} disabled={busy}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Empezar antes
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => nudge("start", 1)} disabled={busy}>
                    Empezar después
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => nudge("end", -1)} disabled={busy}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Terminar antes
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => nudge("end", 1)} disabled={busy}>
                    Terminar después
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Guion de edición (tiempo del Short)</p>
                {decisions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin efectos{plan.effectsOn ? "" : " (apagados)"}.</p>
                ) : (
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {decisions.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-2.5 py-1.5 text-xs">
                        <span className="w-9 shrink-0 font-mono text-muted-foreground">{clock(d.at)}</span>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", d.kind === "fx" ? "bg-primary" : d.kind === "sfx" ? "bg-emerald-400" : "bg-amber-400")} />
                        <span className="min-w-0 flex-1 truncate text-foreground">{d.label}</span>
                        <span className="hidden shrink-0 text-muted-foreground/70 sm:inline">{d.detail}</span>
                        {d.kind !== "cut" && (
                          <button
                            className="text-muted-foreground hover:text-destructive"
                            title="Quitar"
                            onClick={() =>
                              update(d.kind === "fx" ? { effects: plan.effects.filter((e) => e.id !== d.id) } : { sfx: plan.sfx.filter((s) => s.id !== d.id) })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void revise()}
              placeholder='Pídele cambios a la IA: "empieza con el castigo", "más intenso", "música épica"…'
              disabled={revising || busy}
            />
            <Button variant="secondary" className="shrink-0 gap-1.5" onClick={() => void revise()} disabled={!instruction.trim() || revising || busy}>
              {revising ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Corregir con IA
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(next) => !next && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este Short se parece mucho a otro</AlertDialogTitle>
            <AlertDialogDescription>
              Se parece {idea?.similarity ?? 0} % a «{idea?.similarTo?.title || "un Short anterior"}». YouTube puede verlo como contenido repetido. ¿Enviar igual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                action?.();
              }}
            >
              Enviar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudioCard>
  );
}
