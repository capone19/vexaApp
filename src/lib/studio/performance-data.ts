// ============================================
// VEXA Content Studio - Rendimiento: datos de YouTube y de Supabase
// ============================================
// El navegador lee YouTube directo con el token del canal (cuota de Google, no de Supabase).
// Supabase solo guarda tablas chicas: la curva típica del canal (caché de las curvas diarias, para no volver
// a pedirle a Analytics lo que ya no cambia), las fotos por hora que anota n8n y las alertas enviadas.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPARE_DAY,
  CURVE_DAYS,
  cumulative,
  levelFor,
  medianCurve,
  outlierRatio,
  type PerformanceLevel,
  type RetentionPoint,
  type Snapshot,
  type VideoFormat,
} from "./performance";
import { parseSubtitles, type Cue } from "./subtitles";
import { googleGet, isoDuration, report, TRAFFIC_LABELS, type Row } from "./youtube-analytics";
import { getUploadToken } from "./youtube-upload";

const db = supabase as unknown as SupabaseClient;
const DATA_URL = "https://www.googleapis.com/youtube/v3";
/** YouTube Analytics tarda ~2 días en consolidar */
const LAG_DAYS = 2;
const MAX_UPLOADS = 200;
const BASELINE_VERSION = 1;

export interface PerfVideo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  thumbnail: string | null;
  publishedAt: string;
  durationSeconds: number;
  format: VideoFormat;
  views: number;
  likes: number;
  comments: number;
  avgViewPercentage: number | null;
  avgViewDuration: number | null;
  subscribersGained: number | null;
  minutesWatched: number | null;
  shares: number | null;
  /** Vistas acumuladas por día de vida (día 0 = el día que salió, hora del Pacífico) */
  cum: number[];
  /** Veces sobre la mediana del canal a la misma edad (7 días o la edad que tenga) */
  ratio: number | null;
  ratioDay: number;
  /** Lo mismo a los 28 días (cola larga: búsqueda y sugeridos) */
  ratio28: number | null;
  level: PerformanceLevel;
}

export interface ChannelPerformance {
  videos: PerfVideo[];
  base: Record<VideoFormat, (number | null)[]>;
  updatedAt: string;
}

interface CachedCurve {
  cum: number[];
  complete: boolean;
  /** Último día pedido a Analytics */
  end: string;
}

interface BaselineData {
  version: number;
  curves: Record<string, CachedCurve & { format: VideoFormat }>;
  median: Record<VideoFormat, (number | null)[]>;
  updated_at: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha (YYYY-MM-DD) de un instante en una zona horaria */
export function dateIn(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return parts.slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000);
}

const num = (v: string | number | undefined) => Number(v ?? 0) || 0;

/** Analytics usa días del Pacífico */
const pacificDate = (iso: string) => dateIn(new Date(iso), "America/Los_Angeles");

/** Hasta 6 pedidos a la vez para no gatillar el límite por segundo de Google */
async function pool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await run(items[i]);
      }
    })
  );
  return out;
}

// ---------- Videos del canal ----------

interface ApiVideo {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    tags?: string[];
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  status?: { privacyStatus?: string };
}

/** Videos públicos del canal, del más nuevo al más antiguo */
async function listUploads(token: string): Promise<ApiVideo[]> {
  const channel = (await googleGet(`${DATA_URL}/channels?part=contentDetails&mine=true`, token)) as {
    items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
  };
  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const ids: string[] = [];
  let pageToken = "";
  do {
    const page = (await googleGet(
      `${DATA_URL}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${pageToken ? `&pageToken=${pageToken}` : ""}`,
      token
    )) as { items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string };
    for (const item of page.items ?? []) if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && ids.length < MAX_UPLOADS);

  const videos: ApiVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const body = await googleGet(`${DATA_URL}/videos?part=snippet,contentDetails,statistics,status&id=${ids.slice(i, i + 50).join(",")}`, token);
    videos.push(...((body.items ?? []) as ApiVideo[]));
  }
  const now = Date.now();
  return videos
    .filter((v) => v.status?.privacyStatus === "public" && v.snippet?.liveBroadcastContent === "none")
    .filter((v) => v.snippet?.publishedAt && new Date(v.snippet.publishedAt).getTime() <= now)
    .sort((a, b) => (b.snippet?.publishedAt ?? "").localeCompare(a.snippet?.publishedAt ?? ""));
}

/** Vistas por día de un video desde que salió (máx. 28 días) */
async function fetchCurve(token: string, videoId: string, publishedAt: string, lastDay: string): Promise<CachedCurve> {
  const start = pacificDate(publishedAt);
  const end = [addDaysIso(start, CURVE_DAYS - 1), lastDay].sort()[0];
  if (end < start) return { cum: [], complete: false, end: lastDay };
  const rows = await report(token, { startDate: start, endDate: end, dimensions: "day", metrics: "views", filters: `video==${videoId}`, sort: "day" });
  const byDay = new Map(rows.map((r) => [String(r.day), num(r.views)]));
  const daily = Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => byDay.get(addDaysIso(start, i)) ?? 0);
  return { cum: cumulative(daily), complete: daily.length >= CURVE_DAYS, end };
}

