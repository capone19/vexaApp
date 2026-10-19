import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Link2,
  Loader2,
  PlugZap,
  Plus,
  RefreshCw,
  Repeat2,
  SlidersHorizontal,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReelComposerDialog } from "@/components/studio/instagram/ReelComposerDialog";
import { ReelStatusChip, useScheduleNotice, whenLabel } from "@/components/studio/instagram/ReelParts";
import { ReplicateFromYouTubeSheet, type ShortEntry } from "@/components/studio/instagram/ReplicateFromYouTubeSheet";
import { PublishPlanDialog } from "@/components/studio/PublishPlanDialog";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useInstagramAccount } from "@/hooks/use-instagram-account";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import {
  hasVideo,
  MISSING_VIDEO_MESSAGE,
  nextFreeReelSlot,
  PUBLISHING_MESSAGE,
  reelOccupants,
  REEL_MIN_LEAD_MS,
  retryPublication,
  RETRY_HELP,
  schedulePublication,
  subscribePublications,
  uploadReelVideo,
  validateReelFile,
  type InstagramPublication,
  type PublicationSubscription,
} from "@/lib/studio/instagram";
import { addDays, freeSlots, hasPublishPlan, normalizePlan, sameDay, slotsBetween, startOfWeek, type PlanSlot } from "@/lib/studio/publish-plan";
import { fetchYouTubeVideos, scheduleTimes, YOUTUBE_ERROR_MESSAGES, type YouTubeVideo } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

const time = (d: Date) => format(d, "HH:mm");

interface ComposerState {
  publication: InstagramPublication | null;
  at?: Date | null;
}

