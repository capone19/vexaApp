// ============================================
// VEXA Content Studio - Registro de ideas de Shorts (anti-repetición)
// ============================================
// Cada Short que propone la IA queda en studio_short_ideas, ligado a su episodio (video origen) y a sus
// tramos exactos. Las filas las crea n8n (webhook vexa-studio/shorts); la app solo lee la vista
// studio_short_ideas_v y cambia el estado (usada / descartada), la huella del cuadro de apertura y el
// Short de YouTube vinculado. Se lee una vez al abrir y después de cada acción: nada de polling ni Realtime.
// La comparación con embeddings la hace n8n; aquí solo se repite la fórmula del cupo del episodio.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { postShorts, totalScore, type ShortPlan, type ShortSegment, type ShortsProject } from "./shorts";

// Las tablas del Studio aún no están en los tipos generados de Supabase
const db = supabase as unknown as SupabaseClient;

// ---------- Tipos ----------

export type IdeaStage = "propuesta" | "usada" | "programada" | "publicada" | "descartada";
export type IdeaLevel = "ok" | "cercana" | "repetida" | "sin_dato";
export type SourceLevel = "ok" | "casi" | "agotado";

export interface IdeaCheckItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface IdeaNeighbor {
  id: string;
  similarity: number;
}

/** Lo que devuelve n8n de cada Short (parecido y lista de control). Se guarda con el plan en IndexedDB */
export interface IdeaCheck {
  /** null solo si falló el guardado en el registro */
  id: string | null;
  planId: string | null;
  similarity: number | null;
  level: IdeaLevel;
  reason: string;
  similarTo: { id: string | null; title: string; sourceTitle: string; stage: string; sameSource: boolean } | null;
  neighbors: IdeaNeighbor[];
  checks: IdeaCheckItem[];
  passed: number;
  total: number;
}

/** Episodio (video origen) del proyecto */
export interface IdeaSource {
  key: string;
  title: string;
  videoId: string | null;
  duration: number;
}

export interface SourceStatus {
  /** Shorts usados, programados o publicados de este episodio */
  used: number;
  /** Propuestas sin usar */
  proposed: number;
  /** Cupo recomendado de Shorts para el episodio */
  budget: number;
  remaining: number;
  /** % del video ya usado por esos Shorts */
  coveragePct: number;
  /** Segundos libres en tramos de 25 s o más */
  freeSeconds: number;
  level: SourceLevel;
  message: string;
  usedRanges: ShortSegment[];
}

/** Fila de studio_short_ideas_v (sin embedding) */
export interface ShortIdea {
  id: string;
  accountId: string;
  sourceKey: string;
  sourceTitle: string;
  sourceVideoId: string | null;
  sourceDuration: number | null;
  projectId: string;
  planId: string;
  sourceRef: string;
  status: "propuesta" | "usada" | "descartada";
  stage: IdeaStage;
  segments: ShortSegment[];
  rangeStart: number | null;
  rangeEnd: number | null;
  topic: string;
  thesis: string;
  angle: string | null;
  format: string | null;
  hookLine: string;
  hookText: string;
  title: string;
  endLine: string;
  firstLine: string;
  duration: number | null;
  score: number | null;
  similarity: number | null;
  similarTo: string | null;
  similarityReason: string | null;
  neighbors: IdeaNeighbor[];
  checks: IdeaCheckItem[];
  openFrameHash: string | null;
  youtubeVideoId: string | null;
  youtubeAt: string | null;
  igPublicationId: string | null;
  igStatus: string | null;
  igAt: string | null;
  igPermalink: string | null;
  plannedAt: string | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const STAGE_LABELS: Record<IdeaStage, string> = {
  propuesta: "Propuesta",
  usada: "Usada",
  programada: "Programada",
  publicada: "Publicada",
  descartada: "Descartada",
};

export const FORMAT_LABELS: Record<string, string> = {
  pregunta_directa: "Pregunta directa",
  dato_contraste: "Dato que contrasta",
  imagina_que: "Imagina que…",
  mito_realidad: "Mito y realidad",
  numero_raro: "Número raro",
  caso_concreto: "Caso concreto",
};

/** Las que ya salieron (o van a salir): cuentan para el cupo y para no repetir */
const USED_STAGES: IdeaStage[] = ["usada", "programada", "publicada"];
export const isUsedStage = (stage: IdeaStage) => USED_STAGES.includes(stage);

// ---------- Mapeo (snake_case en la base y en n8n, camelCase en la app) ----------

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const str = (v: unknown) => (typeof v === "string" ? v : "");

function toSegments(raw: unknown): ShortSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({ start: Number((s as ShortSegment)?.start), end: Number((s as ShortSegment)?.end) }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);
}