async function readBaseline(accountId: string): Promise<BaselineData | null> {
  const { data } = await db.from("studio_channel_baselines").select("data").eq("account_id", accountId).maybeSingle();
  const value = data?.data as BaselineData | undefined;
  return value?.version === BASELINE_VERSION ? value : null;
}

/** Ranking del canal: todos los videos con su curva por edad y cuánto superan lo normal */
export async function loadChannelPerformance(accountId: string): Promise<ChannelPerformance> {
  const token = await getUploadToken(accountId);
  const today = dateIn(new Date(), "America/Los_Angeles");
  const lastDay = addDaysIso(today, -LAG_DAYS);
  const [uploads, cache] = await Promise.all([listUploads(token), readBaseline(accountId)]);
  if (!uploads.length) return { videos: [], base: { video: [], short: [] }, updatedAt: new Date().toISOString() };

  const firstDay = pacificDate(uploads[uploads.length - 1].snippet?.publishedAt ?? new Date().toISOString());
  const lifetime = await report(token, {
    startDate: firstDay,
    endDate: today,
    dimensions: "video",
    metrics: "views,averageViewPercentage,averageViewDuration,subscribersGained,estimatedMinutesWatched,shares",
    sort: "-views",
    maxResults: "200",
  }).catch(() => [] as Row[]);
  const totals = new Map(lifetime.map((r) => [String(r.video), r]));

  // Solo se le pide a Analytics la curva de los videos que todavía no completan sus 28 días
  const curves = await pool(uploads, 6, async (v) => {
    const cached = cache?.curves[v.id];
    if (cached && (cached.complete || cached.end >= lastDay)) return cached;
    return fetchCurve(token, v.id, v.snippet?.publishedAt as string, lastDay).catch(() => cached ?? { cum: [], complete: false, end: lastDay });
  });

  const base: PerfVideo[] = uploads.map((v, i) => {
    const duration = isoDuration(v.contentDetails?.duration);
    const t = totals.get(v.id);
    const thumbs = v.snippet?.thumbnails ?? {};
    return {
      id: v.id,
      title: v.snippet?.title ?? "(sin título)",
      description: v.snippet?.description ?? "",
      tags: v.snippet?.tags ?? [],
      thumbnail: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
      publishedAt: v.snippet?.publishedAt as string,
      durationSeconds: duration,
      format: duration > 0 && duration <= 180 ? "short" : "video",
      views: num(v.statistics?.viewCount),
      likes: num(v.statistics?.likeCount),
      comments: num(v.statistics?.commentCount),
      avgViewPercentage: t ? num(t.averageViewPercentage) : null,
      avgViewDuration: t ? num(t.averageViewDuration) : null,
      subscribersGained: t ? num(t.subscribersGained) : null,
      minutesWatched: t ? num(t.estimatedMinutesWatched) : null,
      shares: t ? num(t.shares) : null,
      cum: curves[i].cum,
      ratio: null,
      ratioDay: 0,
      ratio28: null,
      level: "sin-base",
    };
  });

  const median = { video: medianCurve(base, "video"), short: medianCurve(base, "short") };
  const videos = base.map((v) => {
    const peers = medianCurve(base, v.format, v.id);
    const week = outlierRatio(v, peers, COMPARE_DAY - 1);
    const month = v.cum.length >= CURVE_DAYS ? outlierRatio(v, peers, CURVE_DAYS - 1).ratio : null;
    return { ...v, ratio: week.ratio, ratioDay: week.day, ratio28: month, level: levelFor(week.ratio) };
  });

  // Caché + curva típica (n8n la usa para detectar los videos que despegan)
  const data: BaselineData = {
    version: BASELINE_VERSION,
    curves: Object.fromEntries(base.map((v, i) => [v.id, { ...curves[i], format: v.format }])),
    median,
    updated_at: new Date().toISOString(),
  };
  await db.from("studio_channel_baselines").upsert({ account_id: accountId, data, updated_at: data.updated_at });

  return { videos, base: median, updatedAt: data.updated_at };
}

// ---------- Fotos por hora y alertas (las escribe n8n) ----------

