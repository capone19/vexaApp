import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ChartLine,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Minus,
  PlugZap,
  RefreshCw,
  Radio,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import { formatFollowers } from "@/lib/studio/platforms";
import {
  buildInsights,
  fetchChannelAnalytics,
  fetchVideoDetail,
  percentChange,
  type ChannelAnalytics,
  type Insight,
  type PeriodDays,
  type VideoDetail,
  type VideoStat,
} from "@/lib/studio/youtube-analytics";
import { fetchYouTubeVideos, formatDuration, type YouTubeVideo } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

const PERIODS: { days: PeriodDays; label: string }[] = [
  { days: 7, label: "7 días" },
  { days: 28, label: "28 días" },
  { days: 90, label: "90 días" },
];

type VideoFilter = "todos" | "videos" | "shorts";

const SERIES_COLOR = "hsl(var(--primary))";
const PREVIOUS_COLOR = "hsl(var(--muted-foreground))";
const GRID_COLOR = "hsl(var(--border))";

const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
const dayLabel = (iso: string) => format(new Date(`${iso}T12:00:00`), "d MMM", { locale: es });

function Delta({ value, className }: { value: number | null; className?: string }) {
  if (value === null) {
    return <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground", className)}>Nuevo</span>;
  }
  if (Math.abs(value) < 1) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground", className)}>
        <Minus className="h-3 w-3" />
        igual
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-emerald-400" : "text-rose-400", className)}>
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : "−"}
      {fmt(Math.abs(value))}%
    </span>
  );
}

