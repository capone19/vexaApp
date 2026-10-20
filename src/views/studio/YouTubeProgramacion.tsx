import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Captions,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileVideo,
  ImageIcon,
  MessageSquareText,
  Loader2,
  PlugZap,
  Plus,
  Rocket,
  Settings2,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  UploadCloud,
  WandSparkles,
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
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelProfileDialog } from "@/components/studio/ChannelProfileDialog";
import { PublishPlanDialog } from "@/components/studio/PublishPlanDialog";
import { RescheduleDialog } from "@/components/studio/RescheduleDialog";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { YouTubeDraftEditor } from "@/components/studio/YouTubeDraftEditor";
import { PendingTasksPanel, VideoExtrasDialog } from "@/components/studio/VideoTasks";
import { toLocalInput } from "@/components/studio/YouTubeUploadDialog";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import { normalizeProfile } from "@/lib/studio/ai";
import {
  addDays,
  freeSlots,
  MIN_LEAD_MS,
  normalizePlan,
  sameDay,
  SLOT_FORMAT_LABELS,
  slotsBetween,
  startOfWeek,
  type Occupant,
  type PlanSlot,
  type PublishPlan,
  type SlotFormat,
} from "@/lib/studio/publish-plan";
import { formatFollowers } from "@/lib/studio/platforms";
import { listVideoTasks, rescheduleVideoTask, type RelatedVideo, type VideoTask } from "@/lib/studio/video-tasks";
import { fetchYouTubeVideos, scheduleTimes, YOUTUBE_ERROR_MESSAGES, type YouTubeVideo } from "@/lib/studio/youtube";
import {
  baseName,
  DAILY_QUOTA,
  deleteDraft,
  draftProblems,
  fillDraftWithAi,
  inspectVideo,
  listDrafts,
  newDraft,
  publishDraft,
  quotaUnits,
  saveDraft,
  type DraftFileKey,
  type YouTubeDraft,
} from "@/lib/studio/youtube-draft";
import { rescheduleYouTubeVideo, YOUTUBE_MIN_LEAD_MS } from "@/lib/studio/youtube-upload";
import { cn } from "@/lib/utils";

type Entry =
  | { kind: "youtube"; key: string; at: Date; format: SlotFormat; video: YouTubeVideo; scheduled: boolean }
  | { kind: "draft"; key: string; at: Date; format: SlotFormat; draft: YouTubeDraft }
  | { kind: "free"; key: string; at: Date; format: SlotFormat; slot: PlanSlot };

interface UploadState {
  id: string;
  title: string;
  status: string;
  progress: number;
  done: number;
  total: number;
}

const FILE_KEYS: DraftFileKey[] = ["file", "subtitleFile", "thumbnailFile"];
const WEEKS_AHEAD = 12;
const time = (d: Date) => format(d, "HH:mm");

/** Contenido del canal que ocupa el calendario: programados (privados con fecha) y publicados */
function youtubeEntries(videos: YouTubeVideo[]): Extract<Entry, { kind: "youtube" }>[] {
  return scheduleTimes(videos).map(({ video, at, scheduled }) => ({
    kind: "youtube" as const,
    key: `yt-${video.id}`,
    at,
    format: video.isShort ? "short" : "video",
    video,
    scheduled,
  }));
}

