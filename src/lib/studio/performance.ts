// ============================================
// VEXA Content Studio - Rendimiento: cálculos (sin red)
// ============================================
// Un video no se compara por vistas totales sino contra la curva típica del canal A LA MISMA EDAD:
// "a los 7 días este video lleva 3,2 veces lo que lleva normalmente un video tuyo a los 7 días".
// La curva típica sale de YouTube Analytics (vistas por día desde que se publicó cada video) y, para las
// primeras horas, de las fotos por hora que toma n8n (YouTube no entrega vistas por hora).
// La misma lógica de "despegando" corre en n8n para avisar por Telegram.

export type VideoFormat = "video" | "short";

/** Días de vida que se siguen por video (curva diaria acumulada) */
export const CURVE_DAYS = 28;
/** Edad (en días) a la que se comparan los videos en el ranking */
export const COMPARE_DAY = 7;
/** Mínimo de videos del mismo formato para hablar de "lo normal del canal" */
export const MIN_PEERS = 3;

export type PerformanceLevel = "viral" | "sobresaliente" | "normal" | "bajo" | "sin-base";

export const LEVEL_LABELS: Record<PerformanceLevel, string> = {
  viral: "Excepcional",
  sobresaliente: "Sobresaliente",
  normal: "Normal",
  bajo: "Bajo",
  "sin-base": "Sin base aún",
};

export function levelFor(ratio: number | null): PerformanceLevel {
  if (ratio === null || !Number.isFinite(ratio)) return "sin-base";
  if (ratio >= 5) return "viral";
  if (ratio >= 2) return "sobresaliente";
  if (ratio >= 0.6) return "normal";
  return "bajo";
}

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Curva acumulada a partir de vistas diarias: cum[d] = vistas desde el día de publicación hasta el día d incluido */
export function cumulative(daily: number[]): number[] {
  const out: number[] = [];
  let total = 0;
  for (const n of daily.slice(0, CURVE_DAYS)) {
    total += Math.max(0, n);
    out.push(total);
  }
  return out;
}

export interface CurveVideo {
  id: string;
  format: VideoFormat;
  cum: number[];
}

/** Mediana del canal para cada día de vida, por formato (sin contar el video que se está midiendo) */
export function medianCurve(videos: CurveVideo[], format: VideoFormat, excludeId?: string): (number | null)[] {
  const peers = videos.filter((v) => v.format === format && v.id !== excludeId);
  return Array.from({ length: CURVE_DAYS }, (_, d) => {
    const values = peers.filter((v) => v.cum.length > d).map((v) => v.cum[d]);
    return values.length >= MIN_PEERS ? median(values) : null;
  });
}

/** Cuántas veces supera el video a la mediana a la edad indicada (o la mayor edad que tenga, si es más joven) */
export function outlierRatio(video: CurveVideo, base: (number | null)[], day = COMPARE_DAY - 1): { ratio: number | null; day: number } {
  if (!video.cum.length) return { ratio: null, day: 0 };
  const d = Math.min(day, video.cum.length - 1);
  const expected = base[d];
  if (expected === null || expected === undefined) return { ratio: null, day: d };
  // Con medianas muy chicas cualquier video "es 10x": piso de 10 vistas
  return { ratio: video.cum[d] / Math.max(expected, 10), day: d };
}

/**
 * Vistas esperadas a cierta edad en horas, interpolando la mediana diaria.
 * cum[d] es el cierre del día d (hora del Pacífico): en promedio un video lleva ~12 h el día que sale,
 * así que el punto d queda en 24·d + 12 horas.
 */
export function expectedViewsAt(base: (number | null)[], ageHours: number): number | null {
  const points: [number, number][] = [[0, 0]];
  base.forEach((v, d) => {
    if (v !== null && v !== undefined) points.push([24 * d + 12, v]);
  });
  if (points.length < 2) return null;
  if (ageHours >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 1; i < points.length; i++) {
    const [h1, v1] = points[i];
    if (ageHours <= h1) {
      const [h0, v0] = points[i - 1];
      return v0 + ((v1 - v0) * (ageHours - h0)) / (h1 - h0);
    }
  }
  return null;
}

// ---------- Fotos por hora (n8n) ----------

export interface Snapshot {
  videoId: string;
  takenAt: string;
  views: number;
}

export interface LiveStatus {
  /** Vistas en la última foto */
  views: number;
  /** Vistas de las últimas 24 h (si hay fotos que lo cubran) */
  last24h: number | null;
  /** Vistas por hora en las últimas ~3 h */
  perHour: number | null;
  ageHours: number;
  expected: number | null;
  ratio: number | null;
  takenAt: string;
}

