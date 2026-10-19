// ============================================
// VEXA Content Studio - Reels de Instagram (tabla studio_publications + flujos de n8n)
// ============================================
// La app crea la fila (borrador o programada) y manda el MP4 a n8n, que lo deja en R2 (transitorio).
// n8n arma una alarma por Reel que despierta a la hora exacta y lo publica, aunque la app esté cerrada.
// Cada cambio de hora sin video nuevo se avisa a n8n ("Instagram: programar"). Si el aviso falla,
// el repaso de cada hora de n8n lo publica igual, con hasta 1 hora de atraso.
// Supabase solo guarda la fila (nada de Storage ni Realtime): el estado se lee con polling liviano.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { accessToken, normalizeProfile, readResponse, type ChannelProfile } from "./ai";
import { addDays, freeSlots, slotsBetween, startOfWeek, type Occupant, type PublishPlan } from "./publish-plan";
import {
  buildTimeline,
  getShortsFolder,
  hasAccess,
  listProjects,
  loadRenders,
  parseShortsSourceRef,
  shortsSourceRef,
  timelineToSrt,
  type ShortPlan,
  type ShortsProject,
  type StoredRender,
} from "./shorts";

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const UPLOAD_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_UPLOAD || "/webhook/vexa-studio/instagram/upload";
const CAPTIONS_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_CAPTIONS || "/webhook/vexa-studio/instagram/captions";
const SCHEDULE_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_SCHEDULE || "/webhook/vexa-studio/instagram/programar";

// Las tablas del Studio aún no están en los tipos generados de Supabase
const db = supabase as unknown as SupabaseClient;

// ---------- Mensajes ----------

export const WEBM_MESSAGE =
  "Instagram solo acepta MP4. Este Short se grabó en WebM: vuelve a exportarlo desde la Fábrica en Chrome o Edge actualizado (graban MP4) o conviértelo a MP4 antes de subirlo.";
export const MISSING_VIDEO_MESSAGE = "Falta subir el video. Si llega la hora sin video, este Reel no saldrá.";
export const PUBLISHING_MESSAGE = "Instagram está procesando el video. Suele tardar 1 a 3 minutos.";
export const RETRY_HELP =
  "Puedes reintentarlo: se vuelve a programar con el mismo video si todavía está guardado, o te pediremos subirlo de nuevo.";
export const NOTIFY_FAILED_MESSAGE = "No pudimos avisar la hora exacta a Instagram; saldrá igual, con hasta 1 hora de atraso.";

// ---------- Límites de Instagram ----------

export const MAX_CAPTION = 2200;
export const MAX_HASHTAGS = 5;
export const MAX_COLLABORATORS = 3;
export const MAX_REEL_BYTES = 300 * 1024 * 1024;
/** Margen para alcanzar a subir el video antes de la hora programada */
export const REEL_MIN_LEAD_MS = 10 * 60_000;

// ---------- Tipos y mapeo (camelCase en la app, snake_case en la base) ----------

export type PublicationStatus = "borrador" | "programado" | "publicando" | "publicado" | "error";

export interface PublicationSettings {
  /** Mostrar también en el feed (Instagram lo deja en true por defecto) */
  shareToFeed: boolean;
  /** Segundo del video que se usa de portada, en milisegundos */
  thumbOffsetMs?: number;
  /** Hasta 3 usuarios, sin @ */
  collaborators: string[];
  locationId?: string;
  firstComment?: string;
  audioName?: string;
}

