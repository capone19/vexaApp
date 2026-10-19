import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  Clock,
  Flame,
  History,
  Lightbulb,
  PlugZap,
  Radio,
  RefreshCw,
  Rocket,
  Target,
  Trophy,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { LevelBadge } from "@/components/studio/performance/LevelBadge";
import { PerformanceHeatmap } from "@/components/studio/performance/PerformanceHeatmap";
import { VideoFicha } from "@/components/studio/performance/VideoFicha";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import { normalizeProfile } from "@/lib/studio/ai";
import {
  adviseSlot,
  ageLabel,
  convertHour,
  hourLabel,
  liveStatus,
  median,
  publishSlotStats,
  ratioLabel,
  TZ_CL,
  TZ_US,
  viewsHeatmap,
  WEEKDAY_LABELS,
  type LiveStatus,
  type SlotAdvice,
  type Snapshot,
  type VideoFormat,
} from "@/lib/studio/performance";
import { loadInsights, type Insight, type Replica } from "@/lib/studio/performance-ai";
import { loadAlerts, loadChannelPerformance, loadSnapshots, type ChannelPerformance, type PerformanceAlert, type PerfVideo } from "@/lib/studio/performance-data";
import { normalizePlan as normalizePublishPlan, SLOT_FORMAT_LABELS } from "@/lib/studio/publish-plan";
import { formatFollowers } from "@/lib/studio/platforms";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
const LOCAL_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || TZ_CL;
  } catch {
    return TZ_CL;
  }
})();

type SortKey = "ratio" | "recientes" | "vistas" | "retencion";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "ratio", label: "Vs. lo normal" },
  { key: "recientes", label: "Más recientes" },
  { key: "vistas", label: "Más vistas" },
  { key: "retencion", label: "% visto" },
];

const FORMATS: { key: VideoFormat; label: string }[] = [
  { key: "video", label: "Videos" },
  { key: "short", label: "Shorts" },
];

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-secondary/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.key ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Thumb({ video }: { video: Pick<PerfVideo, "thumbnail" | "format"> }) {
  return video.thumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={video.thumbnail} alt="" className={cn("shrink-0 rounded-md object-cover", video.format === "short" ? "h-12 w-7" : "h-9 w-16")} />
  ) : (
    <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md bg-secondary">
      <Video className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

/** "Sábado 12:00 ET · 13:00 Chile" */
function slotText(advice: SlotAdvice) {
  const day = advice.weekday === null ? "Todos los días" : WEEKDAY_LABELS[advice.weekday];
  const cl = convertHour(advice.weekday ?? 3, advice.hour, TZ_US, TZ_CL);
  const sameDay = advice.weekday === null || cl.weekday === advice.weekday;
  return {
    us: `${day} ${hourLabel(advice.hour)} ET`,
    cl: `${sameDay ? "" : `${WEEKDAY_LABELS[cl.weekday]} `}${hourLabel(cl.hour)} Chile`,
  };
}

const CONFIDENCE_LABEL: Record<SlotAdvice["confidence"], string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja (pocos datos)",
  referencia: "Referencia EE. UU. (sin datos propios aún)",
};