/** Valor de la curva de un video a cierta hora, interpolando entre fotos */
function viewsAtTime(points: { t: number; v: number }[], t: number): number | null {
  if (!points.length || t < points[0].t || t > points[points.length - 1].t) return null;
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i].t) {
      const a = points[i - 1];
      const b = points[i];
      return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
    }
  }
  return points[points.length - 1].v;
}

/** Estado en vivo de un video según las fotos de n8n y la curva típica del canal */
export function liveStatus(snaps: Snapshot[], publishedAt: string, base: (number | null)[]): LiveStatus | null {
  const pub = new Date(publishedAt).getTime();
  const points = snaps
    .map((s) => ({ t: new Date(s.takenAt).getTime(), v: s.views }))
    .sort((a, b) => a.t - b.t);
  if (!points.length) return null;
  const last = points[points.length - 1];
  const withStart = pub < points[0].t ? [{ t: pub, v: 0 }, ...points] : points;
  const ageHours = (last.t - pub) / 3_600_000;
  const day = viewsAtTime(withStart, last.t - 24 * 3_600_000);
  const three = viewsAtTime(withStart, last.t - 3 * 3_600_000);
  const expected = expectedViewsAt(base, ageHours);
  return {
    views: last.v,
    last24h: day === null ? null : Math.max(0, last.v - day),
    perHour: three === null ? null : Math.max(0, (last.v - three) / 3),
    ageHours,
    expected,
    ratio: expected === null || ageHours < 2 ? null : last.v / Math.max(expected, 10),
    takenAt: new Date(last.t).toISOString(),
  };
}

// ---------- Horarios ----------

export const TZ_US = "America/New_York";
export const TZ_CL = "America/Santiago";

/** Día de la semana (0 = domingo) y hora de un instante en una zona horaria */
export function zonedParts(date: Date, timeZone: string): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, hour: Number(get("hour")) % 24, minute: Number(get("minute")) };
}

/** Convierte "hora X en la zona A, día Y" a la hora equivalente en la zona B (hoy, con el horario de verano vigente) */
export function convertHour(weekday: number, hour: number, from: string, to: string, ref = new Date()): { weekday: number; hour: number } {
  // Busca dentro de la semana actual el instante en que la zona "from" marca ese día y hora
  const start = new Date(ref);
  start.setUTCHours(0, 0, 0, 0);
  for (let h = 0; h < 24 * 8; h++) {
    const t = new Date(start.getTime() + h * 3_600_000);
    const p = zonedParts(t, from);
    if (p.weekday === weekday && p.hour === hour) {
      const q = zonedParts(t, to);
      return { weekday: q.weekday, hour: q.hour };
    }
  }
  return { weekday, hour };
}

export interface Heatmap {
  /** [día 0-6][hora 0-23] = % promedio de las vistas del día que llegan en esa hora */
  cells: number[][];
  /** Por día de la semana: vistas del día comparadas con el promedio diario de cada video (1 = normal) */
  days: (number | null)[];
  /** Horas de datos que respaldan el mapa */
  hours: number;
  max: number;
}

const H_MS = 3_600_000;

/**
 * Cuándo ve tu audiencia, según las fotos por hora de n8n (en la zona indicada).
 * Para que el lanzamiento de un video no tape el hábito de la audiencia: se ignoran sus primeras 24 h y
 * cada hora se mide como % de las vistas de ese día del mismo video (solo días con al menos 18 h de fotos).
 */