export interface InstagramPublication {
  id: string;
  tenantId: string;
  accountId: string;
  /** Nombre interno para el calendario (no se publica) */
  title: string;
  /** Texto final tal cual sale en Instagram, hashtags incluidos */
  caption: string;
  settings: PublicationSettings;
  /** 'shorts:<projectId>:<planId>' · 'youtube:<videoId>' · 'upload' */
  sourceRef: string | null;
  youtubeVideoId: string | null;
  status: PublicationStatus;
  scheduledAt: string | null;
  /** Lo llena n8n: no nulo = video listo */
  mediaUrl: string | null;
  mediaSize: number | null;
  permalink: string | null;
  publishedAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsRow {
  share_to_feed?: boolean;
  thumb_offset_ms?: number;
  collaborators?: string[];
  location_id?: string;
  first_comment?: string;
  audio_name?: string;
}

interface PublicationRow {
  id: string;
  tenant_id: string;
  account_id: string;
  title: string;
  caption: string;
  settings: SettingsRow | null;
  source_ref: string | null;
  youtube_video_id: string | null;
  status: PublicationStatus;
  scheduled_at: string | null;
  media_url: string | null;
  media_size: number | null;
  permalink: string | null;
  published_at: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, tenant_id, account_id, title, caption, settings, source_ref, youtube_video_id, status, scheduled_at, media_url, media_size, permalink, published_at, attempts, last_error, created_at, updated_at";

export const DEFAULT_SETTINGS: PublicationSettings = { shareToFeed: true, collaborators: [] };

export const normalizeCollaborators = (list: string[]) =>
  [...new Set(list.map((c) => c.trim().replace(/^@+/, "")).filter(Boolean))].slice(0, MAX_COLLABORATORS);

export function settingsFromRow(raw: unknown): PublicationSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as SettingsRow;
  return {
    shareToFeed: s.share_to_feed !== false,
    thumbOffsetMs: typeof s.thumb_offset_ms === "number" ? s.thumb_offset_ms : undefined,
    collaborators: Array.isArray(s.collaborators) ? normalizeCollaborators(s.collaborators.filter((c) => typeof c === "string")) : [],
    locationId: s.location_id || undefined,
    firstComment: s.first_comment || undefined,
    audioName: s.audio_name || undefined,
  };
}

export function settingsToRow(s: PublicationSettings): SettingsRow {
  const row: SettingsRow = { share_to_feed: s.shareToFeed };
  if (s.thumbOffsetMs !== undefined) row.thumb_offset_ms = Math.max(0, Math.round(s.thumbOffsetMs));
  const collaborators = normalizeCollaborators(s.collaborators);
  if (collaborators.length) row.collaborators = collaborators;
  if (s.locationId?.trim()) row.location_id = s.locationId.trim();
  if (s.firstComment?.trim()) row.first_comment = s.firstComment.trim();
  if (s.audioName?.trim()) row.audio_name = s.audioName.trim();
  return row;
}

export const toPublication = (r: PublicationRow): InstagramPublication => ({
  id: r.id,
  tenantId: r.tenant_id,
  accountId: r.account_id,
  title: r.title ?? "",
  caption: r.caption ?? "",
  settings: settingsFromRow(r.settings),
  sourceRef: r.source_ref,
  youtubeVideoId: r.youtube_video_id,
  status: r.status,
  scheduledAt: r.scheduled_at,
  mediaUrl: r.media_url,
  mediaSize: r.media_size === null ? null : Number(r.media_size),
  permalink: r.permalink,
  publishedAt: r.published_at,
  attempts: Number(r.attempts ?? 0),
  lastError: r.last_error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Lo único que la app puede escribir: la base ignora los campos de n8n igual */
export interface PublicationPatch {
  title?: string;
  caption?: string;
  settings?: PublicationSettings;
  sourceRef?: string | null;
  youtubeVideoId?: string | null;
  status?: "borrador" | "programado";
  scheduledAt?: string | null;
}

export function patchToRow(patch: PublicationPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title.trim().slice(0, 200);
  if (patch.caption !== undefined) row.caption = patch.caption.slice(0, MAX_CAPTION);
  if (patch.settings !== undefined) row.settings = settingsToRow(patch.settings);
  if (patch.sourceRef !== undefined) row.source_ref = patch.sourceRef;
  if (patch.youtubeVideoId !== undefined) row.youtube_video_id = patch.youtubeVideoId;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
  return row;
}

export const hasVideo = (p: Pick<InstagramPublication, "mediaUrl">) => Boolean(p.mediaUrl);
export const isEditable = (p: Pick<InstagramPublication, "status">) => p.status !== "publicando" && p.status !== "publicado";

// ---------- Lecturas ----------

/**
 * Publicaciones de la cuenta en el rango, más las que siempre importan: borradores sin fecha,
 * las que se están publicando, las que quedaron en error y las gemelas de los Shorts indicados.
 */
export async function listPublications(accountId: string, from: Date, to: Date, youtubeIds: string[] = []): Promise<InstagramPublication[]> {
  const filters = [
    "scheduled_at.is.null",
    "status.in.(publicando,error)",
    `and(scheduled_at.gte."${from.toISOString()}",scheduled_at.lt."${to.toISOString()}")`,
  ];
  const ids = youtubeIds.filter((id) => /^[\w-]+$/.test(id));
  if (ids.length) filters.push(`youtube_video_id.in.(${ids.join(",")})`);
  const { data, error } = await db
    .from("studio_publications")
    .select(COLUMNS)
    .eq("account_id", accountId)
    .or(filters.join(","))
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) throw error;
  return (data as PublicationRow[]).map(toPublication);
}

/** Las últimas publicaciones de la cuenta (Inicio de Instagram) */
export async function listAccountPublications(accountId: string, limit = 200): Promise<InstagramPublication[]> {
  const { data, error } = await db
    .from("studio_publications")
    .select(COLUMNS)
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as PublicationRow[]).map(toPublication);
}

export async function getPublication(id: string): Promise<InstagramPublication> {
  const { data, error } = await db.from("studio_publications").select(COLUMNS).eq("id", id).single();
  if (error) throw error;
  return toPublication(data as PublicationRow);
}

// ---------- Escrituras ----------

export interface NewPublication extends PublicationPatch {
  tenantId: string;
  accountId: string;
  status: "borrador" | "programado";
}

/** Crea la fila. Recién creada no tiene video, así que no hace falta avisar la hora: la subida arma la alarma */
export async function createPublication(input: NewPublication): Promise<InstagramPublication> {
  const { tenantId, accountId, ...patch } = input;
  const { data, error } = await db
    .from("studio_publications")
    .insert({ tenant_id: tenantId, account_id: accountId, platform: "instagram", format: "reel", ...patchToRow({ settings: DEFAULT_SETTINGS, ...patch }) })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toPublication(data as PublicationRow);
}

export type ScheduleNotice =
  | { armed: true; scheduledAt: string }
  | { armed: false; reason: "no_programada" | "sin_video" | "aviso_fallido" };

/** n8n no recibió el aviso: el Reel sale igual con el repaso de cada hora (hasta 1 hora de atraso) */
export const noticeFailed = (notice: ScheduleNotice | null) => Boolean(notice && "reason" in notice && notice.reason === "aviso_fallido");

export interface SaveResult {
  publication: InstagramPublication;
  /** null si el cambio no tocaba la hora (no se avisó a n8n) */
  notice: ScheduleNotice | null;
}

/**
 * Único camino para editar una fila. Si el cambio la deja programada (nueva hora o pasa a programado),
 * avisa a n8n después de guardar. Así ningún botón se olvida del aviso.
 */
export async function updatePublication(id: string, patch: PublicationPatch): Promise<SaveResult> {
  const { data, error } = await db.from("studio_publications").update(patchToRow(patch)).eq("id", id).select(COLUMNS).single();
  if (error) throw error;
  const publication = toPublication(data as PublicationRow);
  const touchesSchedule = patch.status === "programado" || patch.scheduledAt !== undefined;
  const notice = touchesSchedule && publication.status === "programado" ? await notifySchedule(id) : null;
  return { publication, notice };
}

export const schedulePublication = (id: string, date: Date, patch: PublicationPatch = {}) =>
  updatePublication(id, { ...patch, status: "programado", scheduledAt: date.toISOString() });

/** Publicar ahora = programada para este instante; n8n la toma en 1 a 3 minutos */
export const publishNow = (id: string, patch: PublicationPatch = {}) =>
  updatePublication(id, { ...patch, status: "programado", scheduledAt: new Date().toISOString() });

/** Vuelve a programar un Reel en error (la base reinicia los intentos y limpia el error) */
export const retryPublication = (id: string, date?: Date) =>
  updatePublication(id, { status: "programado", ...(date ? { scheduledAt: date.toISOString() } : {}) });

/** Vuelve a borrador. La alarma vieja se apaga sola: no hace falta avisar */
export const unschedule = (id: string) => updatePublication(id, { status: "borrador", scheduledAt: null });

export async function deletePublication(id: string): Promise<void> {
  const { error } = await db.from("studio_publications").delete().eq("id", id);
  if (error) throw error;
}

/** Avisa la hora a n8n para que arme la alarma del Reel. Nunca lanza: si falla, la UI muestra el aviso suave */
export async function notifySchedule(id: string): Promise<ScheduleNotice> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${N8N_BASE_URL}${SCHEDULE_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: await accessToken(), publication_id: id }),
      });
      const body = await readResponse<{ armed: boolean; scheduled_at?: string; reason?: string }>(res);
      if (body.armed) return { armed: true, scheduledAt: body.scheduled_at ?? "" };
      return { armed: false, reason: body.reason === "sin_video" ? "sin_video" : "no_programada" };
    } catch {
      // Se reintenta una vez; si vuelve a fallar, el repaso de cada hora la publica igual
    }
  }
  return { armed: false, reason: "aviso_fallido" };
}