export default function YouTubeRendimiento() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "youtube") notFound();
  const search = useSearchParams();
  const { toast } = useToast();
  const { updateAccountPlan } = useStudio();
  const { channels, channel, select } = useYouTubeChannel();
  const profile = useMemo(() => normalizeProfile(channel?.aiProfile), [channel]);
  const channelId = channel?.id;

  const [perf, setPerf] = useState<ChannelPerformance | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("ranking");
  const [formatFilter, setFormatFilter] = useState<VideoFormat>("video");
  const [sort, setSort] = useState<SortKey>("ratio");
  const [tz, setTz] = useState<"us" | "cl">("us");
  const [heatFormat, setHeatFormat] = useState<VideoFormat>("video");
  const [openId, setOpenId] = useState<string | null>(null);
  const [autoId, setAutoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, s, a, i] = await Promise.all([
        loadChannelPerformance(channelId),
        loadSnapshots(channelId).catch(() => [] as Snapshot[]),
        loadAlerts(channelId).catch(() => [] as PerformanceAlert[]),
        loadInsights(channelId).catch(() => [] as Insight[]),
      ]);
      setPerf(p);
      setSnapshots(s);
      setAlerts(a);
      setInsights(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el rendimiento del canal.");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Link del aviso de Telegram: ?video=ID abre la ficha y la analiza
  const linked = search?.get("video");
  useEffect(() => {
    if (!linked || !perf) return;
    const v = perf.videos.find((x) => x.id === linked);
    if (v) {
      setFormatFilter(v.format);
      setOpenId(v.id);
      setAutoId(v.id);
    }
  }, [linked, perf]);

  const videos = useMemo(() => perf?.videos ?? [], [perf]);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);

  const lives = useMemo(() => {
    const out = new Map<string, LiveStatus>();
    if (!perf) return out;
    const grouped = new Map<string, Snapshot[]>();
    for (const s of snapshots) grouped.set(s.videoId, [...(grouped.get(s.videoId) ?? []), s]);
    for (const [id, snaps] of grouped) {
      const v = byId.get(id);
      if (!v) continue;
      const status = liveStatus(snaps, v.publishedAt, perf.base[v.format]);
      if (status) out.set(id, status);
    }
    return out;
  }, [snapshots, perf, byId]);

  const ranked = useMemo(() => {
    const list = videos.filter((v) => v.format === formatFilter);
    const by: Record<SortKey, (a: PerfVideo, b: PerfVideo) => number> = {
      ratio: (a, b) => (b.ratio ?? -1) - (a.ratio ?? -1),
      recientes: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
      vistas: (a, b) => b.views - a.views,
      retencion: (a, b) => (b.avgViewPercentage ?? -1) - (a.avgViewPercentage ?? -1),
    };
    return [...list].sort(by[sort]);
  }, [videos, formatFilter, sort]);

  // Horarios: mapa de calor con las fotos de n8n y consejo por formato
  const publishedBy = useCallback(
    (f: VideoFormat) => new Map(videos.filter((v) => v.format === f).map((v) => [v.id, v.publishedAt])),
    [videos]
  );
  const heat = useMemo(() => viewsHeatmap(snapshots, tz === "us" ? TZ_US : TZ_CL, publishedBy(heatFormat)), [snapshots, publishedBy, heatFormat, tz]);
  const advice = useMemo(() => {
    const out = {} as Record<VideoFormat, SlotAdvice>;
    for (const f of ["video", "short"] as VideoFormat[]) out[f] = adviseSlot(viewsHeatmap(snapshots, TZ_US, publishedBy(f)), f);
    return out;
  }, [snapshots, publishedBy]);
  const schedule = useMemo(() => {
    const v = slotText(advice.video);
    const s = slotText(advice.short);
    return `Long videos: ${v.us} (${v.cl}), ${advice.video.confidence}. Shorts: ${s.us} (${s.cl}), ${advice.short.confidence}.`;
  }, [advice]);

  const highlight = useMemo(() => {
    const a = advice[heatFormat];
    if (tz === "us") return { weekday: a.weekday, hour: a.hour };
    const cl = convertHour(a.weekday ?? 3, a.hour, TZ_US, TZ_CL);
    return { weekday: a.weekday === null ? null : cl.weekday, hour: cl.hour };
  }, [advice, heatFormat, tz]);

  const slotStats = useMemo(
    () => ({
      video: publishSlotStats(videos.filter((v) => v.format === "video")),
      short: publishSlotStats(videos.filter((v) => v.format === "short")),
    }),
    [videos]
  );

  const recentLive = useMemo(
    () =>
      videos
        .filter((v) => lives.has(v.id) && (lives.get(v.id) as LiveStatus).ageHours <= 14 * 24)
        .map((v) => ({ v, live: lives.get(v.id) as LiveStatus }))
        .sort((a, b) => (b.live.ratio ?? 0) - (a.live.ratio ?? 0)),
    [videos, lives]
  );
  const hot = recentLive.filter((x) => (x.live.ratio ?? 0) >= 2).slice(0, 3);
  const best = useMemo(() => {
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const pick = (f: VideoFormat) => videos.filter((v) => v.format === f && v.publishedAt >= since && v.ratio !== null).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0];
    return { video: pick("video"), short: pick("short") };
  }, [videos]);

  const replicas = insights.filter((i) => i.kind === "replica");
  const track = replicas
    .filter((r) => r.resultVideoId && byId.get(r.resultVideoId)?.ratio !== null && byId.get(r.resultVideoId)?.ratio !== undefined)
    .map((r) => byId.get(r.resultVideoId as string)?.ratio as number);

  const applyToPlan = async (f: VideoFormat) => {
    if (!channel) return;
    const a = advice[f];
    const local = convertHour(a.weekday ?? 3, a.hour, TZ_US, LOCAL_TZ);
    const plan = normalizePublishPlan(channel.publishPlan);
    const time = `${String(local.hour).padStart(2, "0")}:00`;
    let changed = false;
    const rules = plan.rules.map((r) => {
      if (r.format !== f) return r;
      changed = true;
      return { ...r, time, days: f === "video" && a.weekday !== null ? [local.weekday] : r.days };
    });
    if (!changed) rules.push({ id: `r-${Date.now()}`, format: f, days: a.weekday !== null ? [local.weekday] : [0, 1, 2, 3, 4, 5, 6], time });
    try {
      await updateAccountPlan(channel.id, { rules });
      toast({ title: `Plan de publicación actualizado`, description: `${SLOT_FORMAT_LABELS[f]}: ${time} en tu hora (${slotText(a).us}).` });
    } catch (e) {
      toast({ title: "No se pudo guardar el plan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  if (!channel) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title="Conecta tu canal de YouTube"
          description="Rendimiento compara cada video contra lo normal de tu canal con los datos de YouTube Analytics."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const openVideo = openId ? byId.get(openId) ?? null : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <StudioPageHeader
        eyebrow="YouTube"
        title="Rendimiento"
        subtitle={`${channel.handle} · cada video comparado con lo normal de tu canal a la misma edad`}
        actions={
          <>
            {channels.length > 1 && (
              <Select value={channel.id} onValueChange={select}>
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
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void load()} disabled={loading} aria-label="Actualizar">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </>
        }
      />

      {error && (
        <StudioCard className="flex items-start gap-3 border-rose-500/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="text-sm">
            <p className="font-medium">No se pudo leer el rendimiento</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </StudioCard>
      )}

      {!perf && loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : perf && !videos.length ? (
        <EmptyState icon={<Video className="h-6 w-6" />} title="Todavía no hay videos públicos" description="Cuando publiques, aquí verás cómo rinde cada uno contra lo normal de tu canal." />
      ) : perf ? (
        <>
          {/* Resumen: lo que pide acción hoy */}
          <div className="grid gap-4 md:grid-cols-3">
            <StudioCard className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold">Despegando ahora</h2>
              </div>
              {hot.length ? (
                hot.map(({ v, live }) => (
                  <button key={v.id} type="button" onClick={() => setOpenId(v.id)} className="flex w-full items-center gap-2.5 rounded-lg text-left hover:bg-secondary/40">
                    <Thumb video={v} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{v.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmt(live.views)} vistas en {ageLabel(live.ageHours)} · {live.perHour !== null ? `${fmt(live.perHour)}/h` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-amber-300">{ratioLabel(live.ratio)}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  {snapshots.length
                    ? "Ningún video reciente va 2x sobre lo normal. Si uno despega (3x), te llega un Telegram con el plan."
                    : "n8n empezó a tomar fotos por hora de tus videos recientes. Si uno despega (3x sobre lo normal), te llega un Telegram con el plan para aprovechar la ola."}
                </p>
              )}
            </StudioCard>

            <StudioCard className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Los que más superaron lo normal (90 días)</h2>
              </div>
              {(["video", "short"] as VideoFormat[]).map((f) => {
                const v = best[f];
                return v ? (
                  <button key={f} type="button" onClick={() => setOpenId(v.id)} className="flex w-full items-center gap-2.5 rounded-lg text-left hover:bg-secondary/40">
                    <Thumb video={v} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{v.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {SLOT_FORMAT_LABELS[f]} · {fmt(v.views)} vistas
                      </span>
                    </span>
                    <LevelBadge level={v.level} ratio={v.ratio} compact />
                  </button>
                ) : (
                  <p key={f} className="text-xs text-muted-foreground">
                    {SLOT_FORMAT_LABELS[f]}: faltan al menos 4 para comparar.
                  </p>
                );
              })}
            </StudioCard>

            <StudioCard className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Mejor horario para publicar</h2>
              </div>
              {(["video", "short"] as VideoFormat[]).map((f) => {
                const t = slotText(advice[f]);
                return (
                  <div key={f} className="text-sm">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{SLOT_FORMAT_LABELS[f]}</p>
                    <p className="font-semibold">{t.us}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.cl} · {CONFIDENCE_LABEL[advice[f].confidence]}
                    </p>
                  </div>
                );
              })}
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setTab("horarios")}>
                Ver el mapa de horarios →
              </button>
            </StudioCard>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto flex-wrap bg-secondary/60">
              <TabsTrigger value="ranking" className="gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Ranking
              </TabsTrigger>
              <TabsTrigger value="horarios" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Horarios
              </TabsTrigger>
              <TabsTrigger value="alertas" className="gap-1.5">
                <BellRing className="h-3.5 w-3.5" />
                Alertas{alerts.length ? ` (${alerts.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="ideas" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Ideas y bitácora{replicas.length ? ` (${replicas.length})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* ---------- Ranking ---------- */}
            <TabsContent value="ranking" className="mt-4">
              <StudioCard className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <Segmented<VideoFormat> value={formatFilter} options={FORMATS} onChange={setFormatFilter} />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Ordenar por
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORTS.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="hidden grid-cols-[minmax(0,1fr)_110px_70px_70px_70px_70px_60px] gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground lg:grid">
                  <span>Video</span>
                  <span>Vs. normal</span>
                  <span className="text-right">Día 1</span>
                  <span className="text-right">Día 7</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">% visto</span>
                  <span className="text-right">Subs</span>
                </div>
                <ul className="divide-y divide-border">
                  {ranked.map((v) => {
                    const live = lives.get(v.id);
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(v.id)}
                          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30 lg:grid-cols-[minmax(0,1fr)_110px_70px_70px_70px_70px_60px]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Thumb video={v} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{v.title}</span>
                              <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                                {format(new Date(v.publishedAt), "d MMM yyyy", { locale: es })}
                                {live?.last24h ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400">
                                    <Radio className="h-3 w-3" />+{fmt(live.last24h)} en 24 h
                                  </span>
                                ) : null}
                                <span className="lg:hidden">
                                  · {formatFollowers(v.views)} vistas{v.avgViewPercentage !== null ? ` · ${Math.round(v.avgViewPercentage)}% visto` : ""}
                                </span>
                              </span>
                            </span>
                          </span>
                          <span>
                            <LevelBadge level={v.level} ratio={v.ratio} compact />
                          </span>
                          <span className="hidden text-right text-sm tabular-nums lg:block">{v.cum[0] !== undefined ? formatFollowers(v.cum[0]) : "—"}</span>
                          <span className="hidden text-right text-sm tabular-nums lg:block">{v.cum[6] !== undefined ? formatFollowers(v.cum[6]) : "—"}</span>
                          <span className="hidden text-right text-sm font-medium tabular-nums lg:block">{formatFollowers(v.views)}</span>
                          <span className="hidden text-right text-sm tabular-nums lg:block">{v.avgViewPercentage !== null ? `${Math.round(v.avgViewPercentage)}%` : "—"}</span>
                          <span className="hidden text-right text-sm tabular-nums lg:block">{v.subscribersGained !== null ? `+${fmt(v.subscribersGained)}` : "—"}</span>
                        </button>
                      </li>
                    );
                  })}
                  {!ranked.length && <li className="p-6 text-center text-sm text-muted-foreground">No hay {formatFilter === "short" ? "Shorts" : "videos"} públicos todavía.</li>}
                </ul>
                <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
                  “Vs. normal” compara las vistas a los 7 días (o a la edad que tenga) con la mediana de tus otros {formatFilter === "short" ? "Shorts" : "videos"} a esa misma
                  edad. Se necesitan al menos 3 para comparar. YouTube Analytics tarda ~2 días en consolidar.
                </p>
              </StudioCard>
            </TabsContent>

            {/* ---------- Horarios ---------- */}
            <TabsContent value="horarios" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {(["video", "short"] as VideoFormat[]).map((f) => {
                  const a = advice[f];
                  const t = slotText(a);
                  return (
                    <StudioCard key={f} className="min-w-0 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">{SLOT_FORMAT_LABELS[f]}</p>
                      <p className="text-xl font-semibold">{t.us}</p>
                      <p className="text-sm text-muted-foreground">Para ti: {t.cl}</p>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                          a.confidence === "alta"
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : a.confidence === "referencia"
                              ? "bg-secondary text-muted-foreground ring-border"
                              : "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                        )}
                      >
                        {CONFIDENCE_LABEL[a.confidence]}
                      </span>
                      <p className="text-xs text-muted-foreground">{a.reason}</p>
                      <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => void applyToPlan(f)}>
                        Usar este horario en Programación
                      </Button>
                    </StudioCard>
                  );
                })}
              </div>

              <StudioCard className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Cuándo ve tu audiencia</h3>
                    <p className="text-xs text-muted-foreground">
                      Qué parte de las vistas del día llega en cada hora, según las fotos de n8n ({heat.hours ? `${fmt(heat.hours)} h útiles` : "recién empezando"}). No cuenta
                      las primeras 24 h de cada video, para que un estreno no tape el hábito de tu audiencia. Con 3 días de datos el horario pasa de referencia a tus números;
                      con 3 semanas, a confianza alta.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Segmented<VideoFormat> value={heatFormat} options={FORMATS} onChange={setHeatFormat} />
                    <Segmented<"us" | "cl">
                      value={tz}
                      options={[
                        { key: "us", label: "Hora EE. UU. (ET)" },
                        { key: "cl", label: "Hora Chile" },
                      ]}
                      onChange={setTz}
                    />
                  </div>
                </div>
                {heat.hours > 0 ? (
                  <PerformanceHeatmap map={heat} highlight={highlight} />
                ) : (
                  <p className="rounded-xl bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
                    Aún no hay suficientes fotos por hora. n8n toma una cada hora de tus videos de los últimos 14 días; vuelve en unos días.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">El recuadro amarillo marca el horario sugerido para publicar (antes del peak, para llegar con impulso).</p>
              </StudioCard>

              <StudioCard className="min-w-0 space-y-3">
                <h3 className="font-semibold">Cómo te fue según la hora en que publicaste (hora del Este)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {(["video", "short"] as VideoFormat[]).map((f) => (
                    <div key={f}>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">{SLOT_FORMAT_LABELS[f]}s</p>
                      <div className="space-y-1.5">
                        {slotStats[f].map((s) => (
                          <div key={s.label} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                            <span>
                              {s.label} <span className="text-[11px] text-muted-foreground">({hourLabel(s.fromHour)}–{hourLabel(s.toHour % 24)})</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {s.videos ? (
                                <>
                                  <span className="font-semibold text-foreground">{ratioLabel(s.medianRatio)}</span> · {s.videos} {s.videos === 1 ? "video" : "videos"}
                                </>
                              ) : (
                                "sin datos"
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Mediana del multiplicador “vs. normal” de los videos publicados en cada franja. Con pocos videos es orientativo.</p>
              </StudioCard>
            </TabsContent>

            {/* ---------- Alertas ---------- */}
            <TabsContent value="alertas" className="mt-4 space-y-4">
              <StudioCard className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Avisos enviados por Telegram</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  n8n revisa cada hora. Avisa una sola vez por video y nivel: <b>despegando</b> (3x sobre lo normal a su edad), <b>viral</b> (10x) y <b>reactivado</b> (un video
                  viejo que en 24 h hace 3x su ritmo de la semana).
                </p>
                {alerts.length ? (
                  <ul className="divide-y divide-border">
                    {alerts.map((a) => {
                      const v = byId.get(a.videoId);
                      return (
                        <li key={`${a.videoId}-${a.level}`}>
                          <button type="button" disabled={!v} onClick={() => v && setOpenId(v.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-secondary/30">
                            <span className="text-lg">{a.level === "viral" ? "🔥" : a.level === "reactivado" ? "♻️" : "🚀"}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{a.title}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {a.isShort ? "Short" : "Video"} · {a.level} · {fmt(a.views)} vistas a las {ageLabel(a.ageHours)} ·{" "}
                                {formatDistanceToNow(new Date(a.createdAt), { locale: es, addSuffix: true })}
                              </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums text-amber-300">{ratioLabel(a.ratio)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Todavía no hay avisos.</p>
                )}
              </StudioCard>

              <StudioCard className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold">En seguimiento (últimos 14 días)</h3>
                </div>
                {recentLive.length ? (
                  <ul className="divide-y divide-border">
                    {recentLive.map(({ v, live }) => (
                      <li key={v.id}>
                        <button type="button" onClick={() => setOpenId(v.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-secondary/30">
                          <Thumb video={v} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{v.title}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {fmt(live.views)} vistas · {ageLabel(live.ageHours)} · {live.last24h !== null ? `+${fmt(live.last24h)} en 24 h` : ""}
                              {live.perHour !== null ? ` · ${fmt(live.perHour)}/h ahora` : ""}
                              {live.expected !== null ? ` · lo normal: ~${fmt(live.expected)}` : ""}
                            </span>
                          </span>
                          <span className={cn("text-sm font-bold tabular-nums", (live.ratio ?? 0) >= 3 ? "text-amber-300" : "text-muted-foreground")}>{ratioLabel(live.ratio)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin fotos todavía: aparecen después de la primera hora de seguimiento.</p>
                )}
              </StudioCard>
            </TabsContent>

            {/* ---------- Ideas y bitácora ---------- */}
            <TabsContent value="ideas" className="mt-4 space-y-4">
              <StudioCard className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Bitácora de aciertos</p>
                    <p className="text-xs text-muted-foreground">Cada réplica que publiques se compara con lo que predijo la IA, y ese historial vuelve a la IA para afinar.</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <span>
                    <span className="text-lg font-semibold tabular-nums">{replicas.length}</span> <span className="text-muted-foreground">ideas</span>
                  </span>
                  <span>
                    <span className="text-lg font-semibold tabular-nums">{track.length}</span> <span className="text-muted-foreground">publicadas</span>
                  </span>
                  <span>
                    <span className="text-lg font-semibold tabular-nums">{track.length ? ratioLabel(median(track)) : "—"}</span>{" "}
                    <span className="text-muted-foreground">resultado mediano</span>
                  </span>
                </div>
              </StudioCard>

              {replicas.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {replicas.map((r) => {
                    const data = r.data as Replica;
                    const angle = data.angles[data.recommended_angle] ?? data.angles[0];
                    const result = r.resultVideoId ? byId.get(r.resultVideoId) : null;
                    const source = byId.get(r.videoId);
                    return (
                      <StudioCard key={r.id} className="min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground">
                              {r.isShort ? "Short" : "Video"} · {format(new Date(r.createdAt), "d MMM", { locale: es })} · de “{r.videoTitle}”
                            </p>
                            <p className="font-semibold">{angle?.name_es}</p>
                          </div>
                          {result ? (
                            <LevelBadge level={result.level} ratio={result.ratio} compact />
                          ) : (
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Sin publicar</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{angle?.titles[0]}</p>
                        <p className="text-xs text-muted-foreground">
                          Meta ×{angle?.prediction.ratio_min}–{angle?.prediction.ratio_max}
                          {result ? ` · salió: “${result.title}”` : ""}
                        </p>
                        {source && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpenId(source.id)}>
                            <Rocket className="mr-1 h-3.5 w-3.5" />
                            Ver brief y plan
                          </Button>
                        )}
                      </StudioCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Lightbulb className="h-6 w-6" />}
                  title="Todavía no hay ideas"
                  description="Abre un video del ranking que haya rendido sobre lo normal y usa “Replicar este video”: la IA te propone 3 ángulos para profundizar el tema."
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      {perf && (
        <VideoFicha
          open={Boolean(openVideo)}
          onOpenChange={(open) => {
            if (!open) {
              setOpenId(null);
              setAutoId(null);
            }
          }}
          accountId={channel.id}
          profile={profile}
          video={openVideo}
          all={videos}
          base={perf.base}
          snapshots={snapshots}
          insights={insights}
          schedule={schedule}
          autoDiagnose={Boolean(openVideo && autoId === openVideo.id)}
          onInsightsChange={setInsights}
        />
      )}
    </div>
  );
}