export function viewsHeatmap(snaps: Snapshot[], timeZone: string, published: Map<string, string>): Heatmap {
  const sum = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const count = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const daySum = new Array<number>(7).fill(0);
  const dayCount = new Array<number>(7).fill(0);
  const byVideo = new Map<string, { t: number; v: number }[]>();
  for (const s of snaps) {
    if (!published.has(s.videoId)) continue;
    const list = byVideo.get(s.videoId) ?? [];
    list.push({ t: new Date(s.takenAt).getTime(), v: s.views });
    byVideo.set(s.videoId, list);
  }
  const slots = new Set<number>();
  for (const [id, list] of byVideo) {
    const pub = new Date(published.get(id) as string).getTime();
    list.sort((a, b) => a.t - b.t);
    // Vistas de cada hora, agrupadas por día local
    const days = new Map<string, { weekday: number; hours: Map<number, number> }>();
    for (let i = 1; i < list.length; i++) {
      const gap = (list[i].t - list[i - 1].t) / H_MS;
      if (gap <= 0 || gap > 2.5) continue;
      const mid = list[i].t - (gap / 2) * H_MS;
      if (mid - pub < 24 * H_MS) continue;
      const p = zonedParts(new Date(mid), timeZone);
      const key = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(mid));
      const day = days.get(key) ?? { weekday: p.weekday, hours: new Map<number, number>() };
      day.hours.set(p.hour, (day.hours.get(p.hour) ?? 0) + Math.max(0, list[i].v - list[i - 1].v) / gap);
      days.set(key, day);
      slots.add(Math.round(mid / H_MS));
    }
    const complete = [...days.values()].filter((d) => d.hours.size >= 18);
    const totals = complete.map((d) => [...d.hours.values()].reduce((a, b) => a + b, 0));
    const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    complete.forEach((d, i) => {
      if (totals[i] <= 0) return;
      for (const [hour, views] of d.hours) {
        sum[d.weekday][hour] += (views / totals[i]) * 100;
        count[d.weekday][hour] += 1;
      }
      if (mean > 0) {
        daySum[d.weekday] += totals[i] / mean;
        dayCount[d.weekday] += 1;
      }
    });
  }
  const cells = sum.map((row, d) => row.map((v, h) => (count[d][h] ? v / count[d][h] : 0)));
  return {
    cells,
    days: daySum.map((v, d) => (dayCount[d] ? v / dayCount[d] : null)),
    hours: slots.size,
    max: Math.max(0, ...cells.flat()),
  };
}

export interface SlotAdvice {
  weekday: number | null;
  /** Hora de publicación sugerida (en la zona del mapa) */
  hour: number;
  /** Hora en que más se ve el canal */
  peakHour: number;
  confidence: "alta" | "media" | "baja" | "referencia";
  reason: string;
}

/** Referencia para audiencia de EE. UU. cuando todavía no hay datos propios (hora del Este) */
export const US_REFERENCE: Record<VideoFormat, { days: number[]; hour: number; peakHour: number; reason: string }> = {
  video: {
    days: [4, 5, 6],
    hour: 12,
    peakHour: 19,
    reason: "Audiencia adulta de EE. UU.: el video largo sale al mediodía del Este para juntar las primeras vistas antes del peak de la noche (19-22 h ET). Jueves a sábado rinden mejor en historia.",
  },
  short: {
    days: [0, 1, 2, 3, 4, 5, 6],
    hour: 11,
    peakHour: 13,
    reason: "Los Shorts se mueven por el feed casi todo el día; publicar a media mañana del Este (11 h ET) los deja calientes para la hora de almuerzo y la tarde en EE. UU.",
  },
};

/** Mejor horario según el mapa: publicar antes del peak para llegar con impulso */
export function adviseSlot(map: Heatmap, format: VideoFormat): SlotAdvice {
  const ref = US_REFERENCE[format];
  if (map.hours < 72 || map.max <= 0) {
    return { weekday: format === "video" ? ref.days[ref.days.length - 1] : null, hour: ref.hour, peakHour: ref.peakHour, confidence: "referencia", reason: ref.reason };
  }
  // Perfil por hora (suavizado con las horas vecinas) y mejor día
  const byHour = Array.from({ length: 24 }, (_, h) => map.cells.reduce((s, row) => s + row[h], 0));
  const smooth = byHour.map((_, h) => byHour[(h + 23) % 24] * 0.25 + byHour[h] * 0.5 + byHour[(h + 1) % 24] * 0.25);
  const peakHour = smooth.indexOf(Math.max(...smooth));
  const known = map.days.map((v, d) => ({ v, d })).filter((x): x is { v: number; d: number } => x.v !== null);
  const bestDay = known.length >= 3 ? known.sort((a, b) => b.v - a.v)[0].d : null;
  const lead = format === "video" ? 3 : 1;
  const hour = (peakHour - lead + 24) % 24;
  const confidence = map.hours >= 24 * 21 ? "alta" : map.hours >= 24 * 7 ? "media" : "baja";
  return {
    weekday: format === "video" ? bestDay ?? ref.days[ref.days.length - 1] : null,
    hour,
    peakHour,
    confidence,
    reason:
      format === "video"
        ? `Tu audiencia tiene su peak a las ${peakHour}:00 hora del Este. Un video largo necesita ~3 h para que YouTube lo pruebe con tus suscriptores y lo empuje justo en ese peak.`
        : `Tu audiencia tiene su peak a las ${peakHour}:00 hora del Este. El Short sale 1 h antes para entrar al feed cuando más gente está mirando.`,
  };
}