// ---------- Subir el video ----------

export const isWebm = (file: Pick<File, "name" | "type">) => file.type === "video/webm" || /\.webm$/i.test(file.name);

/** null si sirve; si no, el mensaje para mostrar */
export function validateReelFile(file: Pick<File, "name" | "type" | "size">): string | null {
  if (isWebm(file)) return WEBM_MESSAGE;
  const accepted = file.type === "video/mp4" || file.type === "video/quicktime" || /\.(mp4|mov)$/i.test(file.name);
  if (!accepted) return "Instagram solo acepta videos MP4 o MOV.";
  if (file.size >= MAX_REEL_BYTES) return "El video pesa 300 MB o más, el máximo permitido. Expórtalo más liviano o más corto.";
  return null;
}

/**
 * Sube el MP4 a n8n (multipart sin headers propios: así no hay preflight de CORS).
 * La fila ya debe existir. Si está programada, la subida arma la alarma sola.
 */
export async function uploadReelVideo(
  publicationId: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<{ mediaUrl: string; mediaSize: number }> {
  const problem = validateReelFile(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  form.append("publication_id", publicationId);
  form.append("access_token", await accessToken());
  form.append("size", String(file.size));
  form.append("video", file, file.name);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${N8N_BASE_URL}${UPLOAD_PATH}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { ok?: boolean; error?: string; media_url?: string; media_size?: number } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status === 401) return reject(new Error("Tu sesión expiró. Vuelve a iniciar sesión."));
      if (xhr.status < 200 || xhr.status >= 300 || !body?.ok || !body.media_url) {
        return reject(new Error(body?.error ?? `La subida falló (n8n respondió ${xhr.status}).`));
      }
      onProgress?.(1);
      resolve({ mediaUrl: body.media_url, mediaSize: Number(body.media_size ?? file.size) });
    };
    xhr.onerror = () => reject(new Error("No se pudo subir el video. Revisa tu conexión y vuelve a intentarlo."));
    xhr.send(form);
  });
}