export default function InstagramProgramacion() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "instagram") notFound();

  const search = useSearchParams();
  const router = useRouter();
  const { accounts, account, select } = useInstagramAccount();
  const { channels, channel: ytChannel, select: selectYt } = useYouTubeChannel();
  const { tenantId } = useEffectiveTenant();
  const { toast } = useToast();
  const announce = useScheduleNotice();
  const plan = useMemo(() => (hasPublishPlan(account?.publishPlan) ? normalizePlan(account?.publishPlan) : null), [account]);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [publications, setPublications] = useState<InstagramPublication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, number>>({});
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [replicate, setReplicate] = useState<{ focusIds: string[] | null } | null>(() =>
    search?.get("replicar") === "1" ? { focusIds: null } : null
  );
  const [planOpen, setPlanOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const subRef = useRef<PublicationSubscription | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ publication: InstagramPublication; retryAt: Date | null } | null>(null);

  const accountId = account?.id;
  const ytId = ytChannel?.id;
  const weekEnd = addDays(weekStart, 7);
  // Se leen dos semanas: la visible y la siguiente (el panel de replicar puede incluirla)
  const rangeEnd = addDays(weekStart, 14);

  // ---------- YouTube (solo lectura) ----------
  const loadYouTube = useCallback(async () => {
    if (!ytId) return;
    setYtLoading(true);
    const result = await fetchYouTubeVideos(ytId);
    if ("code" in result) {
      setYtError(YOUTUBE_ERROR_MESSAGES[result.code] ?? result.code);
    } else {
      setYtVideos(result.videos);
      setYtError(null);
    }
    setYtLoading(false);
  }, [ytId]);

  useEffect(() => {
    void loadYouTube();
  }, [loadYouTube]);

  const shorts = useMemo<ShortEntry[]>(() => scheduleTimes(ytVideos).filter((e) => e.video.isShort), [ytVideos]);
  const rangeIds = useMemo(
    () => shorts.filter((s) => s.at >= weekStart && s.at < rangeEnd).map((s) => s.video.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shorts, weekStart.getTime()]
  );
  const rangeKey = rangeIds.join(",");

  // ---------- Publicaciones (polling liviano, sin Realtime) ----------
  useEffect(() => {
    setLoaded(false);
    setPublications([]);
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    const sub = subscribePublications(
      accountId,
      (list) => {
        setPublications(list);
        setLoaded(true);
        setLoadError(false);
      },
      { from: weekStart, to: rangeEnd, youtubeIds: rangeIds },
      () => {
        setLoaded(true);
        setLoadError(true);
      }
    );
    subRef.current = sub;
    return () => {
      sub.stop();
      subRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, weekStart.getTime(), rangeKey]);

  const refresh = useCallback(() => void subRef.current?.refresh(), []);

  // Avisar antes de cerrar la pestaña con una subida en curso
  const uploading = Object.keys(uploads).length > 0;
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  const setUploadProgress = useCallback((id: string, fraction: number | null) => {
    setUploads((u) => {
      const next = { ...u };
      if (fraction === null) delete next[id];
      else next[id] = fraction;
      return next;
    });
  }, []);

  // ---------- Semana ----------
  const twins = useMemo(() => {
    const map = new Map<string, InstagramPublication>();
    for (const p of publications) if (p.youtubeVideoId) map.set(p.youtubeVideoId, p);
    return map;
  }, [publications]);
  const twinIds = useMemo(() => new Set(twins.keys()), [twins]);
  const occupants = useMemo(() => reelOccupants(publications), [publications]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const week = useMemo(() => {
    const inWeek = (d: Date) => d >= weekStart && d < weekEnd;
    const yt = shorts.filter((s) => inWeek(s.at));
    const reels = publications
      .filter((p) => p.status !== "borrador" && p.scheduledAt && inWeek(new Date(p.scheduledAt)))
      .sort((a, b) => (a.scheduledAt as string).localeCompare(b.scheduledAt as string));
    const slots = plan ? slotsBetween(plan, weekStart, weekEnd).filter((s) => s.format === "reel") : [];
    const free = freeSlots(
      slots,
      reels.map((p) => ({ format: "reel" as const, at: new Date(p.scheduledAt as string) }))
    ).filter((s) => s.at.getTime() > Date.now() + REEL_MIN_LEAD_MS);
    return {
      yt,
      reels,
      free,
      pendingShorts: yt.filter((s) => !twinIds.has(s.video.id)).length,
      scheduled: reels.filter((p) => p.status === "programado").length,
      published: reels.filter((p) => p.status === "publicado").length,
      missingVideo: reels.filter((p) => p.status === "programado" && !hasVideo(p)).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shorts, publications, plan, twinIds, weekStart.getTime()]);

  const drafts = publications.filter((p) => p.status === "borrador");
  // Errores fuera de la semana visible: igual hay que verlos
  const otherErrors = publications.filter(
    (p) => p.status === "error" && !(p.scheduledAt && new Date(p.scheduledAt) >= weekStart && new Date(p.scheduledAt) < weekEnd)
  );

  // ---------- Acciones ----------
  /** Próxima hora libre desde ahora (plan de Instagram o, si no hay, en unos minutos) */
  const nextTime = (exclude?: string) => {
    const from = new Date(Date.now() + REEL_MIN_LEAD_MS);
    return nextFreeReelSlot(plan, reelOccupants(publications, exclude), from) ?? new Date(Math.ceil(from.getTime() / 300_000) * 300_000);
  };

  const scheduleDraft = async (p: InstagramPublication) => {
    const at = nextTime(p.id);
    setWorking(p.id);
    try {
      const { notice } = await schedulePublication(p.id, at);
      announce(p.id, notice, "Reel programado", hasVideo(p) ? `Sale el ${whenLabel(at)}.` : MISSING_VIDEO_MESSAGE);
      setWeekStart(startOfWeek(at));
      refresh();
    } catch (err) {
      toast({ title: "No se pudo programar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  /** Reintentar: misma hora si todavía no pasa, o la próxima libre. Sin video, primero se pide el archivo */
  const retry = async (p: InstagramPublication) => {
    const keep = p.scheduledAt && new Date(p.scheduledAt).getTime() > Date.now() + REEL_MIN_LEAD_MS;
    const at = keep ? null : nextTime(p.id);
    if (!hasVideo(p)) {
      pendingUpload.current = { publication: p, retryAt: at };
      fileRef.current?.click();
      return;
    }
    setWorking(p.id);
    try {
      const { publication, notice } = await retryPublication(p.id, at ?? undefined);
      announce(p.id, notice, "Reel reprogramado", publication.scheduledAt ? `Sale el ${whenLabel(publication.scheduledAt)}.` : undefined);
      refresh();
    } catch (err) {
      toast({ title: "No se pudo reintentar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const askUpload = (p: InstagramPublication) => {
    pendingUpload.current = { publication: p, retryAt: null };
    fileRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    const pending = pendingUpload.current;
    pendingUpload.current = null;
    if (!file || !pending) return;
    const problem = validateReelFile(file);
    if (problem) {
      toast({ title: "Ese archivo no sirve para Instagram", description: problem, variant: "destructive" });
      return;
    }
    const p = pending.publication;
    try {
      // Un Reel en error vuelve primero a programado: así la subida arma la alarma sola
      if (p.status === "error") await retryPublication(p.id, pending.retryAt ?? undefined);
      setUploadProgress(p.id, 0);
      await uploadReelVideo(p.id, file, (f) => setUploadProgress(p.id, f));
      toast({ title: "Video subido", description: "Saldrá solo a su hora, aunque este PC esté apagado." });
    } catch (err) {
      toast({ title: "No se pudo subir el video", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setUploadProgress(p.id, null);
      refresh();
    }
  };

  const openReplicate = (focusIds: string[] | null = null) => setReplicate({ focusIds });
  const closeReplicate = () => {
    setReplicate(null);
    if (search?.get("replicar")) router.replace("/studio/instagram/programar");
  };

  if (!account) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title="Conecta tu cuenta de Instagram"
          description="La programación sube cada Reel con su hora e Instagram lo publica solo, aunque tu PC esté apagado."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isThisWeek = sameDay(weekStart, startOfWeek(new Date()));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <StudioPageHeader
        eyebrow="Instagram"
        title="Programación"
        subtitle="Replica tus Shorts como Reels o súbelos nuevos: cada uno sale solo a su hora, aunque tu PC esté apagado."
        actions={
          <>
            {accounts.length > 1 && (
              <Select value={account.id} onValueChange={select}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.handle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {channels.length > 1 && ytChannel && (
              <Select value={ytChannel.id} onValueChange={selectYt}>
                <SelectTrigger className="w-[190px]" aria-label="Canal de YouTube">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      YouTube · {c.handle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setPlanOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Frecuencia
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => openReplicate()}>
              <Repeat2 className="h-4 w-4" />
              Replicar semana desde YouTube
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setComposer({ publication: null })}>
              <Plus className="h-4 w-4" />
              Nuevo Reel
            </Button>
          </>
        }
      />

      {account.status === "error" && (
        <p className="flex items-start gap-2 rounded-xl bg-error-soft p-3 text-sm text-error-soft-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Instagram revocó el permiso de esta cuenta. Vuelve a conectarla desde Cuentas conectadas o los Reels no saldrán.
        </p>
      )}

      {/* Resumen de la semana */}
      <StudioCard className="flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Programados</span>
          <span className="font-semibold tabular-nums">{week.scheduled}</span>
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-muted-foreground">Publicados</span>
          <span className="font-semibold tabular-nums">{week.published}</span>
        </span>
        <span className="flex items-center gap-2">
          <Repeat2 className="h-4 w-4 text-red-300" />
          <span className="text-muted-foreground">Shorts sin replicar</span>
          <span className="font-semibold tabular-nums">{week.pendingShorts}</span>
        </span>
        {week.missingVideo > 0 && (
          <span className="flex items-center gap-2 text-amber-400">
            <TriangleAlert className="h-4 w-4" />
            {week.missingVideo} sin video
          </span>
        )}
      </StudioCard>

      {/* Errores de otras semanas */}
      {otherErrors.length > 0 && (
        <StudioCard className="border-red-500/30 p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 text-red-400" />
            Reels con error ({otherErrors.length})
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">{RETRY_HELP}</p>
          <ul className="divide-y divide-border/60">
            {otherErrors.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title || "Reel"}</p>
                  <p className="text-[11px] text-red-400">{p.lastError || "No se pudo publicar"}</p>
                </div>
                <Button size="sm" variant="secondary" className="h-8 gap-1.5" disabled={working === p.id} onClick={() => void retry(p)}>
                  {working === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Reintentar
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setComposer({ publication: p })}>
                  Ver
                </Button>
              </li>
            ))}
          </ul>
        </StudioCard>
      )}

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
          {!ytChannel
            ? "Conecta tu canal de YouTube para ver tus Shorts aquí."
            : ytLoading
              ? "Leyendo el canal de YouTube…"
              : ytError
                ? ytError
                : loadError
                  ? "Sin conexión: reintentando…"
                  : "Arriba tus Shorts de YouTube; abajo tus Reels."}
        </p>
      </div>

      {/* Semana: dos carriles por día */}
      {!loaded ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((day) => {
            const yt = week.yt.filter((s) => sameDay(s.at, day));
            const reels = week.reels.filter((p) => sameDay(new Date(p.scheduledAt as string), day));
            const free = week.free.filter((s) => sameDay(s.at, day));
            const today = sameDay(day, new Date());
            const past = day < new Date() && !today;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-2.5 lg:min-h-[180px]",
                  today ? "border-primary/50 bg-primary/5" : "border-border/70 bg-secondary/20",
                  past && "opacity-60"
                )}
              >
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{format(day, "EEE", { locale: es })}</span>
                  <span className={cn("text-sm font-semibold tabular-nums", today && "text-primary")}>{format(day, "d")}</span>
                </div>

                {/* Carril YouTube */}
                {yt.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-300/70">YouTube</p>
                    {yt.map((s) => (
                      <YouTubeShortCard
                        key={s.video.id}
                        entry={s}
                        twin={twins.get(s.video.id) ?? null}
                        onReplicate={() => openReplicate([s.video.id])}
                        onOpenTwin={(p) => setComposer({ publication: p })}
                      />
                    ))}
                  </div>
                )}

                {/* Carril Instagram */}
                <div className="space-y-1.5">
                  <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-300/80">Instagram</p>
                  {reels.length === 0 && free.length === 0 && <p className="px-0.5 text-[11px] text-muted-foreground/70">Sin Reels</p>}
                  {reels.map((p) => (
                    <ReelCard
                      key={p.id}
                      publication={p}
                      uploading={uploads[p.id] ?? null}
                      working={working === p.id}
                      onOpen={() => setComposer({ publication: p })}
                      onRetry={() => void retry(p)}
                      onUpload={() => askUpload(p)}
                    />
                  ))}
                  {free.map((slot) => (
                    <FreeSlotButton key={slot.key} slot={slot} onClick={() => setComposer({ publication: null, at: slot.at })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!plan && loaded && (
        <p className="text-sm text-muted-foreground">
          Aún no tienes frecuencia de Reels.{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => setPlanOpen(true)}>
            Créala aquí
          </button>{" "}
          para ver tus espacios libres y repartir los Reels solos.
        </p>
      )}

      {/* Sin fecha */}
      {drafts.length > 0 && (
        <StudioCard>
          <div className="mb-3">
            <h2 className="font-semibold">Sin fecha ({drafts.length})</h2>
            <p className="text-xs text-muted-foreground">Borradores guardados. Asígnales un espacio para programarlos.</p>
          </div>
          <ul className="divide-y divide-border/60">
            {drafts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <FileVideo className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title || "Reel sin nombre"}</p>
                  <div className="mt-0.5">
                    <ReelStatusChip publication={p} uploading={uploads[p.id] ?? null} />
                    {!hasVideo(p) && !(p.id in uploads) && <span className="ml-2 text-[11px] text-amber-400">Sin video</span>}
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="h-8 gap-1.5" disabled={working === p.id} onClick={() => void scheduleDraft(p)}>
                  {working === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                  Próximo espacio
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setComposer({ publication: p })}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        </StudioCard>
      )}

      {loaded && publications.length === 0 && (
        <EmptyState
          icon={<Repeat2 className="h-6 w-6" />}
          title="Arma tu semana de Reels"
          description='Usa "Replicar semana desde YouTube" para pasar tus Shorts a Reels con textos de IA, o "Nuevo Reel" para subir uno desde la Fábrica o tu PC.'
          action={
            <Button className="gap-1.5" onClick={() => openReplicate()}>
              <Repeat2 className="h-4 w-4" />
              Replicar semana desde YouTube
            </Button>
          }
        />
      )}

      <ReplicateFromYouTubeSheet
        open={replicate !== null}
        onOpenChange={(open) => !open && closeReplicate()}
        account={account}
        youtubeChannel={ytChannel}
        tenantId={tenantId}
        weekStart={weekStart}
        shorts={shorts}
        twinIds={twinIds}
        publications={publications}
        plan={plan}
        focusIds={replicate?.focusIds ?? null}
        onOpenPlan={() => setPlanOpen(true)}
        onUploading={setUploadProgress}
        onDone={refresh}
      />

      <ReelComposerDialog
        open={composer !== null}
        onOpenChange={(open) => !open && setComposer(null)}
        account={account}
        youtubeChannel={ytChannel}
        tenantId={tenantId}
        publication={composer?.publication ?? null}
        initialAt={composer?.at ?? null}
        plan={plan}
        occupants={composer?.publication ? reelOccupants(publications, composer.publication.id) : occupants}
        onUploading={setUploadProgress}
        onSaved={(saved) => {
          if (saved?.scheduledAt) setWeekStart(startOfWeek(new Date(saved.scheduledAt)));
          refresh();
        }}
      />

      <PublishPlanDialog account={account} open={planOpen} onOpenChange={setPlanOpen} />
    </div>
  );
}

function YouTubeShortCard({
  entry,
  twin,
  onReplicate,
  onOpenTwin,
}: {
  entry: ShortEntry;
  twin: InstagramPublication | null;
  onReplicate: () => void;
  onOpenTwin: (p: InstagramPublication) => void;
}) {
  const { video } = entry;
  return (
    <div className="space-y-1 rounded-xl border border-border/50 bg-background/30 p-2 opacity-75 transition-opacity hover:opacity-100">
      <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noopener noreferrer" className="block space-y-0.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{time(entry.at)}</span>
          <span className="rounded bg-red-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-red-300">Short</span>
          {!entry.scheduled && <span>publicado</span>}
        </div>
        <p className="line-clamp-2 text-xs leading-snug">{video.title}</p>
      </a>
      {twin ? (
        <button type="button" onClick={() => onOpenTwin(twin)} className="flex w-full items-center gap-1 text-left text-[11px] text-muted-foreground hover:text-foreground">
          <Link2 className="h-3 w-3 shrink-0 text-pink-300" />
          <span className="truncate">
            Reel:{" "}
            {twin.status === "programado" && twin.scheduledAt
              ? `${hasVideo(twin) ? "programado" : "sin video"} ${format(new Date(twin.scheduledAt), "EEE HH:mm", { locale: es })}`
              : twin.status}
          </span>
        </button>
      ) : (
        <button type="button" onClick={onReplicate} className="text-[11px] font-medium text-primary hover:underline">
          Replicar →
        </button>
      )}
    </div>
  );
}

function ReelCard({
  publication: p,
  uploading,
  working,
  onOpen,
  onRetry,
  onUpload,
}: {
  publication: InstagramPublication;
  uploading: number | null;
  working: boolean;
  onOpen: () => void;
  onRetry: () => void;
  onUpload: () => void;
}) {
  const warn = p.status === "error" || (p.status === "programado" && !hasVideo(p) && uploading === null);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "cursor-pointer space-y-1.5 rounded-xl border p-2 text-left transition-colors",
        p.status === "error"
          ? "border-red-500/40 bg-red-500/5"
          : warn
            ? "border-amber-500/40 bg-amber-500/5"
            : p.status === "publicado"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {p.scheduledAt && <span className="font-semibold tabular-nums text-foreground">{time(new Date(p.scheduledAt))}</span>}
        <span className="rounded bg-pink-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-pink-300">Reel</span>
        {p.youtubeVideoId && <Link2 className="h-3 w-3" aria-label="Replicado de YouTube" />}
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-snug">{p.title || "Reel sin nombre"}</p>
      <ReelStatusChip publication={p} uploading={uploading} />
      {p.status === "publicando" && <p className="text-[10px] text-muted-foreground">{PUBLISHING_MESSAGE}</p>}
      {p.status === "programado" && !hasVideo(p) && uploading === null && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpload();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          title={MISSING_VIDEO_MESSAGE}
        >
          <UploadCloud className="h-3 w-3" />
          Subir video
        </button>
      )}
      {p.status === "error" && (
        <button
          type="button"
          disabled={working}
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-60"
        >
          {working ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Reintentar
        </button>
      )}
    </div>
  );
}

function FreeSlotButton({ slot, onClick }: { slot: PlanSlot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      <span className="tabular-nums">{time(slot.at)}</span>
      <span>Reel</span>
    </button>
  );
}