export interface PublishSlotStat {
  label: string;
  fromHour: number;
  toHour: number;
  videos: number;
  medianRatio: number | null;
}

const DAY_PARTS = [
  { label: "Madrugada", fromHour: 0, toHour: 6 },
  { label: "Mañana", fromHour: 6, toHour: 11 },
  { label: "Mediodía", fromHour: 11, toHour: 15 },
  { label: "Tarde", fromHour: 15, toHour: 19 },
  { label: "Noche", fromHour: 19, toHour: 24 },
];

/** Cómo rindió cada franja de publicación (hora de EE. UU.), según el multiplicador de cada video */
export function publishSlotStats(videos: { publishedAt: string | null; ratio: number | null }[], timeZone = TZ_US): PublishSlotStat[] {
  return DAY_PARTS.map((part) => {
    const ratios = videos
      .filter((v) => v.publishedAt && v.ratio !== null)
      .filter((v) => {
        const h = zonedParts(new Date(v.publishedAt as string), timeZone).hour;
        return h >= part.fromHour && h < part.toHour;
      })
      .map((v) => v.ratio as number);
    return { ...part, videos: ratios.length, medianRatio: median(ratios) };
  });
}

// ---------- Retención ----------

export interface RetentionPoint {
  /** 0 a 1: avance del video */
  ratio: number;
  /** % de espectadores que sigue viendo (puede pasar de 100 con repeticiones) */
  percent: number;
  /** Comparado con videos de largo similar en YouTube: 0 a 1 (0,5 = promedio) */
  relative: number | null;
}

export interface RetentionMoment {
  at: number;
  type: "caida" | "pico" | "meseta";
  change: number;
  percent: number;
}

/** Retención a cierto segundo (interpolada) */
export function retentionAt(points: RetentionPoint[], seconds: number, duration: number): number | null {
  if (!points.length || duration <= 0) return null;
  const r = Math.min(1, Math.max(0, seconds / duration));
  for (let i = 1; i < points.length; i++) {
    if (r <= points[i].ratio) {
      const a = points[i - 1];
      const b = points[i];
      return b.ratio === a.ratio ? b.percent : a.percent + ((b.percent - a.percent) * (r - a.ratio)) / (b.ratio - a.ratio);
    }
  }
  return points[points.length - 1].percent;
}

/** Las caídas más fuertes y los picos (gente que vuelve a ver) de la curva, en segundos del video */
export function retentionMoments(points: RetentionPoint[], duration: number, max = 4): RetentionMoment[] {
  if (points.length < 6 || duration <= 0) return [];
  const window = 2;
  const drops: RetentionMoment[] = [];
  const peaks: RetentionMoment[] = [];
  // La caída natural de los primeros segundos se mide aparte (gancho)
  for (let i = 3; i + window < points.length; i++) {
    const change = points[i + window].percent - points[i].percent;
    const at = Math.round(points[i].ratio * duration);
    if (change < 0) drops.push({ at, type: "caida", change, percent: points[i].percent });
    else if (change > 1) peaks.push({ at, type: "pico", change, percent: points[i].percent });
  }
  const pick = (list: RetentionMoment[], cmp: (a: RetentionMoment, b: RetentionMoment) => number, n: number) => {
    const out: RetentionMoment[] = [];
    for (const m of [...list].sort(cmp)) {
      if (out.every((o) => Math.abs(o.at - m.at) > duration * 0.06)) out.push(m);
      if (out.length >= n) break;
    }
    return out;
  };
  return [
    ...pick(drops, (a, b) => a.change - b.change, max - 1),
    ...pick(peaks, (a, b) => b.change - a.change, 1),
  ].sort((a, b) => a.at - b.at);
}

/** Segundo clave del gancho: 30 s en videos largos, 3 s en Shorts */
export const hookSecond = (format: VideoFormat) => (format === "short" ? 3 : 30);

// ---------- Formato de horas ----------

export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Edad legible: "5 h", "3 días" */
export function ageLabel(hours: number): string {
  if (hours < 48) return `${Math.max(1, Math.round(hours))} h`;
  return `${Math.round(hours / 24)} días`;
}

/** 3.24 -> "×3,2" */
export function ratioLabel(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return `×${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1).replace(".", ",")}`;
}