// ---------- Textos con IA ----------

export interface CaptionItem {
  /** Id propio para cruzar la respuesta */
  ref: string;
  title: string;
  description: string;
  /** Texto o SRT con tiempos */
  transcript: string;
  durationSeconds?: number;
  notes?: string;
}

export interface CaptionProfile {
  description: string;
  audience: string;
  tone: string;
  cta: string;
}

export interface GeneratedCaption {
  ref: string;
  ok: boolean;
  error?: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  /** Gancho + cuerpo + CTA + hashtags, listo para publicar */
  caption: string;
  firstComment: string;
  thumbOffsetMs?: number;
  /** Por qué este ángulo (ayuda para la usuaria) */
  notesEs: string;
}

interface CaptionRow {
  ref: string;
  ok: boolean;
  error?: string;
  hook?: string;
  body?: string;
  cta?: string;
  hashtags?: string[];
  caption?: string;
  first_comment?: string;
  thumb_offset_ms?: number;
  notes_es?: string;
}

const CAPTIONS_BATCH = 10;

export const toCaptionProfile = (p: ChannelProfile): CaptionProfile => ({ description: p.niche, audience: p.audience, tone: p.tone, cta: p.cta });

const isEmptyProfile = (p: ChannelProfile) => ![p.niche, p.tone, p.audience, p.cta].some((v) => v.trim());

