// ============================================
// VEXA Content Studio - Análisis del canal de YouTube
// ============================================
// El navegador consulta YouTube Analytics y la API de datos directo con el token del canal
// (permiso yt-analytics.readonly): no pasa por Supabase ni por n8n.
// YouTube tarda ~2 días en consolidar las cifras, por eso los períodos terminan antes de hoy.

import { getUploadToken } from "./youtube-upload";

const ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const DATA_URL = "https://www.googleapis.com/youtube/v3";
const LAG_DAYS = 2;

export type PeriodDays = 7 | 28 | 90;

export interface PeriodRange {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
}

export interface Totals {
  views: number;
  minutesWatched: number;
  avgViewDuration: number;
  avgViewPercentage: number;
  subscribersGained: number;
  subscribersLost: number;
}

export interface DailyPoint {
  date: string;
  views: number;
  /** Vistas del mismo día relativo en el período anterior */
  previousViews: number;
  subscribers: number;
}

export interface VideoStat {
  id: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
  durationSeconds: number;
  isShort: boolean;
  views: number;
  previousViews: number;
  minutesWatched: number;
  avgViewDuration: number;
  avgViewPercentage: number;
  subscribersGained: number;
  likes: number;
  comments: number;
  /** Publicado dentro del período: no tiene con qué compararse */
  isNew: boolean;
}

export interface ContentTypeStat {
  type: string;
  label: string;
  views: number;
  minutesWatched: number;
  subscribersGained: number;
  avgViewPercentage: number;
}

export interface TrafficSource {
  id: string;
  label: string;
  views: number;
}

export interface ChannelAnalytics {
  range: PeriodRange;
  totals: Totals;
  previous: Totals;
  daily: DailyPoint[];
  videos: VideoStat[];
  contentTypes: ContentTypeStat[];
  traffic: TrafficSource[];
}

export interface RetentionPoint {
  /** 0 a 1: avance del video */
  ratio: number;
  /** Porcentaje de espectadores que sigue viendo en ese punto (puede pasar de 100 con repeticiones) */
  percent: number;
}

export interface VideoDetail {
  daily: { date: string; views: number }[];
  retention: RetentionPoint[];
  totals: Totals & { likes: number; comments: number; shares: number };
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  SHORTS: "Shorts",
  VIDEO_ON_DEMAND: "Videos",
  LIVE_STREAM: "En vivo",
  STORY: "Historias",
};