function Kpi({ label, value, hint, change }: { label: string; value: string; hint?: string; change: number | null }) {
  return (
    <StudioCard className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        <Delta value={change} />
        {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </StudioCard>
  );
}

const INSIGHT_ICONS: Record<Insight["tone"], { icon: React.ElementType; className: string }> = {
  bueno: { icon: Sparkles, className: "text-emerald-400" },
  atencion: { icon: TriangleAlert, className: "text-amber-400" },
  neutro: { icon: Lightbulb, className: "text-primary" },
};

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string;
  formatter: (label: string) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{formatter(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-foreground">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function BarRow({ label, value, total, detail }: { label: string; value: number; total: number; detail?: string }) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{fmt(share)}%</span> · {formatFollowers(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, 1)}%` }} />
      </div>
      {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

const LIVE_DAYS = 7;

/**
 * Contador público de cada video (YouTube Data API): se actualiza casi al instante, a diferencia de
 * YouTube Analytics que tarda ~2 días. Cubre justo los días que el análisis todavía no ve.
 */
function LiveCounters({ accountId }: { accountId: string }) {
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVideos(null);
    void fetchYouTubeVideos(accountId).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setVideos([]);
      const published = result.videos.filter((v) => v.privacy === "public" && v.publishedAt);
      const since = Date.now() - LIVE_DAYS * 86_400_000;
      const recent = published.filter((v) => new Date(v.publishedAt as string).getTime() >= since);
      setVideos((recent.length ? recent : published).slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (videos === null) return <Skeleton className="h-40 rounded-2xl" />;
  if (!videos.length) return null;

  return (
    <StudioCard>
      <div className="mb-1 flex items-center gap-2">
        <Radio className="h-4 w-4 text-emerald-400" />
        <h2 className="font-semibold">Contador en vivo</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Vistas totales de tus videos más recientes, al momento. El análisis de arriba las suma cuando YouTube las consolida (~2 días).
      </p>
      <ul className="divide-y divide-border">
        {videos.map((v) => (
          <li key={v.id} className="flex items-center gap-3 py-2.5">
            {v.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumbnail} alt="" className={cn("shrink-0 rounded-md object-cover", v.isShort ? "h-12 w-7" : "h-9 w-16")} />
            ) : (
              <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <a
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium hover:underline"
              >
                {v.title}
              </a>
              <p className="text-[11px] text-muted-foreground">
                {v.isShort ? "Short" : "Video"} · {format(new Date(v.publishedAt as string), "d MMM, HH:mm", { locale: es })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">{formatFollowers(v.views)}</span>
              <span className="hidden items-center gap-1 sm:flex">
                <ThumbsUp className="h-3 w-3" />
                {formatFollowers(v.likes)}
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                <MessageSquare className="h-3 w-3" />
                {formatFollowers(v.comments)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </StudioCard>
  );
}

export default function YouTubeAnalisis() {
  const params = useParams<{ plataforma: string }>();
  if (params?.plataforma !== "youtube") notFound();

  const { channels, channel, select } = useYouTubeChannel();
  const [days, setDays] = useState<PeriodDays>(28);
  const [data, setData] = useState<ChannelAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VideoFilter>("todos");
  const [selected, setSelected] = useState<VideoStat | null>(null);

  const channelId = channel?.id;
  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchChannelAnalytics(channelId, days));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer YouTube Analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [channelId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);
  const videos = useMemo(
    () => (data?.videos ?? []).filter((v) => (filter === "todos" ? true : filter === "shorts" ? v.isShort : !v.isShort)).slice(0, 10),
    [data, filter]
  );

  if (!channel) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title="Conecta tu canal de YouTube"
          description="El análisis lee las métricas directo de YouTube Analytics."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const t = data?.totals;
  const p = data?.previous;
  const netSubs = t ? t.subscribersGained - t.subscribersLost : 0;
  const prevNetSubs = p ? p.subscribersGained - p.subscribersLost : 0;
  const empty = data && data.totals.views === 0 && data.previous.views === 0;
  const typeTotal = data?.contentTypes.reduce((s, c) => s + c.views, 0) ?? 0;
  const trafficTotal = data?.traffic.reduce((s, c) => s + c.views, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <StudioPageHeader
        eyebrow="YouTube"
        title="Análisis"
        subtitle={
          data
            ? `${channel.handle} · ${dayLabel(data.range.start)} al ${dayLabel(data.range.end)} (YouTube tarda ~2 días en consolidar)`
            : channel.handle
        }
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
            <div className="flex rounded-lg bg-secondary/60 p-0.5">
              {PERIODS.map((period) => (
                <button
                  key={period.days}
                  type="button"
                  onClick={() => setDays(period.days)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    days === period.days ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void load()} disabled={loading} aria-label="Actualizar">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </>
        }
      />

      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-soft p-4 text-sm text-error-soft-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : empty ? (
        <div className="space-y-6">
          <EmptyState
            icon={<ChartLine className="h-6 w-6" />}
            title="El análisis todavía no tiene datos consolidados"
            description={`YouTube Analytics entrega los datos con ~2 días de retraso: este reporte llega hasta el ${data ? dayLabel(data.range.end) : ""}. Las vistas más nuevas ya se ven abajo, en el contador en vivo, y aparecerán aquí en un par de días.`}
          />
          <LiveCounters accountId={channel.id} />
        </div>
      ) : data && t && p ? (
        <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Vistas" value={formatFollowers(t.views)} change={percentChange(t.views, p.views)} hint={`antes ${formatFollowers(p.views)}`} />
            <Kpi
              label="Horas vistas"
              value={fmt(t.minutesWatched / 60)}
              change={percentChange(t.minutesWatched, p.minutesWatched)}
              hint={`antes ${fmt(p.minutesWatched / 60)}`}
            />
            <Kpi
              label="Suscriptores netos"
              value={`${netSubs > 0 ? "+" : ""}${fmt(netSubs)}`}
              change={percentChange(netSubs, prevNetSubs)}
              hint={`+${fmt(t.subscribersGained)} / −${fmt(t.subscribersLost)}`}
            />
            <Kpi
              label="% visto promedio"
              value={`${fmt(t.avgViewPercentage)}%`}
              change={percentChange(t.avgViewPercentage, p.avgViewPercentage)}
              hint={`${formatDuration(Math.round(t.avgViewDuration))} por vista`}
            />
          </div>

          {insights.length > 0 && (
            <StudioCard>
              <h2 className="mb-3 font-semibold">Qué está pasando</h2>
              <ul className="space-y-2.5">
                {insights.map((insight) => {
                  const { icon: Icon, className } = INSIGHT_ICONS[insight.tone];
                  return (
                    <li key={insight.text} className="flex items-start gap-2.5 text-sm">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", className)} />
                      <span>{insight.text}</span>
                    </li>
                  );
                })}
              </ul>
            </StudioCard>
          )}

          <LiveCounters accountId={channel.id} />

          <StudioCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Vistas por día</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES_COLOR }} />
                  Este período
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: PREVIOUS_COLOR }} />
                  Período anterior
                </span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dayLabel}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatFollowers(v)}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                    content={<ChartTooltip formatter={dayLabel} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="previousViews"
                    name="Período anterior"
                    stroke={PREVIOUS_COLOR}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="none"
                    dot={false}
                    activeDot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Vistas"
                    stroke={SERIES_COLOR}
                    strokeWidth={2}
                    fill="url(#viewsFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </StudioCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <StudioCard>
              <h2 className="font-semibold">Shorts vs videos</h2>
              <p className="mb-4 text-xs text-muted-foreground">Qué formato trae las vistas y cuál trae suscriptores</p>
              {data.contentTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
              ) : (
                <div className="space-y-4">
                  {data.contentTypes.map((c) => (
                    <BarRow
                      key={c.type}
                      label={c.label}
                      value={c.views}
                      total={typeTotal}
                      detail={`+${fmt(c.subscribersGained)} suscriptores · ${fmt(c.avgViewPercentage)}% visto en promedio`}
                    />
                  ))}
                </div>
              )}
            </StudioCard>
            <StudioCard>
              <h2 className="font-semibold">De dónde llegan las vistas</h2>
              <p className="mb-4 text-xs text-muted-foreground">Dónde te está mostrando YouTube</p>
              {data.traffic.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
              ) : (
                <div className="space-y-4">
                  {data.traffic.slice(0, 5).map((s) => (
                    <BarRow key={s.label} label={s.label} value={s.views} total={trafficTotal} />
                  ))}
                </div>
              )}
            </StudioCard>
          </div>

          <StudioCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Videos que van ganando</h2>
                <p className="text-xs text-muted-foreground">Top por vistas del período · la flecha compara con el período anterior</p>
              </div>
              <div className="flex rounded-lg bg-secondary/60 p-0.5">
                {(["todos", "videos", "shorts"] as VideoFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      filter === f ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {videos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin vistas en este período.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 pb-2 font-medium">#</th>
                      <th className="px-2 pb-2 font-medium">Video</th>
                      <th className="px-2 pb-2 text-right font-medium">Vistas</th>
                      <th className="px-2 pb-2 text-right font-medium">Tendencia</th>
                      <th className="px-2 pb-2 text-right font-medium">% visto</th>
                      <th className="px-2 pb-2 text-right font-medium">Subs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v, i) => (
                      <tr
                        key={v.id}
                        onClick={() => setSelected(v)}
                        className="cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/5"
                      >
                        <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-10 w-[70px] shrink-0 overflow-hidden rounded-md bg-secondary">
                              {v.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <Video className="m-auto h-4 w-4 text-muted-foreground" />
                              )}
                              {v.isShort && (
                                <span className="absolute left-0.5 top-0.5 rounded bg-red-500/90 px-1 text-[8px] font-bold uppercase text-white">
                                  Short
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-1 font-medium">{v.title}</p>
                              {v.publishedAt && (
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(v.publishedAt), "d MMM yyyy", { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium tabular-nums">{formatFollowers(v.views)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <Delta value={v.isNew ? null : percentChange(v.views, v.previousViews)} />
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{fmt(v.avgViewPercentage)}%</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">+{fmt(v.subscribersGained)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StudioCard>
        </div>
      ) : null}

      <VideoDetailSheet accountId={channel.id} video={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function retentionAt(points: { ratio: number; percent: number }[], ratio: number): number | null {
  if (!points.length) return null;
  return points.reduce((best, p) => (Math.abs(p.ratio - ratio) < Math.abs(best.ratio - ratio) ? p : best)).percent;
}

function VideoDetailSheet({ accountId, video, onClose }: { accountId: string; video: VideoStat | null; onClose: () => void }) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video) return;
    setDetail(null);
    setError(null);
    let cancelled = false;
    fetchVideoDetail(accountId, video)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudo cargar el video."));
    return () => {
      cancelled = true;
    };
  }, [accountId, video]);

  const url = video ? (video.isShort ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`) : "#";
  const retention = detail?.retention ?? [];
  const reads = [
    { label: "Al 25%", value: retentionAt(retention, 0.25) },
    { label: "A la mitad", value: retentionAt(retention, 0.5) },
    { label: "Al final", value: retentionAt(retention, 0.97) },
  ];

  return (
    <Sheet open={video !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {video && (
          <>
            <SheetHeader className="space-y-3 text-left">
              {video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover" />
              )}
              <SheetTitle className="leading-snug">{video.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-3">
                {video.publishedAt && <span>Publicado el {format(new Date(video.publishedAt), "d MMM yyyy", { locale: es })}</span>}
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Ver en YouTube <ExternalLink className="h-3 w-3" />
                </a>
              </SheetDescription>
            </SheetHeader>

            {error ? (
              <p className="mt-6 rounded-xl bg-error-soft p-3 text-sm text-error-soft-foreground">{error}</p>
            ) : !detail ? (
              <div className="mt-6 space-y-4">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Vistas", value: formatFollowers(detail.totals.views) },
                    { label: "% visto", value: `${fmt(detail.totals.avgViewPercentage)}%` },
                    { label: "Duración media", value: formatDuration(Math.round(detail.totals.avgViewDuration)) },
                    { label: "Suscriptores", value: `+${fmt(detail.totals.subscribersGained)}` },
                    { label: "Me gusta", value: formatFollowers(detail.totals.likes) },
                    { label: "Comentarios", value: formatFollowers(detail.totals.comments) },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-border p-3">
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Vistas por día</h3>
                  <p className="mb-3 text-xs text-muted-foreground">Desde que se publicó (últimos 90 días como máximo)</p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={detail.daily} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="videoFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={dayLabel}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatFollowers(v)}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }} content={<ChartTooltip formatter={dayLabel} />} />
                        <Area type="monotone" dataKey="views" name="Vistas" stroke={SERIES_COLOR} strokeWidth={2} fill="url(#videoFill)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Retención: quién sigue mirando</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Dónde se va la gente. Una caída fuerte al inicio = el gancho no engancha.
                    {video.isShort && " En Shorts puede pasar de 100% porque la gente lo repite."}
                  </p>
                  {retention.length === 0 ? (
                    <p className="text-sm text-muted-foreground">YouTube aún no tiene suficientes vistas para mostrar la retención.</p>
                  ) : (
                    <>
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {reads.map((r) => (
                          <div key={r.label} className="rounded-xl border border-border p-2.5 text-center">
                            <p className="text-[11px] text-muted-foreground">{r.label}</p>
                            <p className="font-semibold tabular-nums">{r.value === null ? "—" : `${fmt(r.value)}%`}</p>
                          </div>
                        ))}
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={retention} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
                            <XAxis
                              dataKey="ratio"
                              type="number"
                              domain={[0, 1]}
                              ticks={[0, 0.25, 0.5, 0.75, 1]}
                              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tickFormatter={(v: number) => `${v}%`}
                              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <ReferenceLine y={50} stroke={GRID_COLOR} strokeDasharray="3 3" />
                            <Tooltip
                              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                              content={({ active, payload }) =>
                                active && payload?.length ? (
                                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                                    <p className="text-muted-foreground">
                                      Al {Math.round(Number(payload[0].payload.ratio) * 100)}% del video
                                    </p>
                                    <p className="font-semibold text-foreground">{fmt(Number(payload[0].value))}% sigue mirando</p>
                                  </div>
                                ) : null
                              }
                            />
                            <Line type="monotone" dataKey="percent" stroke={SERIES_COLOR} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