/** Perfil de la cuenta de Instagram o, si está vacío, el del canal de YouTube */
export function pickCaptionProfile(instagramRaw: unknown, youtubeRaw: unknown): { profile: CaptionProfile; language: string; fromYouTube: boolean } {
  const ig = normalizeProfile(instagramRaw);
  if (!isEmptyProfile(ig) || !youtubeRaw) return { profile: toCaptionProfile(ig), language: ig.language, fromYouTube: false };
  const yt = normalizeProfile(youtubeRaw);
  return { profile: toCaptionProfile(yt), language: yt.language, fromYouTube: !isEmptyProfile(yt) };
}

/** Pide los textos a n8n de a 10 Reels por llamada (cada lote tarda 10 a 40 s) */
export async function generateCaptions(
  items: CaptionItem[],
  profile: CaptionProfile,
  language: string,
  onProgress?: (done: number, total: number) => void
): Promise<GeneratedCaption[]> {
  const token = await accessToken();
  const out: GeneratedCaption[] = [];
  for (let i = 0; i < items.length; i += CAPTIONS_BATCH) {
    onProgress?.(i, items.length);
    const batch = items.slice(i, i + CAPTIONS_BATCH);
    const res = await fetch(`${N8N_BASE_URL}${CAPTIONS_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        language,
        profile,
        items: batch.map((it) => ({
          ref: it.ref,
          title: it.title,
          description: it.description,
          transcript: it.transcript,
          duration_seconds: it.durationSeconds ?? null,
          notes: it.notes ?? "",
        })),
      }),
    });
    const body = await readResponse<{ items: CaptionRow[] }>(res);
    out.push(
      ...body.items.map((r) => ({
        ref: r.ref,
        ok: r.ok !== false,
        error: r.error,
        hook: r.hook ?? "",
        body: r.body ?? "",
        cta: r.cta ?? "",
        hashtags: normalizeHashtags(r.hashtags ?? []),
        caption: r.caption ?? "",
        firstComment: r.first_comment ?? "",
        thumbOffsetMs: typeof r.thumb_offset_ms === "number" ? r.thumb_offset_ms : undefined,
        notesEs: r.notes_es ?? "",
      }))
    );
  }
  onProgress?.(items.length, items.length);
  return out;
}

// ---------- Caption y hashtags ----------

export function normalizeHashtag(tag: string): string {
  const clean = tag.trim().replace(/^#+/, "").replace(/\s+/g, "");
  return clean ? `#${clean}` : "";
}

/** Sin repetidos y máximo 5 (lo que recomienda Instagram) */
export function normalizeHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags.map(normalizeHashtag)) {
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out.slice(0, MAX_HASHTAGS);
}

const isHashtagLine = (line: string) => /^(#\S+\s*)+$/.test(line.trim());

/** Separa la última línea de hashtags del texto (para editarlos como chips) */
export function splitCaption(caption: string): { text: string; hashtags: string[] } {
  const lines = caption.replace(/\s+$/, "").split("\n");
  const last = lines[lines.length - 1] ?? "";
  if (lines.length && isHashtagLine(last)) {
    return { text: lines.slice(0, -1).join("\n").trim(), hashtags: normalizeHashtags(last.trim().split(/\s+/)) };
  }
  return { text: caption.trim(), hashtags: [] };
}

/** Texto final para Instagram: el caption y, al final, la línea de hashtags */
export function composeCaption(text: string, hashtags: string[]): string {
  return [text.trim(), normalizeHashtags(hashtags).join(" ")].filter(Boolean).join("\n\n");
}

// ---------- Horarios ----------

const WEEKS_AHEAD = 12;

export type ReplicaMode = "same" | "offset" | "plan";

/** Primer espacio libre de Reel del plan desde `from`, mirando hasta 12 semanas */
export function nextFreeReelSlot(plan: PublishPlan | null, occupants: Occupant[], from: Date): Date | null {
  if (!plan) return null;
  const to = addDays(startOfWeek(from), 7 * WEEKS_AHEAD);
  const slots = slotsBetween(plan, from, to).filter((s) => s.format === "reel");
  return freeSlots(slots, occupants.filter((o) => o.at >= from))[0]?.at ?? null;
}

const roundUpToFive = (d: Date) => {
  const step = 5 * 60_000;
  return new Date(Math.ceil(d.getTime() / step) * step);
};

/** Sin plan: la primera media hora desde `from` que no choque con otro Reel */
function firstClearTime(from: Date, occupants: Occupant[]): Date {
  let at = roundUpToFive(from);
  while (occupants.some((o) => Math.abs(o.at.getTime() - at.getTime()) < 15 * 60_000)) at = new Date(at.getTime() + 30 * 60_000);
  return at;
}

/**
 * Hora del Reel gemelo de un Short de YouTube. Nunca en el pasado: si la hora calculada ya pasó,
 * toma el próximo hueco del plan (o en unos minutos) y lo marca como `moved` para avisarlo.
 */
export function replicaTime(opts: {
  youtubeAt: Date;
  mode: ReplicaMode;
  offsetHours: number;
  plan: PublishPlan | null;
  occupants: Occupant[];
  now?: Date;
}): { at: Date; moved: boolean } {
  const now = opts.now ?? new Date();
  const min = new Date(now.getTime() + REEL_MIN_LEAD_MS);
  if (opts.mode === "plan") {
    const from = opts.youtubeAt > min ? opts.youtubeAt : min;
    const slot = nextFreeReelSlot(opts.plan, opts.occupants, from);
    return slot ? { at: slot, moved: opts.youtubeAt < min } : { at: firstClearTime(from, opts.occupants), moved: true };
  }
  const wanted = new Date(opts.youtubeAt.getTime() + (opts.mode === "offset" ? opts.offsetHours * 3_600_000 : 0));
  if (wanted >= min) return { at: wanted, moved: false };
  return { at: nextFreeReelSlot(opts.plan, opts.occupants, min) ?? firstClearTime(min, opts.occupants), moved: true };
}

/** Lo que ocupa el calendario de Instagram (para buscar huecos libres) */
export const reelOccupants = (list: InstagramPublication[], exclude?: string): Occupant[] =>
  list
    .filter((p) => p.scheduledAt && p.id !== exclude && p.status !== "borrador")
    .map((p) => ({ format: "reel" as const, at: new Date(p.scheduledAt as string) }));

// ---------- Estado en vivo (polling, sin Realtime) ----------

const POLL_MS = 20_000;
const WATCH_WINDOW_MS = 15 * 60_000;

/** Hay algo por salir pronto: vale la pena seguir mirando aunque la pestaña esté oculta */
export function needsWatch(list: InstagramPublication[], now = Date.now()): boolean {
  return list.some(
    (p) => p.status === "publicando" || (p.status === "programado" && p.scheduledAt !== null && new Date(p.scheduledAt).getTime() - now < WATCH_WINDOW_MS)
  );
}

export interface PublicationSubscription {
  /** Vuelve a leer ya (después de guardar algo) */
  refresh: () => Promise<void>;
  stop: () => void;
}

/**
 * Lee las publicaciones cada 20 s mientras la pestaña está visible, o con la pestaña oculta
 * solo si hay Reels publicándose o por salir en menos de 15 min. Lee una vez al empezar.
 */
export function subscribePublications(
  accountId: string,
  cb: (list: InstagramPublication[]) => void,
  query?: { from: Date; to: Date; youtubeIds?: string[] },
  onError?: (error: unknown) => void
): PublicationSubscription {
  let stopped = false;
  let running: Promise<void> | null = null;
  let again = false;
  let last: InstagramPublication[] = [];

  const load = async (): Promise<void> => {
    if (stopped) return;
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        try {
          last = query ? await listPublications(accountId, query.from, query.to, query.youtubeIds) : await listAccountPublications(accountId);
          if (!stopped) cb(last);
        } catch (err) {
          // Sin conexión: se vuelve a intentar en la próxima vuelta
          if (!stopped) onError?.(err);
        }
      } while (again && !stopped);
    })();
    try {
      await running;
    } finally {
      running = null;
    }
  };

  const tick = () => {
    if (document.visibilityState === "visible" || needsWatch(last)) void load();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") void load();
  };
  const timer = setInterval(tick, POLL_MS);
  document.addEventListener("visibilitychange", onVisibility);
  void load();

  return {
    refresh: load,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

// ---------- Shorts de la Fábrica (archivos en este PC) ----------

export interface FactoryShort {
  sourceRef: string;
  projectId: string;
  planId: string;
  projectName: string;
  language: string;
  title: string;
  description: string;
  hashtags: string[];
  file: File;
  srt: string;
  durationSeconds: number;
  /** Ya se envió a Programación de YouTube */
  sentToSchedule: boolean;
}

export function factoryShortFrom(project: ShortsProject, plan: ShortPlan, render: StoredRender): FactoryShort {
  const timeline = buildTimeline(plan, project.cues);
  return {
    sourceRef: shortsSourceRef(project.id, plan.id),
    projectId: project.id,
    planId: plan.id,
    projectName: project.name,
    language: project.language,
    title: plan.title.trim(),
    description: plan.description.trim(),
    hashtags: plan.hashtags,
    file: render.file,
    srt: render.srt || timelineToSrt(timeline),
    durationSeconds: Math.round(timeline.duration),
    sentToSchedule: Boolean(project.sentToSchedule[plan.id]),
  };
}

/** Shorts renderizados de los proyectos del canal. `folderLocked`: hay que volver a dar permiso a la carpeta */
export async function loadFactoryShorts(youtubeAccountId: string): Promise<{ shorts: FactoryShort[]; folderLocked: boolean }> {
  const [projects, folder] = await Promise.all([listProjects(youtubeAccountId), getShortsFolder().catch(() => null)]);
  const folderLocked = folder ? !(await hasAccess(folder, "readwrite").catch(() => false)) : false;
  const shorts: FactoryShort[] = [];
  for (const project of projects) {
    const renders = await loadRenders(project, folder).catch(() => ({}) as Record<string, StoredRender>);
    for (const plan of project.plans) {
      const render = renders[plan.id];
      if (render) shorts.push(factoryShortFrom(project, plan, render));
    }
  }
  return { shorts, folderLocked };
}

/** Pide permiso para leer la carpeta de Shorts (tiene que venir de un clic) */
export async function unlockShortsFolder(): Promise<boolean> {
  const folder = await getShortsFolder().catch(() => null);
  return folder ? hasAccess(folder, "readwrite", true).catch(() => false) : false;
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Archivo de la Fábrica para un Short de YouTube: primero por el vínculo guardado al subirlo
 * (studio_video_tasks.source_ref); si no hay, por un Short enviado a Programación con el mismo título.
 */
export function matchFactoryShort(video: { id: string; title: string }, sourceRefs: Map<string, string>, shorts: FactoryShort[]): FactoryShort | null {
  const ref = parseShortsSourceRef(sourceRefs.get(video.id));
  if (ref) {
    const linked = shorts.find((s) => s.projectId === ref.projectId && s.planId === ref.planId);
    if (linked) return linked;
  }
  return shorts.find((s) => s.sentToSchedule && sameTitle(s.title, video.title)) ?? null;
}