function toNeighbors(raw: unknown): IdeaNeighbor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => ({ id: str((n as IdeaNeighbor)?.id), similarity: Number((n as IdeaNeighbor)?.similarity) }))
    .filter((n) => n.id && Number.isFinite(n.similarity));
}

function toChecks(raw: unknown): IdeaCheckItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      const item = c as Partial<IdeaCheckItem>;
      return { key: str(item?.key), label: str(item?.label) || str(item?.key), ok: item?.ok === true, detail: str(item?.detail) };
    })
    .filter((c) => c.key);
}

export function similarityLevel(similarity: number | null): IdeaLevel {
  if (similarity === null) return "sin_dato";
  if (similarity >= 75) return "repetida";
  if (similarity >= 50) return "cercana";
  return "ok";
}

interface RawIdeaCheck {
  id?: string | null;
  plan_id?: string | null;
  similarity?: number | null;
  level?: IdeaLevel;
  reason?: string;
  similar_to?: { id?: string | null; title?: string; source_title?: string; stage?: string; same_source?: boolean } | null;
  neighbors?: unknown;
  checks?: unknown;
  passed?: number;
  total?: number;
}

export function toIdeaCheck(raw: RawIdeaCheck | null | undefined): IdeaCheck | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const similarity = num(raw.similarity);
  const checks = toChecks(raw.checks);
  const level = raw.level && ["ok", "cercana", "repetida", "sin_dato"].includes(raw.level) ? raw.level : similarityLevel(similarity);
  return {
    id: raw.id || null,
    planId: raw.plan_id || null,
    similarity,
    level,
    reason: str(raw.reason),
    similarTo: raw.similar_to
      ? {
          id: raw.similar_to.id || null,
          title: str(raw.similar_to.title),
          sourceTitle: str(raw.similar_to.source_title),
          stage: str(raw.similar_to.stage),
          sameSource: raw.similar_to.same_source === true,
        }
      : null,
    neighbors: toNeighbors(raw.neighbors),
    checks,
    passed: num(raw.passed) ?? checks.filter((c) => c.ok).length,
    total: num(raw.total) ?? checks.length,
  };
}

interface RawSourceStatus {
  used?: number;
  proposed?: number;
  budget?: number;
  remaining?: number;
  coverage_pct?: number;
  free_seconds?: number;
  level?: SourceLevel;
  message?: string;
  used_ranges?: unknown;
}

export function toSourceStatus(raw: RawSourceStatus | null | undefined): SourceStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const level = raw.level === "agotado" || raw.level === "casi" ? raw.level : "ok";
  return {
    used: num(raw.used) ?? 0,
    proposed: num(raw.proposed) ?? 0,
    budget: num(raw.budget) ?? 0,
    remaining: num(raw.remaining) ?? 0,
    coveragePct: num(raw.coverage_pct) ?? 0,
    freeSeconds: num(raw.free_seconds) ?? 0,
    level,
    message: str(raw.message),
    usedRanges: toSegments(raw.used_ranges),
  };
}

export const sourceForAi = (s: IdeaSource) => ({ key: s.key, title: s.title, video_id: s.videoId, duration: s.duration });

// ---------- Clave del episodio ----------

