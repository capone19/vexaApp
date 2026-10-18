import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  Captions,
  CheckCircle2,
  ChevronDown,
  FileVideo,
  Loader2,
  Music2,
  PlugZap,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShortPlanCard, scoreTone } from "@/components/studio/ShortPlanCard";
import { ShortsSoundsDialog } from "@/components/studio/ShortsSoundsDialog";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import { LANGUAGES, normalizeProfile, transcribeAudio } from "@/lib/studio/ai";
import { extractAudioChunks, getVideoInfo } from "@/lib/studio/media";
import {
  ANGLE_LABELS,
  channelLearnings,
  deleteProject,
  editShorts,
  listProjects,
  loadProjectVideo,
  loadRenders,
  newProject,
  reviseShort,
  saveProject,
  saveRender,
  scoutMoments,
  sendShortToSchedule,
  SCORE_LABELS,
  totalScore,
  type ChannelLearning,
  type ShortCandidate,
  type ShortPlan,
  type ShortsProject,
  type StoredRender,
} from "@/lib/studio/shorts";
import { parseSubtitles, isSubtitleFile, formatTimestamp } from "@/lib/studio/subtitles";
import type { RelatedVideo } from "@/lib/studio/video-tasks";
import { fetchYouTubeVideos } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "lectura", label: "Leyendo los subtítulos" },
  { key: "explorando", label: "Explorador: buscando momentos con potencial" },
  { key: "editando", label: "Crítico y editor: puntuando y editando los mejores" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const NO_RELATED = "none";

export default function YouTubeShorts() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "youtube") notFound();

  const { channels, channel, select } = useYouTubeChannel();
  const { toast } = useToast();
  const profile = useMemo(() => normalizeProfile(channel?.aiProfile), [channel]);
  const channelId = channel?.id;

  const [projects, setProjects] = useState<ShortsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoMissing, setVideoMissing] = useState(false);
  const [renders, setRenders] = useState<Record<string, StoredRender>>({});
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [step, setStep] = useState<{ key: StepKey; detail?: string } | null>(null);
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [longVideos, setLongVideos] = useState<RelatedVideo[]>([]);

  // Formulario de proyecto nuevo
  const [formOpen, setFormOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subFile, setSubFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(profile.language);
  const [count, setCount] = useState("3");
  const [notes, setNotes] = useState("");
  const [relatedId, setRelatedId] = useState(NO_RELATED);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);
  const relinkRef = useRef<HTMLInputElement>(null);
  const learningsRef = useRef<{ channel: string; data: ChannelLearning[] } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = projects.find((p) => p.id === openId) ?? null;
  const busy = Boolean(step);

  useEffect(() => setLanguage(profile.language), [profile.language]);

  // ---------- Carga ----------
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    setLoading(true);
    listProjects(channelId)
      .then((list) => !cancelled && setProjects(list))
      .catch(() => !cancelled && toast({ title: "No se pudieron leer los proyectos guardados", variant: "destructive" }))
      .finally(() => !cancelled && setLoading(false));
    fetchYouTubeVideos(channelId).then((r) => {
      if (!cancelled && "videos" in r) {
        setLongVideos(r.videos.filter((v) => !v.isShort && (v.privacy === "public" || v.publishAt)).map((v) => ({ id: v.id, title: v.title })));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, toast]);

  // Al abrir un proyecto: su video y los renders guardados
  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setVideo(null);
    setVideoMissing(false);
    setRenders({});
    loadProjectVideo(openId).then((file) => {
      if (cancelled) return;
      setVideo(file);
      setVideoMissing(!file);
    });
    const p = projects.find((x) => x.id === openId);
    if (p) void loadRenders(p).then((r) => !cancelled && setRenders(r)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // Avisar antes de cerrar con un análisis o render en curso
  useEffect(() => {
    if (!busy && !activePlan) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, activePlan]);

  // ---------- Guardado ----------
  const commit = useCallback(
    (next: ShortsProject, immediate = false) => {
      setProjects((list) => [next, ...list.filter((p) => p.id !== next.id)]);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const write = () =>
        saveProject(next).catch(() => toast({ title: "No se pudo guardar el proyecto", description: "Revisa el espacio libre del disco.", variant: "destructive" }));
      if (immediate) void write();
      else saveTimer.current = setTimeout(write, 400);
    },
    [toast]
  );

  const learnings = useCallback(async () => {
    if (!channelId) return [];
    if (learningsRef.current?.channel === channelId) return learningsRef.current.data;
    const data = await channelLearnings(channelId).catch(() => [] as ChannelLearning[]);
    learningsRef.current = { channel: channelId, data };
    return data;
  }, [channelId]);

  const aiContext = useCallback(
    async (p: ShortsProject, extraNotes = "") => ({
      language: p.language,
      profile,
      cues: p.cues,
      duration: p.duration,
      videoTitle: p.relatedVideo?.title ?? p.name,
      notes: [p.notes, extraNotes].filter(Boolean).join("\n"),
      learnings: await learnings(),
    }),
    [profile, learnings]
  );

  // ---------- Análisis con IA (dos pasadas) ----------
  const analyze = async (start: ShortsProject) => {
    let p: ShortsProject = { ...start, stage: "explorando", error: undefined };
    commit(p, true);
    try {
      setStep({ key: "explorando" });
      const ctx = await aiContext(p);
      const scout = await scoutMoments(ctx);
      p = { ...p, stage: "editando", candidates: scout.candidates, overview: scout.overview };
      commit(p, true);
      setStep({ key: "editando" });
      const edit = await editShorts(ctx, scout.candidates, p.count);
      p = { ...p, stage: "listo", plans: edit.plans, discarded: edit.discarded, selectionNotes: edit.notes };
      commit(p, true);
      toast({
        title: edit.plans.length ? `${edit.plans.length} ${edit.plans.length === 1 ? "Short listo" : "Shorts listos"} para revisar` : "Ningún momento pasó el corte",
        description: edit.plans.length ? "Míralos, ajusta lo que quieras y renderiza." : "El crítico no encontró momentos de 70+ puntos. Revisa los descartados o agrega indicaciones.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      commit({ ...p, stage: "error", error: message }, true);
      toast({ title: "La IA no pudo terminar", description: message, variant: "destructive" });
    } finally {
      setStep(null);
    }
  };

  const create = async () => {
    if (!channelId || !videoFile) return;
    setStep({ key: "lectura" });
    try {
      const info = await getVideoInfo(videoFile);
      let cues = subFile ? parseSubtitles(await subFile.text()) : [];
      if (subFile && !cues.length) throw new Error("El archivo de subtítulos está vacío o no es .srt/.vtt.");
      if (!cues.length) {
        setStep({ key: "lectura", detail: "Extrayendo el audio…" });
        const chunks = await extractAudioChunks(videoFile);
        cues = await transcribeAudio(chunks, (done, total) => setStep({ key: "lectura", detail: `Transcribiendo ${Math.min(done + 1, total)} de ${total}…` }));
      }
      if (!cues.length) throw new Error("No se encontró texto en el video.");
      const related = longVideos.find((v) => v.id === relatedId) ?? null;
      const p = newProject(channelId, {
        name: name.trim() || videoFile.name.replace(/\.[^.]+$/, ""),
        language,
        notes: notes.trim(),
        count: Number(count),
        duration: info.duration,
        width: info.width,
        height: info.height,
        cues,
        relatedVideo: related,
      });
      setStep({ key: "lectura", detail: "Guardando el video en este navegador…" });
      await saveProject(p, videoFile);
      setProjects((list) => [p, ...list]);
      setOpenId(p.id);
      setFormOpen(false);
      setVideoFile(null);
      setSubFile(null);
      setName("");
      setNotes("");
      setRelatedId(NO_RELATED);
      await analyze(p);
    } catch (e) {
      setStep(null);
      toast({ title: "No se pudo crear el proyecto", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  // ---------- Acciones sobre los Shorts ----------
  const setPlan = (plan: ShortPlan) => {
    if (!project) return;
    commit({ ...project, plans: project.plans.map((x) => (x.id === plan.id ? plan : x)) });
  };

  const revise = async (plan: ShortPlan, instruction: string) => {
    if (!project) return;
    const ctx = await aiContext(project);
    const revised = await reviseShort(ctx, plan, project.candidates, instruction);
    const latest = projects.find((p) => p.id === project.id) ?? project;
    commit({ ...latest, plans: latest.plans.map((x) => (x.id === plan.id ? revised : x)) }, true);
    toast({ title: "Short corregido", description: revised.editingNotes || "Revisa la vista previa." });
  };

  const editCandidate = async (candidate: ShortCandidate) => {
    if (!project) return;
    setStep({ key: "editando", detail: `Editando el momento ${formatTimestamp(candidate.start)}…` });
    try {
      const ctx = await aiContext(project, "The creator hand-picked this moment: edit it as a Short and keep it even if it scores below 70.");
      const { plans } = await editShorts(ctx, [candidate], 1);
      if (!plans.length) throw new Error("La IA no devolvió el Short.");
      const latest = projects.find((p) => p.id === project.id) ?? project;
      commit(
        { ...latest, plans: [...latest.plans, ...plans], discarded: latest.discarded.filter((d) => d.candidateIndex !== candidate.index) },
        true
      );
    } catch (e) {
      toast({ title: "No se pudo editar ese momento", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setStep(null);
    }
  };

  const rendered = async (render: StoredRender) => {
    if (!project) return;
    await saveRender(project.id, render).catch(() =>
      toast({ title: "El render no quedó guardado", description: "Bájalo ahora: falta espacio en el disco.", variant: "destructive" })
    );
    setRenders((r) => ({ ...r, [render.planId]: render }));
  };

  const send = async (plan: ShortPlan) => {
    const render = renders[plan.id];
    if (!project || !render) return;
    try {
      const draftId = await sendShortToSchedule(project, plan, render, profile);
      commit({ ...project, sentToSchedule: { ...project.sentToSchedule, [plan.id]: draftId } }, true);
      toast({
        title: "Short enviado a Programación",
        description: "Quedó como borrador con título, descripción, subtítulos y comentario. Ponle fecha y prográmalo.",
      });
    } catch (e) {
      toast({ title: "No se pudo enviar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const relink = async (file: File | undefined) => {
    if (!project || !file) return;
    const info = await getVideoInfo(file).catch(() => null);
    if (!info || Math.abs(info.duration - project.duration) > 2) {
      toast({ title: "Ese no parece el mismo video", description: "La duración no coincide con la del proyecto.", variant: "destructive" });
      return;
    }
    await saveProject(project, file);
    setVideo(file);
    setVideoMissing(false);
  };

  const removeProject = async (p: ShortsProject) => {
    if (!window.confirm(`¿Borrar el proyecto "${p.name}" y sus Shorts renderizados de este navegador?`)) return;
    await deleteProject(p);
    setProjects((list) => list.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
  };

  // ---------- Vistas ----------
  if (!channel) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title="Conecta tu canal de YouTube"
          description="La fábrica de Shorts usa el perfil del canal y el rendimiento de tus Shorts para elegir mejor."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const header = (
    <StudioPageHeader
      eyebrow="YouTube"
      title="Shorts"
      subtitle="Sube un video largo: la IA encuentra los momentos con más potencial viral, los edita como un editor profesional y los deja listos para programar."
      actions={
        <>
          {channels.length > 1 && (
            <Select value={channel.id} onValueChange={select} disabled={busy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSoundsOpen(true)}>
            <Music2 className="h-4 w-4" />
            Sonidos
          </Button>
          {!project && (
            <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)} disabled={busy}>
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Button>
          )}
        </>
      }
    />
  );

  const progress = step && (
    <StudioCard className="space-y-3 p-4">
      {STEPS.map((s, i) => {
        const current = STEPS.findIndex((x) => x.key === step.key);
        const state = i < current ? "done" : i === current ? "now" : "later";
        return (
          <div key={s.key} className={cn("flex items-center gap-3 text-sm", state === "later" && "opacity-40")}>
            {state === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : state === "now" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-border" />
            )}
            <span className={state === "now" ? "font-medium text-foreground" : "text-muted-foreground"}>{s.label}</span>
            {state === "now" && step.detail && <span className="text-xs text-muted-foreground">· {step.detail}</span>}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">La IA lee todo el video con calma: puede tomar 1 a 3 minutos. No cierres esta pestaña.</p>
    </StudioCard>
  );

  // Proyecto abierto
  if (project) {
    const discardedFor = (index: number) => project.discarded.find((d) => d.candidateIndex === index);
    const chosen = new Set(project.plans.map((p) => p.candidateIndex));
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        {header}
        <input ref={relinkRef} type="file" accept="video/*" className="hidden" onChange={(e) => void relink(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setOpenId(null)} disabled={busy || Boolean(activePlan)}>
            <ArrowLeft className="h-4 w-4" />
            Proyectos
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void analyze(project)} disabled={busy || Boolean(activePlan)}>
              <RefreshCw className="h-4 w-4" />
              Buscar de nuevo
            </Button>
          </div>
        </div>

        <StudioCard className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <FileVideo className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground">{project.name}</p>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(project.duration)} · {project.cues.length} subtítulos · {LANGUAGES[project.language] ?? project.language}
              {project.relatedVideo ? ` · lleva a "${project.relatedVideo.title}"` : ""}
            </span>
          </div>
          {project.overview && <p className="text-sm text-muted-foreground">{project.overview}</p>}
          {project.selectionNotes && <p className="text-sm text-muted-foreground">{project.selectionNotes}</p>}
          {project.stage === "error" && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {project.error} · usa "Buscar de nuevo".
            </p>
          )}
        </StudioCard>

        {progress}

        {videoMissing && (
          <StudioCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">El video de este proyecto ya no está guardado en este navegador. Vuelve a elegir el mismo archivo para renderizar.</p>
            <Button size="sm" onClick={() => relinkRef.current?.click()}>
              Elegir el video
            </Button>
          </StudioCard>
        )}

        {video && project.plans.length > 0 && (
          <div className="space-y-4">
            {project.plans.map((plan, i) => (
              <ShortPlanCard
                key={plan.id}
                rank={i + 1}
                plan={plan}
                cues={project.cues}
                file={video}
                render={renders[plan.id] ?? null}
                locked={Boolean(activePlan && activePlan !== plan.id) || busy}
                scheduledDraftId={project.sentToSchedule[plan.id]}
                onChange={setPlan}
                onRevise={(instruction) => revise(plan, instruction)}
                onRendered={rendered}
                onSend={() => send(plan)}
                onDelete={() => commit({ ...project, plans: project.plans.filter((x) => x.id !== plan.id) }, true)}
                onActive={(active) => setActivePlan(active ? plan.id : null)}
              />
            ))}
          </div>
        )}

        {project.stage === "listo" && project.plans.length === 0 && !busy && (
          <EmptyState
            icon={<Scissors className="h-6 w-6" />}
            title="Ningún momento pasó el corte de calidad"
            description="El crítico solo deja pasar Shorts de 70+ puntos. Puedes editar igual uno de los momentos de abajo o buscar de nuevo con indicaciones."
          />
        )}

        {project.candidates.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-foreground hover:text-primary">
                Todos los momentos analizados ({project.candidates.length})
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {project.candidates.map((c) => {
                const discarded = discardedFor(c.index);
                const isChosen = chosen.has(c.index);
                return (
                  <StudioCard key={c.index} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {formatTimestamp(c.start)}–{formatTimestamp(c.end)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5">{ANGLE_LABELS[c.angle] ?? c.angle}</span>
                        <span>gancho {c.hookStrength}/10</span>
                        {isChosen && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Elegido</span>}
                      </p>
                      <p className="text-sm text-foreground">«{c.hookLine}»</p>
                      <p className="text-xs text-muted-foreground">{c.summary} {c.why}</p>
                      {discarded && <p className="text-xs text-amber-300/90">Descartado: {discarded.reason}</p>}
                    </div>
                    {!isChosen && (
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => void editCandidate(c)} disabled={busy || !video}>
                        <WandSparkles className="h-4 w-4" />
                        Editarlo igual
                      </Button>
                    )}
                  </StudioCard>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        <ShortsSoundsDialog open={soundsOpen} onOpenChange={setSoundsOpen} />
      </div>
    );
  }

  // Lista de proyectos + proyecto nuevo
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {header}
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        setVideoFile(f);
        if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
        e.target.value = "";
      }} />
      <input ref={subInputRef} type="file" accept=".srt,.vtt" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        setSubFile(f && isSubtitleFile(f) ? f : null);
        e.target.value = "";
      }} />

      {progress}

      {(formOpen || (!loading && projects.length === 0)) && !busy && (
        <StudioCard className="space-y-5">
          <div>
            <p className="font-semibold text-foreground">Nuevo proyecto de Shorts</p>
            <p className="text-sm text-muted-foreground">El video se procesa en este PC: no se sube a ningún servidor. A la IA solo le llegan los subtítulos.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => videoInputRef.current?.click()}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-primary/60",
                videoFile ? "border-primary/50 bg-primary/5" : "border-border"
              )}
            >
              <FileVideo className="h-6 w-6 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{videoFile ? videoFile.name : "Video largo (horizontal)"}</span>
                <span className="block text-xs text-muted-foreground">
                  {videoFile ? `${(videoFile.size / 1024 ** 2).toFixed(0)} MB` : "El mismo archivo que subiste a YouTube"}
                </span>
              </span>
            </button>
            <button
              onClick={() => subInputRef.current?.click()}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-primary/60",
                subFile ? "border-primary/50 bg-primary/5" : "border-border"
              )}
            >
              <Captions className="h-6 w-6 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{subFile ? subFile.name : "Subtítulos (.srt o .vtt)"}</span>
                <span className="block text-xs text-muted-foreground">{subFile ? "Listo" : "Si no tienes, se transcribe el audio (≈ US$0,006 por minuto)"}</span>
              </span>
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Castigos de Roma" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Idioma del video</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Máximo de Shorts</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <SelectItem key={n} value={n}>
                      Hasta {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Video largo al que llevan los Shorts</Label>
              <Select value={relatedId} onValueChange={setRelatedId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RELATED}>Ninguno por ahora</SelectItem>
                  {longVideos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Indicaciones para la IA (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej: prioriza los castigos más crueles; evita la parte de los impuestos"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {projects.length > 0 && (
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
            )}
            <Button className="gap-1.5" onClick={() => void create()} disabled={!videoFile}>
              <Sparkles className="h-4 w-4" />
              Buscar los mejores momentos
            </Button>
          </div>
        </StudioCard>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        projects.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const best = p.plans.length ? Math.max(...p.plans.map((x) => totalScore(x.score))) : null;
              const sent = Object.keys(p.sentToSchedule).length;
              return (
                <StudioCard key={p.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.updatedAt), "d MMM, HH:mm", { locale: es })} · {formatTimestamp(p.duration)}
                      </p>
                    </div>
                    {best !== null && <span className={cn("rounded-lg px-2 py-1 text-sm font-bold ring-1", scoreTone(best))}>{best}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.stage === "listo"
                      ? `${p.plans.length} ${p.plans.length === 1 ? "Short" : "Shorts"}${sent ? ` · ${sent} en Programación` : ""}`
                      : p.stage === "error"
                        ? "Se interrumpió el análisis"
                        : "Análisis sin terminar"}
                  </p>
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setOpenId(p.id)} disabled={busy}>
                      Abrir
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => void removeProject(p)} disabled={busy}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </StudioCard>
              );
            })}
          </div>
        )
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-foreground hover:text-primary">
            Cómo decide la IA qué momentos se vuelven Shorts
            <ChevronDown className="h-4 w-4" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <StudioCard className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">1. Explorador:</strong> lee todos los subtítulos con sus tiempos y propone 8-10 momentos que se entienden solos y tienen
              un gancho fuerte.
            </p>
            <p>
              <strong className="text-foreground">2. Crítico:</strong> los puntúa con esta rúbrica (sobre 100) y solo deja pasar los de 70 o más. Calidad antes que
              cantidad.
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((k) => (
                <li key={k}>
                  · <span className="text-foreground">{SCORE_LABELS[k].label}</span>: {SCORE_LABELS[k].help}
                </li>
              ))}
            </ul>
            <p>
              <strong className="text-foreground">3. Editor:</strong> escribe el guion de edición de cada Short: dónde cortar (incluido abrir con la frase más fuerte),
              zooms en las palabras clave, blanco y negro en la escena más dramática, congelados con texto gigante, golpes, whoosh y subidas de tensión, y la
              música según el ánimo, con un silencio justo antes del remate.
            </p>
            <p>
              <strong className="text-foreground">4. Aprende de tu canal:</strong> en cada análisis recibe cómo les fue a tus Shorts de los últimos 90 días (vistas y %
              visto) y prioriza los ganchos y temas que mejor te funcionan.
            </p>
          </StudioCard>
        </CollapsibleContent>
      </Collapsible>

      <ShortsSoundsDialog open={soundsOpen} onOpenChange={setSoundsOpen} />
    </div>
  );
}
