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
  FolderOpen,
  Lightbulb,
  Loader2,
  Music2,
  PlugZap,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReelComposerDialog } from "@/components/studio/instagram/ReelComposerDialog";
import { ShortIdeasSheet, SourceLevelChip } from "@/components/studio/ShortIdeasSheet";
import { ShortPlanCard, scoreTone } from "@/components/studio/ShortPlanCard";
import { ShortsSoundsDialog } from "@/components/studio/ShortsSoundsDialog";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useInstagramAccount } from "@/hooks/use-instagram-account";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import { LANGUAGES, normalizeProfile, transcribeAudio } from "@/lib/studio/ai";
import { factoryShortFrom, listAccountPublications, reelOccupants, type FactoryShort } from "@/lib/studio/instagram";
import { hasPublishPlan, normalizePlan, type Occupant } from "@/lib/studio/publish-plan";
import { extractAudioChunks, getVideoInfo } from "@/lib/studio/media";
import {
  ANGLE_LABELS,
  canUseLocalFiles,
  channelLearnings,
  chooseShortsFolder,
  deleteProject,
  editShorts,
  getShortsFolder,
  hasAccess,
  listProjects,
  loadProjectVideo,
  loadRenders,
  newProject,
  pickVideoFile,
  reviseShort,
  SaturatedError,
  saveProject,
  saveRender,
  scoutMoments,
  sendShortToSchedule,
  SCORE_LABELS,
  shortsSourceRef,
  totalScore,
  type AiContext,
  type ChannelLearning,
  type ShortCandidate,
  type ShortPlan,
  type ShortsProject,
  type StoredRender,
} from "@/lib/studio/shorts";
import {
  listIdeas,
  openFrameHash,
  registerPlans,
  setIdeaStatus,
  setOpenFrameHash,
  similarOpenFrame,
  sourceKeyFor,
  sourceOf,
  sourceSummary,
  type IdeaCheckItem,
  type ShortIdea,
  type SourceStatus,
} from "@/lib/studio/short-ideas";
import { takeShortsWave } from "@/lib/studio/performance-ai";
import { parseSubtitles, isSubtitleFile, formatTimestamp } from "@/lib/studio/subtitles";
import { listSourceRefs, type RelatedVideo } from "@/lib/studio/video-tasks";
import { fetchYouTubeVideos } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "lectura", label: "Leyendo los subtítulos" },
  { key: "explorando", label: "Explorador: buscando momentos con potencial" },
  { key: "editando", label: "Crítico y editor: puntuando y editando los mejores" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const NO_RELATED = "none";

// Contra el contenido repetitivo: cada Short del lote cumple un papel distinto y deja una conclusión distinta
const ONE_IDEA_RULE =
  "UN SHORT = UNA IDEA, UN ÁNGULO Y UN GANCHO. Cada Short del lote debe dejar una conclusión distinta: no repitas la misma tesis (por ejemplo, 'los ricos se salvaban y tú no') con otro ejemplo. Reparte papeles distintos: el error común sobre el tema, el dato que cambia la conclusión, una comparación rápida, lo que nadie te cuenta, un caso concreto, una pregunta directa a la audiencia o el clip gancho que lleva al video largo. Si dos candidatos dicen lo mismo, quédate solo con el mejor.";

export default function YouTubeShorts() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "youtube") notFound();

  const { channels, channel, select } = useYouTubeChannel();
  const { account: igAccount } = useInstagramAccount();
  const { tenantId } = useEffectiveTenant();
  const { toast } = useToast();
  const profile = useMemo(() => normalizeProfile(channel?.aiProfile), [channel]);
  const channelId = channel?.id;
  // "También a Instagram": el compositor de Reels con este render ya elegido
  const [reelShort, setReelShort] = useState<FactoryShort | null>(null);
  const [igOccupants, setIgOccupants] = useState<Occupant[]>([]);
  const igPlan = useMemo(() => (hasPublishPlan(igAccount?.publishPlan) ? normalizePlan(igAccount?.publishPlan) : null), [igAccount]);
  const igAccountId = igAccount?.id;
  const reelOpen = reelShort !== null;

  useEffect(() => {
    if (!reelOpen || !igAccountId) return;
    let cancelled = false;
    listAccountPublications(igAccountId)
      .then((list) => !cancelled && setIgOccupants(reelOccupants(list)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reelOpen, igAccountId]);

  const [projects, setProjects] = useState<ShortsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoMissing, setVideoMissing] = useState(false);
  const [videoLocked, setVideoLocked] = useState(false);
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderReady, setFolderReady] = useState(false);
  const [renders, setRenders] = useState<Record<string, StoredRender>>({});
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [step, setStep] = useState<{ key: StepKey; detail?: string } | null>(null);
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [longVideos, setLongVideos] = useState<RelatedVideo[]>([]);
  // Registro de ideas del canal: se lee al abrir y después de cada acción (sin polling)
  const [ideas, setIdeas] = useState<ShortIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  /** Huella del cuadro de apertura de los renders de esta sesión (planId -> dHash) */
  const [frameHashes, setFrameHashes] = useState<Record<string, string>>({});
  /** Lo que se repite con "Sacar igual" cuando el episodio está agotado */
  const [saturatedRetry, setSaturatedRetry] = useState<{ projectId: string; candidate: ShortCandidate | null } | null>(null);
  /** Plan que se está replicando a Instagram (para marcar su idea como usada al guardar) */
  const [reelIdeaId, setReelIdeaId] = useState<string | null>(null);

  // Formulario de proyecto nuevo
  const [formOpen, setFormOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoHandle, setVideoHandle] = useState<FileSystemFileHandle | null>(null);
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
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const registering = useRef(new Set<string>());
  const busy = Boolean(step);
  const localFiles = useMemo(() => canUseLocalFiles(), []);

  useEffect(() => setLanguage(profile.language), [profile.language]);

  // Carpeta del PC donde se guardan los Shorts (se elige una vez)
  useEffect(() => {
    if (!localFiles) return;
    void getShortsFolder()
      .then(async (dir) => {
        setFolder(dir);
        setFolderReady(dir ? await hasAccess(dir, "readwrite").catch(() => false) : false);
      })
      .catch(() => undefined);
  }, [localFiles]);

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

  const channelRef = useRef(channelId);
  channelRef.current = channelId;
  const reloadIdeas = useCallback(async () => {
    if (!channelId) return;
    setIdeasLoading(true);
    try {
      const list = await listIdeas(channelId);
      // Si se cambió de canal mientras se leía, la respuesta ya no sirve
      if (channelRef.current === channelId) setIdeas(list);
    } catch {
      // Sin registro la Fábrica funciona igual
    } finally {
      setIdeasLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    setIdeas([]);
    void reloadIdeas();
  }, [reloadIdeas]);

  // Modo ola (viene de Rendimiento): el tema que está funcionando y el video al que deben llevar los Shorts
  useEffect(() => {
    const wave = takeShortsWave();
    if (!wave) return;
    setName(wave.name);
    setNotes(wave.notes);
    if (wave.relatedVideoId) setRelatedId(wave.relatedVideoId);
    setOpenId(null);
    setFormOpen(true);
    toast({ title: "Modo ola", description: "Elige el archivo del video largo: la IA va a priorizar el tema que está despegando." });
  }, [toast]);

  // Al abrir un proyecto: su video y los renders guardados
  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setVideo(null);
    setVideoMissing(false);
    setVideoLocked(false);
    setRenders({});
    loadProjectVideo(openId).then(({ file, handle }) => {
      if (cancelled) return;
      setVideo(file);
      setVideoLocked(!file && Boolean(handle));
      setVideoMissing(!file && !handle);
    });
    const p = projects.find((x) => x.id === openId);
    if (p) void loadRenders(p, folder).then((r) => !cancelled && setRenders(r)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, folderReady]);

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

  // Proyectos de antes del registro: se anotan una sola vez al abrirlos, en segundo plano y sin avisos
  useEffect(() => {
    const p = projectsRef.current.find((x) => x.id === openId);
    if (!p || p.registeredAt || !p.plans.some((x) => !x.idea?.id) || registering.current.has(p.id)) return;
    registering.current.add(p.id);
    void (async () => {
      try {
        const sourceKey = p.sourceKey ?? (await sourceKeyFor(p));
        const [igRefs, ytRefs] = await Promise.all([
          igAccountId
            ? listAccountPublications(igAccountId)
                .then((list) => new Set(list.map((x) => x.sourceRef)))
                .catch(() => new Set<string | null>())
            : Promise.resolve(new Set<string | null>()),
          listSourceRefs(p.accountId).catch(() => new Map<string, string>()),
        ]);
        const ytByRef = new Map([...ytRefs].map(([videoId, ref]) => [ref, videoId]));
        const items = p.plans
          .filter((x) => !x.idea?.id)
          .map((plan) => {
            const ref = shortsSourceRef(p.id, plan.id);
            return { plan, used: Boolean(p.sentToSchedule[plan.id]) || igRefs.has(ref), youtubeVideoId: ytByRef.get(ref) ?? null };
          });
        const { ideas: registered, registryError } = await registerPlans(p, items, sourceOf(p, sourceKey));
        if (registryError || !registered.size) return;
        const latest = projectsRef.current.find((x) => x.id === p.id) ?? p;
        commit(
          {
            ...latest,
            sourceKey,
            registeredAt: new Date().toISOString(),
            plans: latest.plans.map((plan) => {
              const idea = registered.get(plan.id);
              return idea ? { ...plan, idea } : plan;
            }),
          },
          true
        );
        void reloadIdeas();
      } catch {
        // Se reintenta la próxima vez que se abra el proyecto
      } finally {
        registering.current.delete(p.id);
      }
    })();
  }, [openId, igAccountId, commit, reloadIdeas]);

  const learnings = useCallback(async () => {
    if (!channelId) return [];
    if (learningsRef.current?.channel === channelId) return learningsRef.current.data;
    const data = await channelLearnings(channelId).catch(() => [] as ChannelLearning[]);
    learningsRef.current = { channel: channelId, data };
    return data;
  }, [channelId]);

  // El historial real del canal (tramos usados, ganchos, formatos) lo lee n8n desde el registro de ideas
  const aiContext = useCallback(
    async (p: ShortsProject, extraNotes = "", opts: { manual?: boolean; overrideBudget?: boolean } = {}): Promise<AiContext> => {
      const key = p.sourceKey ?? (await sourceKeyFor(p));
      return {
        language: p.language,
        profile,
        cues: p.cues,
        duration: p.duration,
        videoTitle: p.relatedVideo?.title ?? p.name,
        notes: [p.notes, ONE_IDEA_RULE, extraNotes].filter(Boolean).join("\n"),
        learnings: await learnings(),
        accountId: p.accountId,
        projectId: p.id,
        source: sourceOf(p, key),
        ...opts,
      };
    },
    [profile, learnings]
  );

  /** Estado del episodio para mostrar: el último de n8n o, si no hay, el calculado con el registro */
  const statusOf = useCallback(
    (p: ShortsProject): SourceStatus | null => {
      if (saturatedRetry?.projectId === p.id && p.sourceStatus) return p.sourceStatus;
      if (!p.sourceKey) return p.sourceStatus ?? null;
      if (ideas.some((i) => i.sourceKey === p.sourceKey)) return sourceSummary(ideas, p.sourceKey, p.duration);
      return p.sourceStatus ?? null;
    },
    [ideas, saturatedRetry]
  );

  /** Episodio agotado: no es un error, se guarda el estado y se muestra el aviso con sus botones */
  const handleSaturated = (p: ShortsProject, e: SaturatedError, candidate: ShortCandidate | null) => {
    const fallback = p.sourceKey ? sourceSummary(ideas, p.sourceKey, p.duration) : null;
    const sourceStatus = e.sourceStatus ?? (fallback ? { ...fallback, level: "agotado" as const, message: e.message } : null);
    commit({ ...p, stage: p.plans.length ? "listo" : "nuevo", error: undefined, sourceStatus }, true);
    setSaturatedRetry({ projectId: p.id, candidate });
    toast({ title: "Este episodio ya dio lo que tenía", description: e.message });
  };

  // ---------- Análisis con IA (dos pasadas) ----------
  const analyze = async (start: ShortsProject, overrideBudget = false) => {
    const sourceKey = start.sourceKey ?? (await sourceKeyFor(start));
    // Los Shorts propuestos que no se enviaron se reemplazan con este análisis: salen del registro
    const replaced = start.plans.filter((x) => x.idea?.id && !start.sentToSchedule[x.id]).map((x) => x.idea?.id as string);
    if (replaced.length) await setIdeaStatus(replaced, "descartada").catch(() => undefined);
    let p: ShortsProject = { ...start, sourceKey, stage: "explorando", error: undefined };
    commit(p, true);
    setSaturatedRetry(null);
    try {
      setStep({ key: "explorando" });
      const ctx = await aiContext(p, "", { overrideBudget });
      const scout = await scoutMoments(ctx);
      p = { ...p, stage: "editando", candidates: scout.candidates, overview: scout.overview, sourceStatus: scout.sourceStatus ?? p.sourceStatus ?? null };
      commit(p, true);
      setStep({ key: "editando" });
      const edit = await editShorts(ctx, scout.candidates, p.count);
      p = {
        ...p,
        stage: "listo",
        plans: edit.plans,
        discarded: edit.discarded,
        selectionNotes: edit.notes,
        sourceStatus: edit.sourceStatus ?? p.sourceStatus ?? null,
      };
      commit(p, true);
      // Un solo aviso (la app muestra un toast a la vez): lo principal y después lo del registro
      const repeated = edit.autoDiscarded + scout.removedOverlap;
      const extras = [
        repeated ? `${repeated} ${repeated === 1 ? "momento se descartó" : "momentos se descartaron"} por repetir algo ya hecho. Míralos en Descartados.` : "",
        edit.budgetNotice,
        edit.registryError ? "Los Shorts quedaron listos, pero no se pudieron anotar en el registro." : "",
      ].filter(Boolean);
      toast({
        title: edit.plans.length ? `${edit.plans.length} ${edit.plans.length === 1 ? "Short listo" : "Shorts listos"} para revisar` : "Ningún momento pasó el corte",
        description: [
          edit.plans.length ? "Míralos, ajusta lo que quieras y renderiza." : "El crítico no encontró momentos de 70+ puntos. Revisa los descartados o agrega indicaciones.",
          ...extras,
        ].join(" "),
      });
    } catch (e) {
      if (e instanceof SaturatedError) {
        handleSaturated(p, e, null);
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      commit({ ...p, stage: "error", error: message }, true);
      toast({ title: "La IA no pudo terminar", description: message, variant: "destructive" });
    } finally {
      setStep(null);
      void reloadIdeas();
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
        sourceKey: await sourceKeyFor({ relatedVideo: related, duration: info.duration, width: info.width, height: info.height }),
      });
      if (!videoHandle) setStep({ key: "lectura", detail: "Guardando una copia del video en este navegador…" });
      await saveProject(p, videoHandle ?? videoFile);
      setProjects((list) => [p, ...list]);
      setOpenId(p.id);
      setFormOpen(false);
      setVideoFile(null);
      setVideoHandle(null);
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
    const latest = projectsRef.current.find((p) => p.id === project.id) ?? project;
    commit({ ...latest, plans: latest.plans.map((x) => (x.id === plan.id ? revised : x)) }, true);
    toast({ title: "Short corregido", description: revised.editingNotes || "Revisa la vista previa." });
    void reloadIdeas();
  };

  const editCandidate = async (candidate: ShortCandidate, overrideBudget = false) => {
    if (!project) return;
    setStep({ key: "editando", detail: `Editando el momento ${formatTimestamp(candidate.start)}…` });
    setSaturatedRetry(null);
    try {
      const ctx = await aiContext(project, "The creator hand-picked this moment: edit it as a Short and keep it even if it scores below 70.", {
        manual: true,
        overrideBudget,
      });
      const edit = await editShorts(ctx, [candidate], 1);
      if (!edit.plans.length) throw new Error(edit.discarded[0]?.reason || "La IA no devolvió el Short.");
      const latest = projectsRef.current.find((p) => p.id === project.id) ?? project;
      commit(
        {
          ...latest,
          plans: [...latest.plans, ...edit.plans],
          discarded: latest.discarded.filter((d) => d.candidateIndex !== candidate.index),
          sourceStatus: edit.sourceStatus ?? latest.sourceStatus ?? null,
        },
        true
      );
      const notice = [edit.budgetNotice, edit.registryError ? "El Short quedó listo, pero no se pudo anotar en el registro." : ""].filter(Boolean).join(" ");
      if (notice) toast({ title: "Short listo", description: notice });
    } catch (e) {
      if (e instanceof SaturatedError) {
        handleSaturated(projectsRef.current.find((p) => p.id === project.id) ?? project, e, candidate);
        return;
      }
      toast({ title: "No se pudo editar ese momento", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setStep(null);
      void reloadIdeas();
    }
  };

  /** "Sacar igual": repite lo que frenó el cupo del episodio, esta vez sin el tope */
  const overrideSaturated = () => {
    if (!project) return;
    const retry = saturatedRetry?.projectId === project.id ? saturatedRetry : null;
    if (retry?.candidate) void editCandidate(retry.candidate, true);
    else void analyze(project, true);
  };

  /** "Ir a otro episodio": cierra el proyecto y abre el formulario de uno nuevo */
  const goToOtherEpisode = () => {
    setOpenId(null);
    setSaturatedRetry(null);
    setFormOpen(true);
  };

  const markIdeas = async (ids: (string | null | undefined)[], status: "usada" | "descartada") => {
    const list = ids.filter((id): id is string => Boolean(id));
    if (!list.length) return;
    await setIdeaStatus(list, status).catch(() => undefined);
    void reloadIdeas();
  };

  const removePlan = (plan: ShortPlan) => {
    if (!project) return;
    commit({ ...project, plans: project.plans.filter((x) => x.id !== plan.id) }, true);
    if (!project.sentToSchedule[plan.id]) void markIdeas([plan.idea?.id], "descartada");
  };

  // Antes de renderizar (dentro del clic): pedir la carpeta o su permiso. Si no se da, se guarda en el navegador.
  const folderForRender = useRef<FileSystemDirectoryHandle | null>(null);
  const beforeRender = async () => {
    folderForRender.current = null;
    if (!localFiles) return;
    try {
      let dir = folder;
      if (!dir) {
        dir = await chooseShortsFolder();
        setFolder(dir);
      }
      if (await hasAccess(dir, "readwrite", true)) {
        folderForRender.current = dir;
        setFolderReady(true);
      }
    } catch {
      // Canceló el selector: queda en el navegador
    }
  };

  const rendered = async (render: StoredRender) => {
    if (!project) return;
    void fingerprintOpenFrame(project, render);
    try {
      const saved = await saveRender(project, render, folderForRender.current);
      setRenders((r) => ({ ...r, [render.planId]: saved }));
      toast({
        title: "Short renderizado",
        description: saved.path ? `Guardado en tu carpeta: ${saved.path.join("/")}` : "Revísalo, descárgalo o envíalo a Programación.",
      });
    } catch {
      setRenders((r) => ({ ...r, [render.planId]: render }));
      toast({ title: "El render no quedó guardado", description: "Bájalo ahora con el botón Bajar.", variant: "destructive" });
    }
  };

  /** Huella del primer segundo del Short (sin subir el video): sirve para no abrir igual que otro reciente */
  const fingerprintOpenFrame = async (p: ShortsProject, render: StoredRender) => {
    try {
      const hash = await openFrameHash(render.file);
      setFrameHashes((h) => ({ ...h, [`${render.planId}:${render.revision}`]: hash }));
      const ideaId = p.plans.find((x) => x.id === render.planId)?.idea?.id;
      if (ideaId) await setOpenFrameHash(ideaId, hash);
    } catch {
      // Sin huella solo se omite ese punto de la lista de control
    }
  };

  /** Puntos de la lista de control que calcula la app (los demás vienen de n8n) */
  const appChecksFor = (p: ShortsProject, plan: ShortPlan): IdeaCheckItem[] => {
    const checks: IdeaCheckItem[] = [
      p.relatedVideo
        ? { key: "video_relacionado", label: "Lleva al episodio correcto", ok: true, detail: "" }
        : { key: "video_relacionado", label: "Lleva al episodio correcto", ok: false, detail: "El proyecto no tiene episodio de YouTube elegido." },
    ];
    const render = renders[plan.id];
    const hash = render && render.revision === plan.revision ? frameHashes[`${plan.id}:${plan.revision}`] : undefined;
    if (hash) {
      const twin = similarOpenFrame(hash, plan.idea?.id ?? null, ideas);
      checks.push(
        twin
          ? { key: "cuadro_apertura", label: "Abre distinto a los Shorts recientes", ok: false, detail: `Abre con una imagen casi igual a «${twin.title}».` }
          : { key: "cuadro_apertura", label: "Abre distinto a los Shorts recientes", ok: true, detail: "" }
      );
    }
    return checks;
  };

  const pickFolder = async () => {
    try {
      const dir = await chooseShortsFolder();
      setFolder(dir);
      setFolderReady(await hasAccess(dir, "readwrite", true));
    } catch {
      // Canceló
    }
  };

  const unlockFolder = async () => {
    if (folder && (await hasAccess(folder, "readwrite", true).catch(() => false))) setFolderReady(true);
  };

  const unlockVideo = async () => {
    if (!openId) return;
    const { file } = await loadProjectVideo(openId, true);
    if (file) {
      setVideo(file);
      setVideoLocked(false);
    }
  };

  const chooseVideo = async () => {
    if (!localFiles) {
      videoInputRef.current?.click();
      return;
    }
    const picked = await pickVideoFile();
    if (!picked) return;
    setVideoFile(picked.file);
    setVideoHandle(picked.handle);
    if (!name) setName(picked.file.name.replace(/\.[^.]+$/, ""));
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
      void markIdeas([plan.idea?.id], "usada");
    } catch (e) {
      toast({ title: "No se pudo enviar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const relink = async (file: File | undefined, handle?: FileSystemFileHandle) => {
    if (!project || !file) return;
    const info = await getVideoInfo(file).catch(() => null);
    if (!info || Math.abs(info.duration - project.duration) > 2) {
      toast({ title: "Ese no parece el mismo video", description: "La duración no coincide con la del proyecto.", variant: "destructive" });
      return;
    }
    await saveProject(project, handle ?? file);
    setVideo(file);
    setVideoMissing(false);
  };

  const removeProject = async (p: ShortsProject) => {
    if (!window.confirm(`¿Borrar el proyecto "${p.name}" y sus Shorts renderizados de este navegador?`)) return;
    await deleteProject(p);
    setProjects((list) => list.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
    // Lo ya usado queda en el registro; solo salen las propuestas que nunca se enviaron
    const proposed = ideas.filter((i) => i.projectId === p.id && i.stage === "propuesta").map((i) => i.id);
    void markIdeas(proposed, "descartada");
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
          {localFiles && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void pickFolder()} disabled={busy || Boolean(activePlan)} title="Carpeta de tu PC donde se guardan los Shorts">
              <FolderOpen className="h-4 w-4" />
              {folder ? `Carpeta: ${folder.name}` : "Elegir carpeta"}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setIdeasOpen(true)} title="Todos los Shorts del canal por episodio">
            <Lightbulb className="h-4 w-4" />
            Registro de ideas
          </Button>
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

  const relatedKey = relatedId !== NO_RELATED ? `yt:${relatedId}` : null;
  const relatedSummary = relatedKey && ideas.some((i) => i.sourceKey === relatedKey) ? sourceSummary(ideas, relatedKey, 0) : null;
  const ideasSheet = <ShortIdeasSheet open={ideasOpen} onOpenChange={setIdeasOpen} ideas={ideas} loading={ideasLoading} />;

  // Proyecto abierto
  if (project) {
    const discardedFor = (index: number) => project.discarded.find((d) => d.candidateIndex === index);
    const chosen = new Set(project.plans.map((p) => p.candidateIndex));
    const episode = statusOf(project);
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        {header}
        {ideasSheet}
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

        {episode && episode.level !== "ok" && episode.message && (
          <div
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
              episode.level === "agotado" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"
            )}
          >
            <p className={cn("flex items-start gap-2 text-sm", episode.level === "agotado" ? "text-red-200" : "text-amber-200")}>
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {episode.message}
            </p>
            {episode.level === "agotado" && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={goToOtherEpisode} disabled={busy || Boolean(activePlan)}>
                  Ir a otro episodio
                </Button>
                <Button size="sm" variant="outline" onClick={overrideSaturated} disabled={busy || Boolean(activePlan)}>
                  Sacar igual
                </Button>
              </div>
            )}
          </div>
        )}

        {progress}

        {videoMissing && (
          <StudioCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">El video de este proyecto ya no está guardado en este navegador. Vuelve a elegir el mismo archivo para renderizar.</p>
            <Button
              size="sm"
              onClick={async () => {
                if (!localFiles) return relinkRef.current?.click();
                const picked = await pickVideoFile();
                if (picked) await relink(picked.file, picked.handle);
              }}
            >
              Elegir el video
            </Button>
          </StudioCard>
        )}

        {videoLocked && (
          <StudioCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">El video está en tu PC: dale acceso otra vez para ver y renderizar los Shorts.</p>
            <Button size="sm" onClick={() => void unlockVideo()}>
              Dar acceso al video
            </Button>
          </StudioCard>
        )}

        {folder && !folderReady && (
          <StudioCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Para mostrar los Shorts ya guardados en la carpeta "{folder.name}", dale acceso otra vez.</p>
            <Button size="sm" variant="secondary" onClick={() => void unlockFolder()}>
              Permitir acceso a la carpeta
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
                appChecks={appChecksFor(project, plan)}
                onChange={setPlan}
                onRevise={(instruction) => revise(plan, instruction)}
                onBeforeRender={beforeRender}
                onRendered={rendered}
                onSend={() => send(plan)}
                onSendInstagram={
                  igAccount && renders[plan.id]
                    ? () => {
                        setReelIdeaId(plan.idea?.id ?? null);
                        setReelShort(factoryShortFrom(project, plan, renders[plan.id]));
                      }
                    : undefined
                }
                onDelete={() => removePlan(plan)}
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

        {igAccount && (
          <ReelComposerDialog
            open={reelShort !== null}
            onOpenChange={(open) => !open && setReelShort(null)}
            account={igAccount}
            youtubeChannel={channel}
            tenantId={tenantId}
            publication={null}
            initialShort={reelShort}
            plan={igPlan}
            occupants={igOccupants}
            onSaved={(publication) => {
              if (publication) void markIdeas([reelIdeaId], "usada");
            }}
          />
        )}
      </div>
    );
  }

  // Lista de proyectos + proyecto nuevo
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {header}
      {ideasSheet}
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        setVideoFile(f);
        setVideoHandle(null);
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
            <p className="text-sm text-muted-foreground">
              El video se procesa en este PC: no se sube a ningún servidor y {localFiles ? "se lee desde donde está (no se copia)" : "se guarda una copia en este navegador"}. A
              la IA solo le llegan los subtítulos.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => void chooseVideo()}
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
              {relatedSummary ? (
                <p className={cn("text-xs", relatedSummary.level === "agotado" ? "text-red-300" : relatedSummary.level === "casi" ? "text-amber-300" : "text-muted-foreground")}>
                  Este episodio ya tiene {relatedSummary.used} de {relatedSummary.budget} Shorts · {relatedSummary.coveragePct} % del video usado
                  {relatedSummary.level === "agotado" ? ". Te conviene elegir otro episodio." : ""}
                </p>
              ) : (
                relatedId === NO_RELATED && (
                  <p className="text-xs text-muted-foreground">
                    Elige el episodio de YouTube: así el registro sabe de qué episodio sale cada Short y el Short lleva al episodio correcto.
                  </p>
                )
              )}
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
              const episode = statusOf(p);
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
                  {episode && <SourceLevelChip status={episode} className="self-start" />}
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