function sortDrafts(list: YouTubeDraft[]) {
  return [...list].sort(
    (a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9") || a.createdAt.localeCompare(b.createdAt)
  );
}

/** Primer espacio libre del formato desde ahora, mirando hasta WEEKS_AHEAD semanas */
function findFreeSlot(plan: PublishPlan, formatWanted: SlotFormat, occupants: Occupant[]): PlanSlot | null {
  const from = new Date(Date.now() + MIN_LEAD_MS);
  const to = addDays(startOfWeek(from), 7 * WEEKS_AHEAD);
  const slots = slotsBetween(plan, from, to).filter((s) => s.format === formatWanted);
  return freeSlots(slots, occupants.filter((o) => o.at >= from))[0] ?? null;
}

export default function YouTubeProgramacion() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "youtube") notFound();

  const { channels, channel, select } = useYouTubeChannel();
  const { addPost } = useStudio();
  const { toast } = useToast();
  const plan = useMemo(() => normalizePlan(channel?.publishPlan), [channel]);
  const profile = useMemo(() => normalizeProfile(channel?.aiProfile), [channel]);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [drafts, setDrafts] = useState<YouTubeDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [aiRun, setAiRun] = useState<{ done: number; total: number; step: string } | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [extrasVideo, setExtrasVideo] = useState<YouTubeVideo | null>(null);
  const [rescheduling, setRescheduling] = useState<Extract<Entry, { kind: "youtube" }> | null>(null);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const stopRef = useRef(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<PlanSlot | null>(null);
  const justScheduled = useRef<YouTubeVideo[]>([]);
  const saveTimers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; files: Set<DraftFileKey> }>());

  const channelId = channel?.id;
  const busy = Boolean(upload || aiRun || adding);

  // ---------- Carga ----------
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    setDraftsLoading(true);
    listDrafts(channelId)
      .then((list) => !cancelled && setDrafts(list))
      .catch(() => !cancelled && toast({ title: "No se pudieron leer los borradores guardados", variant: "destructive" }))
      .finally(() => !cancelled && setDraftsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [channelId, toast]);

  const loadYouTube = useCallback(async () => {
    if (!channelId) return;
    setYtLoading(true);
    const result = await fetchYouTubeVideos(channelId);
    if ("code" in result) {
      setYtError(YOUTUBE_ERROR_MESSAGES[result.code] ?? result.code);
    } else {
      // Lo recién subido puede tardar en aparecer en la lista del canal: se mantiene hasta que YouTube lo muestre
      const ids = new Set(result.videos.map((v) => v.id));
      justScheduled.current = justScheduled.current.filter((v) => !ids.has(v.id));
      setYtVideos([...result.videos, ...justScheduled.current]);
      setYtError(null);
    }
    setYtLoading(false);
  }, [channelId]);

  useEffect(() => {
    void loadYouTube();
  }, [loadYouTube]);

  // Comentarios para fijar y videos relacionados (tabla chica en Supabase)
  const loadTasks = useCallback(async () => {
    if (!channelId) return;
    setTasks(await listVideoTasks(channelId).catch(() => []));
  }, [channelId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Videos largos del canal: el destino del "Video relacionado" de los Shorts
  const longVideos = useMemo<RelatedVideo[]>(
    () =>
      ytVideos
        .filter((v) => !v.isShort && (v.privacy === "public" || (v.privacy === "private" && v.publishAt)))
        .map((v) => ({ id: v.id, title: v.title })),
    [ytVideos]
  );

  // Si a esta semana ya no le quedan espacios por delante (p. ej. domingo en la tarde), abrir la siguiente
  const autoWeekFor = useRef<string | null>(null);
  useEffect(() => {
    if (!channelId || autoWeekFor.current === channelId) return;
    autoWeekFor.current = channelId;
    const thisWeek = startOfWeek(new Date());
    const remaining = slotsBetween(plan, new Date(Date.now() + MIN_LEAD_MS), addDays(thisWeek, 7));
    setWeekStart(remaining.length ? thisWeek : addDays(thisWeek, 7));
  }, [channelId, plan]);

  // Avisar antes de cerrar la pestaña con una subida en curso
  useEffect(() => {
    if (!upload) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [upload]);

  // ---------- Guardado ----------
  const persist = useCallback(
    (id: string, files: DraftFileKey[] = []) => {
      const pending = saveTimers.current.get(id);
      if (pending) clearTimeout(pending.timer);
      const fileSet = new Set([...(pending?.files ?? []), ...files]);
      const timer = setTimeout(() => {
        saveTimers.current.delete(id);
        const draft = draftsRef.current.find((d) => d.id === id);
        if (draft) {
          saveDraft(draft, [...fileSet]).catch(() =>
            toast({ title: "No se pudo guardar el borrador", description: "Revisa el espacio libre del disco.", variant: "destructive" })
          );
        }
      }, 400);
      saveTimers.current.set(id, { timer, files: fileSet });
    },
    [toast]
  );

  const updateDraft = useCallback(
    (id: string, patch: Partial<YouTubeDraft>) => {
      setDrafts((list) => sortDrafts(list.map((d) => (d.id === id ? { ...d, ...patch } : d))));
      persist(
        id,
        FILE_KEYS.filter((k) => k in patch)
      );
    },
    [persist]
  );

  const removeDraft = async (id: string) => {
    const pending = saveTimers.current.get(id);
    if (pending) clearTimeout(pending.timer);
    saveTimers.current.delete(id);
    await deleteDraft(id).catch(() => undefined);
    setDrafts((list) => list.filter((d) => d.id !== id));
  };

  // ---------- Calendario ----------
  const ytItems = useMemo(() => youtubeEntries(ytVideos), [ytVideos]);

  const occupants = useCallback(
    (exclude?: string): Occupant[] => [
      ...ytItems.map((e) => ({ format: e.format, at: e.at })),
      ...draftsRef.current
        .filter((d) => d.scheduledAt && d.id !== exclude)
        .map((d) => ({ format: d.format, at: new Date(d.scheduledAt as string) })),
    ],
    [ytItems]
  );

  const rescheduleVideo = async (entry: Extract<Entry, { kind: "youtube" }>, at: Date) => {
    if (!channelId) return;
    const publishAt = await rescheduleYouTubeVideo(channelId, entry.video.id, at);
    setYtVideos((list) => list.map((v) => (v.id === entry.video.id ? { ...v, publishAt } : v)));
    await rescheduleVideoTask(channelId, entry.video.id, publishAt).catch(() => undefined);
    void loadTasks();
    setWeekStart(startOfWeek(new Date(publishAt)));
    toast({
      title: entry.video.isShort ? "Short reprogramado" : "Video reprogramado",
      description: `YouTube lo publica el ${format(new Date(publishAt), "EEE d MMM · HH:mm", { locale: es })}.`,
    });
  };

  const weekEnd = addDays(weekStart, 7);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const week = useMemo(() => {
    const now = Date.now();
    const inWeek = (at: Date) => at >= weekStart && at < weekEnd;
    const yt = ytItems.filter((e) => inWeek(e.at));
    const draftEntries: Entry[] = drafts
      .filter((d) => d.scheduledAt && inWeek(new Date(d.scheduledAt)))
      .map((d) => ({ kind: "draft", key: d.id, at: new Date(d.scheduledAt as string), format: d.format, draft: d }));
    const slots = slotsBetween(plan, weekStart, weekEnd);
    const taken = [...yt, ...draftEntries].map((e) => ({ format: e.format, at: e.at }));
    const unfilled = freeSlots(slots, taken);
    const free: Entry[] = unfilled
      .filter((s) => s.at.getTime() > now + MIN_LEAD_MS)
      .map((s) => ({ kind: "free", key: s.key, at: s.at, format: s.format, slot: s }));
    const entries = [...yt, ...draftEntries, ...free].sort((a, b) => a.at.getTime() - b.at.getTime());
    return {
      entries,
      slots: slots.length,
      filled: slots.length - unfilled.length,
      free: free.length,
      scheduled: yt.filter((e) => e.scheduled).length,
      published: yt.filter((e) => !e.scheduled).length,
      drafts: draftEntries.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytItems, drafts, plan, weekStart.getTime()]);

  const unscheduled = drafts.filter((d) => !d.scheduledAt);
  const ready = drafts.filter((d) => draftProblems(d, true).length === 0);
  const aiTargets = drafts.filter((d) => !d.ai && d.file && (d.subtitleFile || d.notes.trim()));

  // ---------- Agregar videos ----------
  const createDrafts = async (files: File[], slot?: PlanSlot) => {
    if (!channel) return [];
    const videos = files.filter((f) => f.type.startsWith("video/")).sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
    const subs = files.filter((f) => /\.(srt|vtt)$/i.test(f.name));
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!videos.length) {
      toast({ title: "Elige al menos un video", description: "Puedes seleccionar junto a cada video su .srt y su miniatura (mismo nombre)." });
      return [];
    }
    const taken = occupants();
    const created: YouTubeDraft[] = [];
    for (const file of videos) {
      const info = await inspectVideo(file);
      const formatOf = (slot?.format ?? info.format) as YouTubeDraft["format"];
      const key = baseName(file.name);
      const only = videos.length === 1;
      const subtitleFile = subs.find((s) => baseName(s.name) === key) ?? (only && subs.length === 1 ? subs[0] : null);
      const thumbnailFile =
        formatOf === "video" ? images.find((i) => baseName(i.name) === key) ?? (only && images.length === 1 ? images[0] : null) : null;
      const at = slot && created.length === 0 ? slot : findFreeSlot(plan, formatOf, taken);
      if (at) taken.push({ format: formatOf, at: at.at });
      const draft = newDraft(channel.id, profile, {
        file,
        video: info.video,
        format: formatOf,
        subtitleFile,
        thumbnailFile,
        scheduledAt: at ? at.at.toISOString() : null,
      });
      await saveDraft(draft);
      created.push(draft);
    }
    setDrafts((list) => sortDrafts([...list, ...created]));
    return created;
  };

  const handleAddFiles = async (fileList: FileList | null, slot?: PlanSlot) => {
    const files = [...(fileList ?? [])];
    if (!files.length) return;
    setAdding(true);
    try {
      const created = await createDrafts(files, slot);
      if (!created.length) return;
      if (slot || created.length === 1) {
        setEditingId(created[0].id);
        return;
      }
      const dated = created.filter((d) => d.scheduledAt);
      const withSubs = created.filter((d) => d.subtitleFile).length;
      toast({
        title: `${created.length} videos agregados`,
        description: `${dated.length} quedaron en los próximos espacios libres · ${withSubs} con subtítulos${
          dated.length < created.length ? ` · ${created.length - dated.length} sin espacio: quedan en "Sin fecha"` : ""
        }`,
      });
      if (dated[0]) setWeekStart(startOfWeek(new Date(dated[0].scheduledAt as string)));
    } catch {
      toast({
        title: "No se pudieron guardar los videos",
        description: "El navegador no tiene espacio suficiente. Libera espacio en el disco y vuelve a intentarlo.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const assignNextSlot = (draft: YouTubeDraft) => {
    const slot = findFreeSlot(plan, draft.format, occupants(draft.id));
    if (!slot) {
      toast({ title: "No hay espacios libres", description: "Ajusta la frecuencia o elige la fecha a mano." });
      return;
    }
    updateDraft(draft.id, { scheduledAt: slot.at.toISOString(), error: undefined });
    setWeekStart(startOfWeek(slot.at));
  };

  // ---------- IA en lote ----------
  const runAi = async () => {
    const targets = aiTargets.map((d) => d.id);
    const skipped = drafts.filter((d) => !d.ai && d.file && !d.subtitleFile && !d.notes.trim()).length;
    let ok = 0;
    for (const [i, id] of targets.entries()) {
      const draft = draftsRef.current.find((d) => d.id === id);
      if (!draft) continue;
      setAiRun({ done: i, total: targets.length, step: draft.file?.name ?? "" });
      try {
        updateDraft(id, await fillDraftWithAi(draft, { profile, channelName: channel?.displayName }));
        ok++;
      } catch (err) {
        updateDraft(id, { error: err instanceof Error ? err.message : "La IA no respondió." });
      }
    }
    setAiRun(null);
    toast({
      title: `IA lista: ${ok} de ${targets.length} videos rellenados`,
      description: skipped ? `${skipped} sin subtítulos: ábrelos y usa "Rellenar con IA" (se puede transcribir).` : "Revisa los títulos antes de programar.",
    });
  };

  // ---------- Subir y programar ----------
  const runPublish = async (ids: string[]) => {
    stopRef.current = false;
    let ok = 0;
    let stoppedByQuota = false;
    const warnings: string[] = [];
    for (const [i, id] of ids.entries()) {
      if (stopRef.current) break;
      const draft = draftsRef.current.find((d) => d.id === id);
      if (!draft || draftProblems(draft, true).length > 0 || !draft.scheduledAt) continue;
      setUpload({ id, title: draft.title, status: "Preparando…", progress: 0, done: i, total: ids.length });
      try {
        const { videoId, warnings: w } = await publishDraft(draft, {
          categoryId: profile.category_id,
          privacy: "private",
          publishAt: draft.scheduledAt,
          onStatus: (status) => setUpload((u) => (u ? { ...u, status } : u)),
          onProgress: (progress) => setUpload((u) => (u ? { ...u, progress } : u)),
        });
        warnings.push(...w.map((x) => `${draft.title.slice(0, 40)}: ${x}`));
        addPost({
          platform: "youtube",
          accountId: draft.accountId,
          format: draft.format,
          title: draft.title.trim(),
          description: draft.description,
          tags: [],
          status: "programado",
          scheduledAt: draft.scheduledAt,
          externalId: videoId,
          url: `https://youtu.be/${videoId}`,
        });
        justScheduled.current.push({
          id: videoId,
          title: draft.title.trim(),
          description: draft.description,
          publishedAt: null,
          thumbnail: null,
          durationSeconds: Math.round(draft.video?.duration ?? 0),
          isShort: draft.format === "short",
          privacy: "private",
          publishAt: draft.scheduledAt,
          live: "none",
          views: 0,
          likes: 0,
          comments: 0,
        });
        setYtVideos((list) => [...list, justScheduled.current[justScheduled.current.length - 1]]);
        await removeDraft(id);
        ok++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "YouTube rechazó la subida.";
        updateDraft(id, { error: message });
        if (/cuota|límite diario/i.test(message)) {
          stoppedByQuota = true;
          break;
        }
      }
    }
    setUpload(null);
    void loadYouTube();
    void loadTasks();
    const pending = ids.length - ok;
    toast({
      title: ok ? `${ok} ${ok === 1 ? "video programado" : "videos programados"} en YouTube` : "No se programó ningún video",
      description: stoppedByQuota
        ? `Se agotó la cuota diaria de YouTube. Los ${pending} restantes siguen guardados aquí: vuelve mañana y presiona "Programar en YouTube".`
        : warnings.length
          ? warnings.join(" · ")
          : pending
            ? `${pending} quedaron pendientes: revisa sus avisos.`
            : "YouTube los publicará solos a su hora, aunque este PC esté apagado. Revisa \"Pendientes en YouTube\" para fijar comentarios y elegir videos relacionados.",
      variant: ok ? undefined : "destructive",
    });
  };

  if (!channel) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title="Conecta tu canal de YouTube"
          description="La programación sube cada video a YouTube con su fecha y YouTube lo publica solo."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const editing = drafts.find((d) => d.id === editingId) ?? null;
  const confirmDrafts = (confirmIds ?? []).map((id) => drafts.find((d) => d.id === id)).filter(Boolean) as YouTubeDraft[];
  const confirmUnits = confirmDrafts.reduce((s, d) => s + quotaUnits(d), 0);
  let fitsToday = 0;
  for (let used = 0, i = 0; i < confirmDrafts.length; i++) {
    used += quotaUnits(confirmDrafts[i]);
    if (used > DAILY_QUOTA) break;
    fitsToday++;
  }
  const isThisWeek = sameDay(weekStart, startOfWeek(new Date()));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="video/*,.srt,.vtt,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          void handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={slotInputRef}
        type="file"
        multiple
        accept="video/*,.srt,.vtt,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          void handleAddFiles(e.target.files, pendingSlot.current ?? undefined);
          pendingSlot.current = null;
          e.target.value = "";
        }}
      />

      <StudioPageHeader
        eyebrow="YouTube"
        title="Programación"
        subtitle="Deja la semana lista: cada video se sube con su fecha y YouTube lo publica solo, aunque tu PC esté apagado."
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
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setProfileOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Perfil del canal
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setPlanOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Frecuencia
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => addInputRef.current?.click()} disabled={busy}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Agregar videos
            </Button>
          </>
        }
      />

      {/* Barra de trabajo: IA y subida en lote */}
      <StudioCard className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Espacios de la semana</span>
            <span className="font-semibold tabular-nums">
              {week.filled}/{week.slots}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-muted-foreground">Programados en YouTube</span>
            <span className="font-semibold tabular-nums">{week.scheduled}</span>
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Listos para subir</span>
            <span className="font-semibold tabular-nums">{ready.length}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" disabled={busy || aiTargets.length === 0} onClick={() => void runAi()}>
            {aiRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
            {aiRun ? `IA ${aiRun.done + 1} de ${aiRun.total}…` : `Rellenar con IA (${aiTargets.length})`}
          </Button>
          <Button size="sm" className="gap-1.5" disabled={busy || ready.length === 0} onClick={() => setConfirmIds(ready.map((d) => d.id))}>
            <Rocket className="h-4 w-4" />
            Programar en YouTube ({ready.length})
          </Button>
        </div>
      </StudioCard>

      {upload && (
        <StudioCard className="space-y-2 border-primary/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium">
                {upload.done + 1} de {upload.total}
              </span>{" "}
              · {upload.title} · {upload.status}
            </span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-muted-foreground">{Math.round(upload.progress * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => (stopRef.current = true)}>
                Detener después de este
              </Button>
            </div>
          </div>
          <Progress value={upload.progress * 100} />
          <p className="text-xs text-muted-foreground">No cierres esta pestaña mientras sube. Lo que falte queda guardado para después.</p>
        </StudioCard>
      )}

      <PendingTasksPanel tasks={tasks} onChanged={() => void loadTasks()} />

      {/* Navegación de semanas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-2 px-3 font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={es}
                weekStartsOn={1}
                selected={weekStart}
                onSelect={(date) => {
                  if (date) setWeekStart(startOfWeek(date));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isThisWeek && (
            <Button variant="secondary" size="sm" className="ml-1 h-8" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Hoy
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {ytLoading ? "Leyendo el canal…" : ytError ? ytError : "Haz clic en un espacio libre para ponerle un video."}
        </p>
      </div>

      {/* Semana */}
      {draftsLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((day) => {
            const entries = week.entries.filter((e) => sameDay(e.at, day));
            const today = sameDay(day, new Date());
            const past = day < new Date() && !today;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-2.5 lg:min-h-[140px]",
                  today ? "border-primary/50 bg-primary/5" : "border-border/70 bg-secondary/20",
                  past && "opacity-60"
                )}
              >
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span className={cn("text-sm font-semibold tabular-nums", today && "text-primary")}>{format(day, "d")}</span>
                </div>
                {entries.length === 0 && <p className="px-0.5 text-[11px] text-muted-foreground/70">Sin publicaciones</p>}
                {entries.map((entry) =>
                  entry.kind === "youtube" ? (
                    <YouTubeEntryCard
                      key={entry.key}
                      entry={entry}
                      task={tasks.find((t) => t.videoId === entry.video.id) ?? null}
                      onExtras={() => setExtrasVideo(entry.video)}
                      onReschedule={() => setRescheduling(entry)}
                    />
                  ) : entry.kind === "draft" ? (
                    <DraftCard
                      key={entry.key}
                      draft={entry.draft}
                      uploading={upload?.id === entry.draft.id ? upload.progress : null}
                      onClick={() => !busy && setEditingId(entry.draft.id)}
                    />
                  ) : (
                    <FreeSlotButton
                      key={entry.key}
                      slot={entry.slot}
                      disabled={busy}
                      candidates={unscheduled.filter((d) => d.format === entry.format)}
                      onUpload={() => {
                        pendingSlot.current = entry.slot;
                        slotInputRef.current?.click();
                      }}
                      onAssign={(draft) => updateDraft(draft.id, { scheduledAt: entry.slot.at.toISOString(), error: undefined })}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {week.slots === 0 && !draftsLoading && (
        <p className="text-sm text-muted-foreground">
          Tu frecuencia no tiene horarios esta semana.{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => setPlanOpen(true)}>
            Configúrala aquí
          </button>
          .
        </p>
      )}

      {/* Sin fecha */}
      {unscheduled.length > 0 && (
        <StudioCard>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Sin fecha ({unscheduled.length})</h2>
              <p className="text-xs text-muted-foreground">Borradores guardados en este PC. Asígnales un espacio para programarlos.</p>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {unscheduled.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <FileVideo className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title || d.file?.name || "Sin archivo"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {SLOT_FORMAT_LABELS[d.format]}
                    {d.subtitleFile ? " · con subtítulos" : ""}
                    {d.error ? ` · ${d.error}` : ""}
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="h-8 gap-1.5" disabled={busy} onClick={() => assignNextSlot(d)}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Próximo espacio
                </Button>
                <Button variant="ghost" size="sm" className="h-8" disabled={busy} onClick={() => setEditingId(d.id)}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        </StudioCard>
      )}

      {drafts.length === 0 && !draftsLoading && (
        <EmptyState
          icon={<UploadCloud className="h-6 w-6" />}
          title="Arma tu semana en 3 pasos"
          description='1) "Agregar videos": elige todos los videos con sus .srt (y miniaturas) del mismo nombre; se reparten solos en tus horarios. 2) "Rellenar con IA". 3) "Programar en YouTube".'
          action={
            <Button className="gap-1.5" onClick={() => addInputRef.current?.click()}>
              <Plus className="h-4 w-4" />
              Agregar videos
            </Button>
          }
        />
      )}

      {/* Editor de un borrador */}
      <DraftDialog
        draft={editing}
        profile={profile}
        channelName={channel.displayName}
        longVideos={longVideos}
        onChange={(patch) => editing && updateDraft(editing.id, patch)}
        onClose={() => setEditingId(null)}
        onDelete={async () => {
          if (!editing) return;
          await removeDraft(editing.id);
          setEditingId(null);
          toast({ title: "Borrador eliminado" });
        }}
        onNextSlot={() => editing && assignNextSlot(editing)}
        onPublish={() => {
          if (!editing) return;
          setEditingId(null);
          setConfirmIds([editing.id]);
        }}
      />

      {/* Confirmar subida */}
      <AlertDialog open={confirmIds !== null} onOpenChange={(open) => !open && setConfirmIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Programar {confirmDrafts.length} {confirmDrafts.length === 1 ? "video" : "videos"} en YouTube
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {confirmDrafts.map((d) => (
                    <li key={d.id} className="flex justify-between gap-3">
                      <span className="truncate text-foreground">{d.title}</span>
                      <span className="shrink-0 tabular-nums">
                        {d.scheduledAt && format(new Date(d.scheduledAt), "EEE d MMM HH:mm", { locale: es })}
                      </span>
                    </li>
                  ))}
                </ul>
                <p>
                  Se suben ahora como privados y YouTube los publica solos a su hora. Usa ~{formatFollowers(confirmUnits)} de las{" "}
                  {formatFollowers(DAILY_QUOTA)} unidades diarias de la API.
                </p>
                {fitsToday < confirmDrafts.length && (
                  <p className="rounded-lg bg-warning-soft p-2.5 text-warning-soft-foreground">
                    Hoy alcanzan unos {fitsToday}. Cuando se acabe la cuota, el resto queda guardado y lo programas mañana (la cuota se reinicia
                    cerca de las 3–4 AM de Chile).
                  </p>
                )}
                <p>Deja esta pestaña abierta hasta que termine.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = confirmIds ?? [];
                setConfirmIds(null);
                void runPublish(ids);
              }}
            >
              Subir y programar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VideoExtrasDialog
        video={extrasVideo}
        task={tasks.find((t) => t.videoId === extrasVideo?.id) ?? null}
        longVideos={longVideos}
        accountId={channel.id}
        language={profile.language}
        onClose={() => setExtrasVideo(null)}
        onSaved={() => void loadTasks()}
      />

      <PublishPlanDialog account={channel} open={planOpen} onOpenChange={setPlanOpen} />
      <ChannelProfileDialog account={profileOpen ? channel : null} onOpenChange={(open) => !open && setProfileOpen(false)} />

      {rescheduling && (
        <RescheduleDialog
          open
          onOpenChange={(open) => !open && setRescheduling(null)}
          title={rescheduling.video.isShort ? "Cambiar fecha del Short" : "Cambiar fecha del video"}
          itemTitle={rescheduling.video.title}
          current={rescheduling.at}
          minLeadMs={YOUTUBE_MIN_LEAD_MS}
          suggest={() =>
            findFreeSlot(
              plan,
              rescheduling.format,
              occupants().filter((o) => !(o.format === rescheduling.format && o.at.getTime() === rescheduling.at.getTime()))
            )?.at ?? null
          }
          onConfirm={(at) => rescheduleVideo(rescheduling, at)}
        />
      )}
    </div>
  );
}

function FormatChip({ format: f }: { format: SlotFormat }) {
  return (
    <span
      className={cn(
        "rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
        f === "short" ? "bg-red-500/15 text-red-300" : "bg-primary/15 text-primary"
      )}
    >
      {SLOT_FORMAT_LABELS[f]}
    </span>
  );
}

function YouTubeEntryCard({
  entry,
  task,
  onExtras,
  onReschedule,
}: {
  entry: Extract<Entry, { kind: "youtube" }>;
  task: VideoTask | null;
  onExtras: () => void;
  onReschedule: () => void;
}) {
  const { video } = entry;
  const editable = entry.scheduled && entry.at.getTime() > Date.now();
  const url = video.isShort ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`;
  const commentLabel =
    task?.commentStatus === "pendiente"
      ? "Comentario en espera"
      : task?.commentStatus === "publicado"
        ? "Comentario por fijar"
        : task?.commentStatus === "fijado"
          ? "Comentario fijado"
          : task?.commentStatus === "error"
            ? "Comentario con error"
            : video.isShort
              ? "Video relacionado y comentario"
              : "Comentario para fijar";
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/40 transition-colors hover:border-primary/40">
      <a href={url} target="_blank" rel="noopener noreferrer" className="group block">
        {video.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        )}
        <div className="space-y-1 p-2 pb-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{time(entry.at)}</span>
            <FormatChip format={entry.format} />
          </div>
          <p className="line-clamp-2 text-xs font-medium leading-snug">{video.title}</p>
          {entry.scheduled ? (
            <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <CalendarCheck className="h-3 w-3" />
              Programado
            </p>
          ) : (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Eye className="h-3 w-3" />
              Publicado · {formatFollowers(video.views)}
            </p>
          )}
        </div>
      </a>
      {editable && (
        <button
          type="button"
          onClick={onReschedule}
          className="flex w-full items-center gap-1 px-2 pb-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <CalendarClock className="h-3 w-3 shrink-0" />
          Cambiar fecha
        </button>
      )}
      <button
        type="button"
        onClick={onExtras}
        className={cn(
          "flex w-full items-center gap-1 px-2 pb-2 text-left text-[11px] hover:text-foreground",
          task?.commentStatus === "publicado" || task?.commentStatus === "error" ? "text-amber-400" : "text-muted-foreground"
        )}
      >
        <MessageSquareText className="h-3 w-3 shrink-0" />
        <span className="truncate">{commentLabel}</span>
      </button>
    </div>
  );
}

function DraftCard({ draft, uploading, onClick }: { draft: YouTubeDraft; uploading: number | null; onClick: () => void }) {
  const problems = draftProblems(draft, true);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "space-y-1 rounded-xl border p-2 text-left transition-colors",
        problems.length || draft.error ? "border-amber-500/40 bg-amber-500/5" : "border-primary/40 bg-primary/5 hover:border-primary/70"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{draft.scheduledAt && time(new Date(draft.scheduledAt))}</span>
        <FormatChip format={draft.format} />
        {draft.subtitleFile && <Captions className="h-3 w-3" aria-label="Con subtítulos" />}
        {draft.thumbnailFile && <ImageIcon className="h-3 w-3" aria-label="Con miniatura" />}
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-snug">{draft.title || draft.file?.name || "Sin archivo"}</p>
      {uploading !== null ? (
        <Progress value={uploading * 100} className="h-1" />
      ) : draft.error ? (
        <p className="flex items-start gap-1 text-[11px] text-amber-400">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{draft.error}</span>
        </p>
      ) : problems.length ? (
        <p className="flex items-start gap-1 text-[11px] text-amber-400">
          <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
          {problems[0]}
        </p>
      ) : (
        <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <Clock className="h-3 w-3" />
          Listo para subir
        </p>
      )}
    </button>
  );
}

function FreeSlotButton({
  slot,
  disabled,
  candidates,
  onUpload,
  onAssign,
}: {
  slot: PlanSlot;
  disabled: boolean;
  candidates: YouTubeDraft[];
  onUpload: () => void;
  onAssign: (draft: YouTubeDraft) => void;
}) {
  const label = (
    <>
      <Plus className="h-3.5 w-3.5" />
      <span className="tabular-nums">{time(slot.at)}</span>
      <span>{SLOT_FORMAT_LABELS[slot.format]}</span>
    </>
  );
  const className =
    "flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-foreground disabled:pointer-events-none";

  if (candidates.length === 0) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={onUpload}>
        {label}
      </button>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={className} disabled={disabled}>
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-1 p-2">
        <button type="button" onClick={onUpload} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
          <UploadCloud className="h-4 w-4 text-primary" />
          Subir un video nuevo
        </button>
        <p className="px-2 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">O usar uno sin fecha</p>
        {candidates.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onAssign(d)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary"
          >
            <FileVideo className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{d.title || d.file?.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function DraftDialog({
  draft,
  profile,
  channelName,
  longVideos,
  onChange,
  onClose,
  onDelete,
  onNextSlot,
  onPublish,
}: {
  draft: YouTubeDraft | null;
  profile: ReturnType<typeof normalizeProfile>;
  channelName?: string;
  longVideos: RelatedVideo[];
  onChange: (patch: Partial<YouTubeDraft>) => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onNextSlot: () => void;
  onPublish: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setConfirmDelete(false), [draft?.id]);

  if (!draft) return null;
  const problems = draftProblems(draft, true);
  const scheduledLocal = draft.scheduledAt ? toLocalInput(new Date(draft.scheduledAt)) : "";

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft.title || draft.file?.name || "Nuevo video"}</DialogTitle>
          <DialogDescription>Los cambios se guardan solos en este PC.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Fecha y hora de publicación</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                type="datetime-local"
                value={scheduledLocal}
                disabled={busy}
                onChange={(e) => onChange({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null, error: undefined })}
                className="w-auto"
              />
              <Button variant="secondary" size="sm" className="h-10 gap-1.5" onClick={onNextSlot} disabled={busy}>
                <CalendarPlus className="h-4 w-4" />
                Próximo espacio libre
              </Button>
              {draft.scheduledAt && (
                <Button variant="ghost" size="sm" className="h-10" onClick={() => onChange({ scheduledAt: null })} disabled={busy}>
                  Quitar fecha
                </Button>
              )}
            </div>
          </div>

          <YouTubeDraftEditor
            draft={draft}
            onChange={onChange}
            profile={profile}
            channelName={channelName}
            onBusyChange={setBusy}
            longVideos={longVideos}
          />

          {draft.error && (
            <p className="flex items-start gap-2 rounded-xl bg-error-soft p-3 text-sm text-error-soft-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {draft.error}
            </p>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className={cn("gap-1.5", confirmDelete ? "text-destructive" : "text-muted-foreground")}
            disabled={busy}
            onClick={() => (confirmDelete ? void onDelete() : setConfirmDelete(true))}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? "¿Seguro? Clic para eliminar" : "Eliminar"}
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {problems.length > 0 && <span className="text-xs text-muted-foreground">{problems.join(" · ")}</span>}
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Listo
            </Button>
            <Button className="gap-1.5" disabled={busy || problems.length > 0} onClick={onPublish}>
              <Rocket className="h-4 w-4" />
              Programar este ahora
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