export const TRAFFIC_LABELS: Record<string, string> = {
  SHORTS: "Feed de Shorts",
  YT_SEARCH: "Búsqueda en YouTube",
  RELATED_VIDEO: "Videos sugeridos",
  SUBSCRIBER: "Inicio y suscripciones",
  YT_CHANNEL: "Tu canal",
  EXT_URL: "Fuera de YouTube",
  NO_LINK_OTHER: "Directo o desconocido",
  NO_LINK_EMBEDDED: "Insertado en webs",
  PLAYLIST: "Listas de reproducción",
  YT_PLAYLIST_PAGE: "Listas de reproducción",
  NOTIFICATION: "Notificaciones",
  END_SCREEN: "Pantallas finales",
  HASHTAGS: "Hashtags",
  YT_OTHER_PAGE: "Otras páginas de YouTube",
  SHORTS_CONTENT_LINKS: "Enlaces desde Shorts",
  ANNOTATION: "Tarjetas",
  CAMPAIGN_CARD: "Tarjetas",
  ADVERTISING: "Anuncios",
  PROMOTED: "Promoción",
  SOUND_PAGE: "Página de sonidos",
  VIDEO_REMIXES: "Remixes",
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

export function periodRange(days: PeriodDays, today = new Date()): PeriodRange {
  const end = addDays(today, -LAG_DAYS);
  const start = addDays(end, -(days - 1));
  return {
    start: isoDate(start),
    end: isoDate(end),
    prevStart: isoDate(addDays(start, -days)),
    prevEnd: isoDate(addDays(start, -1)),
  };
}

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${start}T12:00:00`); isoDate(d) <= end; d = addDays(d, 1)) out.push(isoDate(d));
  return out;
}

export type Row = Record<string, string | number>;

export async function googleGet(url: string, token: string): Promise<{ columnHeaders?: { name: string }[]; rows?: (string | number)[][]; items?: unknown[] }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason as string | undefined;
    if (res.status === 403 && reason === "insufficientPermissions") {
      throw new Error("Falta el permiso de Analytics. Vuelve a conectar el canal desde Cuentas conectadas.");
    }
    if (reason === "quotaExceeded") throw new Error("Se agotó la cuota diaria de la API de YouTube. Vuelve mañana.");
    throw new Error(body?.error?.message ?? `YouTube respondió ${res.status}`);
  }
  return body;
}

export async function report(token: string, params: Record<string, string>): Promise<Row[]> {
  const url = new URL(ANALYTICS_URL);
  url.search = new URLSearchParams({ ids: "channel==MINE", ...params }).toString();
  const body = await googleGet(url.toString(), token);
  const names = (body.columnHeaders ?? []).map((h) => h.name);
  return (body.rows ?? []).map((row) => Object.fromEntries(row.map((value, i) => [names[i], value])));
}

const num = (v: string | number | undefined) => Number(v ?? 0) || 0;

const TOTAL_METRICS = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost";

function toTotals(row: Row | undefined): Totals {
  return {
    views: num(row?.views),
    minutesWatched: num(row?.estimatedMinutesWatched),
    avgViewDuration: num(row?.averageViewDuration),
    avgViewPercentage: num(row?.averageViewPercentage),
    subscribersGained: num(row?.subscribersGained),
    subscribersLost: num(row?.subscribersLost),
  };
}

/** "PT1M3S" -> 63 */
export function isoDuration(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, sec] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + sec;
}

interface VideoInfoRow {
  id: string;
  snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url: string }> };
  contentDetails?: { duration?: string };
}

async function videoInfo(token: string, ids: string[]) {
  const out = new Map<string, { title: string; thumbnail: string | null; publishedAt: string | null; durationSeconds: number }>();
  for (let i = 0; i < ids.length; i += 50) {
    const url = `${DATA_URL}/videos?part=snippet,contentDetails&id=${ids.slice(i, i + 50).join(",")}`;
    const body = await googleGet(url, token);
    for (const v of (body.items ?? []) as VideoInfoRow[]) {
      const thumbs = v.snippet?.thumbnails ?? {};
      out.set(v.id, {
        title: v.snippet?.title ?? "(sin título)",
        thumbnail: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
        publishedAt: v.snippet?.publishedAt ?? null,
        durationSeconds: isoDuration(v.contentDetails?.duration),
      });
    }
  }
  return out;
}

/** Resumen del canal para el período y comparación con el período anterior del mismo largo */
export async function fetchChannelAnalytics(accountId: string, days: PeriodDays): Promise<ChannelAnalytics> {
  const token = await getUploadToken(accountId);
  const range = periodRange(days);
  const current = { startDate: range.start, endDate: range.end };

  const [totalsRows, previousRows, dailyRows, videoRows, typeRows, trafficRows] = await Promise.all([
    report(token, { ...current, metrics: TOTAL_METRICS }),
    report(token, { startDate: range.prevStart, endDate: range.prevEnd, metrics: TOTAL_METRICS }),
    report(token, {
      startDate: range.prevStart,
      endDate: range.end,
      dimensions: "day",
      metrics: "views,subscribersGained,subscribersLost",
      sort: "day",
    }),
    report(token, {
      ...current,
      dimensions: "video",
      metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments",
      sort: "-views",
      maxResults: "25",
    }),
    // Las secciones opcionales no tumban el análisis si YouTube no las entrega
    report(token, {
      ...current,
      dimensions: "creatorContentType",
      metrics: "views,estimatedMinutesWatched,averageViewPercentage,subscribersGained",
    }).catch(() => [] as Row[]),
    report(token, {
      ...current,
      dimensions: "insightTrafficSourceType",
      metrics: "views",
      sort: "-views",
    }).catch(() => [] as Row[]),
  ]);

  const byDay = new Map(dailyRows.map((r) => [String(r.day), r]));
  const currentDates = datesBetween(range.start, range.end);
  const previousDates = datesBetween(range.prevStart, range.prevEnd);
  const daily: DailyPoint[] = currentDates.map((date, i) => {
    const row = byDay.get(date);
    return {
      date,
      views: num(row?.views),
      previousViews: num(byDay.get(previousDates[i])?.views),
      subscribers: num(row?.subscribersGained) - num(row?.subscribersLost),
    };
  });

  const ids = videoRows.map((r) => String(r.video));
  const [info, previousByVideo] = await Promise.all([
    ids.length ? videoInfo(token, ids) : Promise.resolve(new Map()),
    ids.length
      ? report(token, {
          startDate: range.prevStart,
          endDate: range.prevEnd,
          dimensions: "video",
          metrics: "views",
          filters: `video==${ids.join(",")}`,
          maxResults: "25",
        }).catch(() => [] as Row[])
      : Promise.resolve([] as Row[]),
  ]);
  const previousViews = new Map(previousByVideo.map((r) => [String(r.video), num(r.views)]));

  const videos: VideoStat[] = videoRows.map((r) => {
    const id = String(r.video);
    const meta = info.get(id);
    const publishedAt = meta?.publishedAt ?? null;
    const duration = meta?.durationSeconds ?? 0;
    return {
      id,
      title: meta?.title ?? id,
      thumbnail: meta?.thumbnail ?? null,
      publishedAt,
      durationSeconds: duration,
      isShort: duration > 0 && duration <= 180,
      views: num(r.views),
      previousViews: previousViews.get(id) ?? 0,
      minutesWatched: num(r.estimatedMinutesWatched),
      avgViewDuration: num(r.averageViewDuration),
      avgViewPercentage: num(r.averageViewPercentage),
      subscribersGained: num(r.subscribersGained),
      likes: num(r.likes),
      comments: num(r.comments),
      isNew: publishedAt !== null && publishedAt.slice(0, 10) >= range.start,
    };
  });

  const contentTypes: ContentTypeStat[] = typeRows
    .map((r) => ({
      type: String(r.creatorContentType),
      label: CONTENT_TYPE_LABELS[String(r.creatorContentType)] ?? "Otros",
      views: num(r.views),
      minutesWatched: num(r.estimatedMinutesWatched),
      subscribersGained: num(r.subscribersGained),
      avgViewPercentage: num(r.averageViewPercentage),
    }))
    .filter((t) => t.views > 0)
    .sort((a, b) => b.views - a.views);

  // Fuentes con el mismo nombre en español (p. ej. las dos de listas) se suman
  const trafficMap = new Map<string, TrafficSource>();
  for (const r of trafficRows) {
    const id = String(r.insightTrafficSourceType);
    const label = TRAFFIC_LABELS[id] ?? "Otras";
    const prev = trafficMap.get(label);
    trafficMap.set(label, { id, label, views: (prev?.views ?? 0) + num(r.views) });
  }
  const traffic = [...trafficMap.values()].filter((t) => t.views > 0).sort((a, b) => b.views - a.views);

  return {
    range,
    totals: toTotals(totalsRows[0]),
    previous: toTotals(previousRows[0]),
    daily,
    videos,
    contentTypes,
    traffic,
  };
}

/** Detalle de un video: vistas por día desde que se publicó (máx. 90 días) y curva de retención */
export async function fetchVideoDetail(accountId: string, video: Pick<VideoStat, "id" | "publishedAt">): Promise<VideoDetail> {
  const token = await getUploadToken(accountId);
  const end = periodRange(7).end;
  const published = video.publishedAt ? video.publishedAt.slice(0, 10) : end;
  const ninetyAgo = isoDate(addDays(new Date(`${end}T12:00:00`), -89));
  const start = published > ninetyAgo ? published : ninetyAgo;
  const since = published < end ? published : end;
  const filters = `video==${video.id}`;

  const [dailyRows, totalsRows, retentionRows] = await Promise.all([
    report(token, { startDate: start, endDate: end, dimensions: "day", metrics: "views", filters, sort: "day" }),
    report(token, {
      startDate: since,
      endDate: end,
      metrics: `${TOTAL_METRICS},likes,comments,shares`,
      filters,
    }),
    report(token, {
      startDate: since,
      endDate: end,
      dimensions: "elapsedVideoTimeRatio",
      metrics: "audienceWatchRatio",
      filters,
    }).catch(() => [] as Row[]),
  ]);

  const byDay = new Map(dailyRows.map((r) => [String(r.day), num(r.views)]));
  const t = totalsRows[0];
  return {
    daily: start <= end ? datesBetween(start, end).map((date) => ({ date, views: byDay.get(date) ?? 0 })) : [],
    retention: retentionRows
      .map((r) => ({ ratio: num(r.elapsedVideoTimeRatio), percent: Math.round(num(r.audienceWatchRatio) * 1000) / 10 }))
      .sort((a, b) => a.ratio - b.ratio),
    totals: { ...toTotals(t), likes: num(t?.likes), comments: num(t?.comments), shares: num(t?.shares) },
  };
}

/** Variación porcentual; null si no hay base para comparar */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export interface Insight {
  tone: "bueno" | "atencion" | "neutro";
  text: string;
}

const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));

/** Hasta 3 conclusiones en lenguaje simple, ordenadas por lo que más mueve la aguja */
export function buildInsights(a: ChannelAnalytics): Insight[] {
  const out: Insight[] = [];
  const { totals, previous } = a;

  const change = percentChange(totals.views, previous.views);
  if (change !== null && Math.abs(change) >= 10) {
    out.push(
      change > 0
        ? { tone: "bueno", text: `Vas en alza: ${fmt(totals.views)} vistas, un ${fmt(change)}% más que el período anterior.` }
        : { tone: "atencion", text: `Vas a la baja: ${fmt(totals.views)} vistas, un ${fmt(-change)}% menos que el período anterior. Publicar con constancia es lo que más lo revierte.` }
    );
  }

  const shorts = a.contentTypes.find((t) => t.type === "SHORTS");
  const longs = a.contentTypes.find((t) => t.type === "VIDEO_ON_DEMAND");
  const totalViews = a.contentTypes.reduce((s, t) => s + t.views, 0);
  const totalSubs = a.contentTypes.reduce((s, t) => s + t.subscribersGained, 0);
  if (shorts && longs && totalViews > 0 && totalSubs > 0) {
    const shortViews = (shorts.views / totalViews) * 100;
    const longSubs = (longs.subscribersGained / totalSubs) * 100;
    if (shortViews >= 60 && longSubs >= 40) {
      out.push({
        tone: "neutro",
        text: `Los Shorts traen el ${fmt(shortViews)}% de las vistas, pero los videos largos traen el ${fmt(longSubs)}% de los suscriptores: usa los Shorts para llevar gente a los videos.`,
      });
    }
  }

  const rising = a.videos
    .filter((v) => !v.isNew && v.views >= 100 && v.previousViews > 0)
    .map((v) => ({ v, growth: percentChange(v.views, v.previousViews) ?? 0 }))
    .filter((x) => x.growth >= 50)
    .sort((x, y) => y.v.views - x.v.views)[0];
  if (rising) {
    out.push({
      tone: "bueno",
      text: `"${rising.v.title}" está despegando (+${fmt(rising.growth)}%). Es buen momento para un Short o un video relacionado que lleve a él.`,
    });
  }

  const best = a.videos.filter((v) => v.views >= 50).sort((x, y) => y.avgViewPercentage - x.avgViewPercentage)[0];
  if (best && out.length < 3) {
    out.push({
      tone: "bueno",
      text: `"${best.title}" es el que más retiene: la gente ve el ${fmt(best.avgViewPercentage)}% en promedio. Repite ese tema y ese gancho.`,
    });
  }

  if (totals.views >= 1000 && out.length < 3) {
    const net = totals.subscribersGained - totals.subscribersLost;
    out.push({
      tone: net > 0 ? "neutro" : "atencion",
      text: `Ganas ${fmt((net / totals.views) * 1000)} suscriptores por cada 1.000 vistas. Un llamado a suscribirse al final (y en el comentario fijado) sube ese número.`,
    });
  }

  return out.slice(0, 3);
}