export async function loadSnapshots(accountId: string, days = 30): Promise<Snapshot[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const out: Snapshot[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 50_000; from += PAGE) {
    const { data, error } = await db
      .from("studio_video_snapshots")
      .select("video_id, taken_at, views")
      .eq("account_id", accountId)
      .gte("taken_at", since)
      .order("taken_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) out.push({ videoId: r.video_id, takenAt: r.taken_at, views: r.views });
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export interface PerformanceAlert {
  videoId: string;
  level: "despegando" | "viral" | "reactivado";
  title: string;
  isShort: boolean;
  ratio: number;
  views: number;
  ageHours: number;
  createdAt: string;
}

export async function loadAlerts(accountId: string): Promise<PerformanceAlert[]> {
  const { data, error } = await db
    .from("studio_performance_alerts")
    .select("video_id, level, video_title, is_short, ratio, views, age_hours, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    videoId: r.video_id,
    level: r.level,
    title: r.video_title,
    isShort: r.is_short,
    ratio: Number(r.ratio),
    views: r.views,
    ageHours: Number(r.age_hours),
    createdAt: r.created_at,
  }));
}

// ---------- Detalle profundo de un video (para el diagnóstico) ----------

export interface DeepDetail {
  retention: RetentionPoint[];
  traffic: { label: string; views: number; share: number }[];
  countries: { country: string; views: number; share: number }[];
  impressions: number | null;
  ctr: number | null;
}

export async function loadDeepDetail(accountId: string, video: Pick<PerfVideo, "id" | "publishedAt">): Promise<DeepDetail> {
  const token = await getUploadToken(accountId);
  const range = { startDate: pacificDate(video.publishedAt), endDate: dateIn(new Date(), "America/Los_Angeles") };
  const filters = `video==${video.id}`;
  const retentionRows = await report(token, {
    ...range,
    dimensions: "elapsedVideoTimeRatio",
    metrics: "audienceWatchRatio,relativeRetentionPerformance",
    filters,
  }).catch(() => report(token, { ...range, dimensions: "elapsedVideoTimeRatio", metrics: "audienceWatchRatio", filters }).catch(() => [] as Row[]));
  const [trafficRows, countryRows, impressionRows] = await Promise.all([
    report(token, { ...range, dimensions: "insightTrafficSourceType", metrics: "views", filters, sort: "-views" }).catch(() => [] as Row[]),
    report(token, { ...range, dimensions: "country", metrics: "views", filters, sort: "-views", maxResults: "6" }).catch(() => [] as Row[]),
    // No todos los canales tienen impresiones y CTR en la API: si no está, se sigue sin ellos
    report(token, { ...range, metrics: "videoThumbnailImpressions,videoThumbnailImpressionsClickRate", filters }).catch(() => [] as Row[]),
  ]);

  const trafficMap = new Map<string, number>();
  for (const r of trafficRows) {
    const label = TRAFFIC_LABELS[String(r.insightTrafficSourceType)] ?? "Otras";
    trafficMap.set(label, (trafficMap.get(label) ?? 0) + num(r.views));
  }
  const trafficTotal = [...trafficMap.values()].reduce((s, v) => s + v, 0);
  const countryTotal = countryRows.reduce((s, r) => s + num(r.views), 0);
  const imp = impressionRows[0];
  return {
    retention: retentionRows
      .map((r) => ({
        ratio: num(r.elapsedVideoTimeRatio),
        percent: Math.round(num(r.audienceWatchRatio) * 1000) / 10,
        relative: r.relativeRetentionPerformance === undefined ? null : num(r.relativeRetentionPerformance),
      }))
      .sort((a, b) => a.ratio - b.ratio),
    traffic: [...trafficMap.entries()]
      .map(([label, views]) => ({ label, views, share: trafficTotal ? views / trafficTotal : 0 }))
      .sort((a, b) => b.views - a.views),
    countries: countryRows.map((r) => ({ country: String(r.country), views: num(r.views), share: countryTotal ? num(r.views) / countryTotal : 0 })),
    impressions: imp && imp.videoThumbnailImpressions !== undefined ? num(imp.videoThumbnailImpressions) : null,
    ctr: imp && imp.videoThumbnailImpressionsClickRate !== undefined ? num(imp.videoThumbnailImpressionsClickRate) : null,
  };
}

// ---------- Transcripción desde los subtítulos del video ----------

/**
 * Baja los subtítulos del propio video (los que subiste o los automáticos de YouTube).
 * Cuesta ~250 unidades de cuota de YouTube: se usa solo al analizar. Devuelve null si no hay o no se puede.
 */
export async function fetchTranscript(accountId: string, videoId: string, language: string): Promise<Cue[] | null> {
  const token = await getUploadToken(accountId);
  const list = (await googleGet(`${DATA_URL}/captions?part=snippet&videoId=${videoId}`, token).catch(() => null)) as {
    items?: { id: string; snippet?: { language?: string; trackKind?: string } }[];
  } | null;
  const tracks = list?.items ?? [];
  if (!tracks.length) return null;
  const rank = (t: (typeof tracks)[number]) =>
    (t.snippet?.language?.startsWith(language) ? 0 : 2) + (t.snippet?.trackKind === "asr" ? 1 : 0);
  const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
  const res = await fetch(`${DATA_URL}/captions/${track.id}?tfmt=srt`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const cues = parseSubtitles(await res.text());
  return cues.length ? cues : null;
}