/** 'yt:<id del video largo>' o 'file:<huella>' (duración y tamaño del archivo: no hace falta leerlo) */
export async function sourceKeyFor(project: Pick<ShortsProject, "relatedVideo" | "duration" | "width" | "height">): Promise<string> {
  if (project.relatedVideo?.id) return `yt:${project.relatedVideo.id}`;
  const text = `${Math.round(project.duration * 10)}|${project.width}x${project.height}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `file:${hex.slice(0, 16)}`;
}

export const sourceOf = (project: ShortsProject, key: string): IdeaSource => ({
  key,
  title: project.relatedVideo?.title ?? project.name,
  videoId: project.relatedVideo?.id ?? null,
  duration: project.duration,
});

// ---------- Lecturas y escrituras ----------

const COLUMNS =
  "id, account_id, source_key, source_title, source_video_id, source_duration, project_id, plan_id, source_ref, status, stage, segments, range_start, range_end, topic, thesis, angle, format, hook_line, hook_text, title, end_line, first_line, duration, score, similarity, similar_to, similarity_reason, neighbors, checks, open_frame_hash, youtube_video_id, youtube_at, ig_publication_id, ig_status, ig_at, ig_permalink, planned_at, used_at, created_at, updated_at";

type IdeaRow = Record<string, unknown>;

export const toIdea = (r: IdeaRow): ShortIdea => ({
  id: str(r.id),
  accountId: str(r.account_id),
  sourceKey: str(r.source_key),
  sourceTitle: str(r.source_title),
  sourceVideoId: (r.source_video_id as string) || null,
  sourceDuration: num(r.source_duration),
  projectId: str(r.project_id),
  planId: str(r.plan_id),
  sourceRef: str(r.source_ref),
  status: (r.status as ShortIdea["status"]) ?? "propuesta",
  stage: (r.stage as IdeaStage) ?? "propuesta",
  segments: toSegments(r.segments),
  rangeStart: num(r.range_start),
  rangeEnd: num(r.range_end),
  topic: str(r.topic),
  thesis: str(r.thesis),
  angle: (r.angle as string) || null,
  format: (r.format as string) || null,
  hookLine: str(r.hook_line),
  hookText: str(r.hook_text),
  title: str(r.title),
  endLine: str(r.end_line),
  firstLine: str(r.first_line),
  duration: num(r.duration),
  score: num(r.score),
  similarity: num(r.similarity),
  similarTo: (r.similar_to as string) || null,
  similarityReason: (r.similarity_reason as string) || null,
  neighbors: toNeighbors(r.neighbors),
  checks: toChecks(r.checks),
  openFrameHash: (r.open_frame_hash as string) || null,
  youtubeVideoId: (r.youtube_video_id as string) || null,
  youtubeAt: (r.youtube_at as string) || null,
  igPublicationId: (r.ig_publication_id as string) || null,
  igStatus: (r.ig_status as string) || null,
  igAt: (r.ig_at as string) || null,
  igPermalink: (r.ig_permalink as string) || null,
  plannedAt: (r.planned_at as string) || null,
  usedAt: (r.used_at as string) || null,
  createdAt: str(r.created_at),
  updatedAt: str(r.updated_at),
});

/** Todo el registro del canal (las 500 más recientes): una sola consulta */
export async function listIdeas(accountId: string): Promise<ShortIdea[]> {
  const { data, error } = await db
    .from("studio_short_ideas_v")
    .select(COLUMNS)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as IdeaRow[]).map(toIdea);
}

/** La app solo puede marcar 'usada' o 'descartada' (la tabla rechaza el resto) */
export async function setIdeaStatus(ids: string[], status: "usada" | "descartada"): Promise<void> {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return;
  const { error } = await db
    .from("studio_short_ideas")
    .update(status === "usada" ? { status, used_at: new Date().toISOString() } : { status })
    .in("id", list);
  if (error) throw error;
}

export async function setOpenFrameHash(id: string, hash: string): Promise<void> {
  const { error } = await db.from("studio_short_ideas").update({ open_frame_hash: hash }).eq("id", id);
  if (error) throw error;
}

/** Vincula a mano un Short de YouTube subido antes de que existiera source_ref */
export async function linkYoutubeVideo(id: string, videoId: string): Promise<void> {
  const { error } = await db.from("studio_short_ideas").update({ youtube_video_id: videoId }).eq("id", id);
  if (error) throw error;
}

export interface RegisterItem {
  plan: ShortPlan;
  /** Ya se mandó a Programación o tiene Reel en Instagram */
  used: boolean;
  youtubeVideoId?: string | null;
}

const REGISTER_BATCH = 40;

/**
 * Registra los Shorts de un proyecto anterior a este cambio (sin IA de texto, solo embeddings).
 * Idempotente: n8n actualiza la fila si el plan ya estaba. Aquí el plan.id no cambia.
 */
export async function registerPlans(
  project: ShortsProject,
  items: RegisterItem[],
  source: IdeaSource
): Promise<{ ideas: Map<string, IdeaCheck>; registryError: string }> {
  const ideas = new Map<string, IdeaCheck>();
  let registryError = "";
  for (let i = 0; i < items.length; i += REGISTER_BATCH) {
    const body = await postShorts<{ ideas?: (RawIdeaCheck & { plan_id: string })[]; registry_error?: string }>({
      stage: "register",
      language: project.language,
      account_id: project.accountId,
      project_id: project.id,
      source: sourceForAi(source),
      plans: items.slice(i, i + REGISTER_BATCH).map(({ plan, used, youtubeVideoId }) => ({
        plan_id: plan.id,
        title: plan.title,
        hook_line: plan.hookLine,
        hook_text: plan.hookText,
        end_text: plan.endText,
        segments: plan.segments,
        description: plan.description,
        score: totalScore(plan.score),
        used,
        ...(youtubeVideoId ? { youtube_video_id: youtubeVideoId } : {}),
      })),
    });
    for (const raw of body.ideas ?? []) {
      const idea = toIdeaCheck(raw);
      if (idea && raw.plan_id) ideas.set(raw.plan_id, idea);
    }
    if (body.registry_error) registryError = body.registry_error;
  }
  return { ideas, registryError };
}

// ---------- Estado del episodio (misma fórmula que n8n, para mostrarlo sin llamar a la IA) ----------

const MIN_FREE_GAP = 25;

/** Une los tramos que se tocan o se pisan */
export function mergeRanges(ranges: ShortSegment[]): ShortSegment[] {
  const sorted = ranges.filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const out: ShortSegment[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ start: r.start, end: r.end });
  }
  return out;
}

/** Tramos del episodio ya usados por Shorts que salieron o van a salir */
export function usedRangesOf(ideas: ShortIdea[], sourceKey: string): ShortSegment[] {
  return mergeRanges(ideas.filter((i) => i.sourceKey === sourceKey && isUsedStage(i.stage)).flatMap((i) => i.segments));
}

const clampNum = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function sourceSummary(ideas: ShortIdea[], sourceKey: string, duration: number): SourceStatus {
  const own = ideas.filter((i) => i.sourceKey === sourceKey);
  const length = duration > 0 ? duration : (own.find((i) => i.sourceDuration)?.sourceDuration ?? 0);
  const used = own.filter((i) => isUsedStage(i.stage)).length;
  const proposed = own.filter((i) => i.stage === "propuesta").length;
  const budget = clampNum(Math.round((length / 60) * 1.1), 2, 10);
  const remaining = Math.max(0, budget - used);
  const usedRanges = usedRangesOf(ideas, sourceKey).map((r) => ({ start: Math.max(0, r.start), end: Math.min(length || r.end, r.end) }));
  const usedSeconds = usedRanges.reduce((s, r) => s + Math.max(0, r.end - r.start), 0);
  const coveragePct = length > 0 ? Math.round((usedSeconds / length) * 100) : 0;

  let freeSeconds = 0;
  let cursor = 0;
  for (const r of [...usedRanges, { start: length, end: length }]) {
    const gap = r.start - cursor;
    if (gap >= MIN_FREE_GAP) freeSeconds += gap;
    cursor = Math.max(cursor, r.end);
  }
  freeSeconds = Math.round(freeSeconds);

  // Sin duración conocida solo cuenta el cupo
  const known = length > 0;
  const level: SourceLevel =
    remaining === 0 || (known && (coveragePct >= 70 || freeSeconds < MIN_FREE_GAP))
      ? "agotado"
      : remaining <= 1 || coveragePct >= 50
        ? "casi"
        : "ok";
  const tally = `${used} de ${budget} Shorts · ${coveragePct} % del video usado`;
  const message =
    level === "agotado"
      ? `Este episodio ya dio lo que tenía (${tally}). Mejor saca el próximo Short de otro episodio.`
      : level === "casi"
        ? `A este episodio le ${remaining === 1 ? "queda 1 Short" : `quedan ${remaining} Shorts`} recomendados (${tally}). Después conviene pasar al siguiente.`
        : `Este episodio ya tiene ${tally}.`;
  return { used, proposed, budget, remaining, coveragePct, freeSeconds, level, message, usedRanges };
}

// ---------- Regla de los 3 días ----------

const SPACING_MS = 72 * 3_600_000;
const SAME_TOPIC_MIN = 55;
const SAME_CHAPTER_GAP = 60;

export interface SpacingConflict {
  other: ShortIdea;
  at: Date;
  /** tema: parecido por embeddings · capitulo: mismo episodio y tramos cercanos */
  reason: "tema" | "capitulo";
}

const isNeighbor = (a: ShortIdea, b: ShortIdea) =>
  a.neighbors.some((n) => n.id === b.id && n.similarity >= SAME_TOPIC_MIN) || b.neighbors.some((n) => n.id === a.id && n.similarity >= SAME_TOPIC_MIN);

/** Distancia en segundos entre los tramos de dos ideas (0 si se pisan) */
function segmentGap(a: ShortSegment[], b: ShortSegment[]): number {
  let best = Infinity;
  for (const x of a) for (const y of b) best = Math.min(best, Math.max(0, Math.max(x.start, y.start) - Math.min(x.end, y.end)));
  return best;
}

/**
 * Ideas del mismo tema (vecinas ≥ 55 % o mismo capítulo del episodio) que salen a menos de 72 h de `at`.
 * `dates`: la fecha de cada idea en Programación (por id de idea); si no está, se usa planned_at.
 */
export function spacingConflicts(idea: ShortIdea, at: Date, ideas: ShortIdea[], dates: Map<string, Date> = new Map()): SpacingConflict[] {
  const out: SpacingConflict[] = [];
  for (const other of ideas) {
    if (other.id === idea.id || other.stage === "descartada") continue;
    const when = dates.get(other.id) ?? (other.plannedAt ? new Date(other.plannedAt) : null);
    if (!when || Math.abs(when.getTime() - at.getTime()) >= SPACING_MS) continue;
    const reason = isNeighbor(idea, other)
      ? "tema"
      : other.sourceKey === idea.sourceKey && segmentGap(idea.segments, other.segments) < SAME_CHAPTER_GAP
        ? "capitulo"
        : null;
    if (reason) out.push({ other, at: when, reason });
  }
  return out.sort((a, b) => Math.abs(a.at.getTime() - at.getTime()) - Math.abs(b.at.getTime() - at.getTime()));
}

export interface ScheduledItem {
  /** id del borrador o publicación en la vista */
  key: string;
  sourceRef: string | null | undefined;
  at: Date | null;
}

const DAY_FORMAT = new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "numeric" });

/** Aviso de la regla de 3 días por cada item de Programación que choca con otro Short del mismo tema */
export function spacingWarnings(items: ScheduledItem[], ideas: ShortIdea[]): Map<string, string> {
  const out = new Map<string, string>();
  if (!ideas.length) return out;
  const byRef = new Map(ideas.map((i) => [i.sourceRef, i]));
  const dates = new Map<string, Date>();
  for (const item of items) {
    const idea = item.sourceRef ? byRef.get(item.sourceRef) : undefined;
    if (idea && item.at) dates.set(idea.id, item.at);
  }
  for (const item of items) {
    const idea = item.sourceRef ? byRef.get(item.sourceRef) : undefined;
    if (!idea || !item.at) continue;
    const [first] = spacingConflicts(idea, item.at, ideas, dates);
    if (first) {
      const day = DAY_FORMAT.format(first.at).replace(".", "");
      out.set(item.key, `Mismo tema que «${first.other.title}» (${day}). Sepáralos al menos 3 días.`);
    }
  }
  return out;
}

// ---------- Huella del cuadro de apertura (dHash) ----------

interface PixelData {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

/** dHash de 64 bits (16 hex) sobre una imagen de 9×8: cada bit dice si un píxel es más claro que el de su derecha */
export function dHash(image: PixelData): string {
  if (image.width < 9 || image.height < 8) throw new Error("dHash necesita una imagen de 9×8.");
  const gray = (x: number, y: number) => {
    const i = (y * image.width + x) * 4;
    return image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114;
  };
  let hex = "";
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      nibble = (nibble << 1) | (gray(x, y) > gray(x + 1, y) ? 1 : 0);
      if (++bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

/** Bits distintos entre dos huellas (64 si no se pueden comparar) */
export function hamming(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/i.test(a) || !/^[0-9a-f]{16}$/i.test(b)) return 64;
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      diff += x & 1;
      x >>= 1;
    }
  }
  return diff;
}

/** Toma el cuadro en t = 0,3 s del Short renderizado y calcula su huella */
export async function openFrameHash(file: Blob, at = 0.3): Promise<string> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("No se pudo leer el Short renderizado."));
    });
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("No se pudo leer el Short renderizado."));
      video.currentTime = Math.min(at, Math.max(0, (video.duration || at) - 0.05));
    });
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador no permite leer el cuadro.");
    ctx.drawImage(video, 0, 0, 9, 8);
    return dHash(ctx.getImageData(0, 0, 9, 8));
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
  }
}

const OPEN_FRAME_WINDOW_MS = 7 * 24 * 3_600_000;
const OPEN_FRAME_MAX_DIFF = 10;

/** Otro Short usado en los últimos 7 días que abre con una imagen casi igual (null si no hay) */
export function similarOpenFrame(hash: string, ideaId: string | null, ideas: ShortIdea[], now = Date.now()): ShortIdea | null {
  return (
    ideas.find((i) => {
      if (i.id === ideaId || !i.openFrameHash || !isUsedStage(i.stage)) return false;
      const when = i.plannedAt ?? i.usedAt;
      if (!when || Math.abs(now - new Date(when).getTime()) > OPEN_FRAME_WINDOW_MS) return false;
      return hamming(hash, i.openFrameHash) <= OPEN_FRAME_MAX_DIFF;
    }) ?? null
  );
}
