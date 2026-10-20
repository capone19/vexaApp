// ============================================
// VEXA Content Studio - Tareas de cada video de YouTube (tabla studio_video_tasks)
// ============================================
// - Comentario para fijar: se publica solo. Primero se intenta apenas se programa (si YouTube lo deja
//   con el video privado, se puede fijar de inmediato); si no, n8n lo publica a la hora de publicación
//   y avisa por Telegram con el link para fijarlo (la API de YouTube no permite fijar).
// - Video largo relacionado de un Short: la API tampoco lo permite; se deja el link directo a YouTube Studio.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUploadToken, googleError } from "./youtube-upload";

// Las tablas del Studio aún no están en los tipos generados de Supabase
const db = supabase as unknown as SupabaseClient;

export type CommentStatus = "sin" | "pendiente" | "publicado" | "fijado" | "error";

export interface VideoTask {
  id: string;
  accountId: string;
  videoId: string;
  videoTitle: string;
  isShort: boolean;
  commentText: string | null;
  commentStatus: CommentStatus;
  commentId: string | null;
  postAfter: string;
  lastError: string | null;
  relatedVideoId: string | null;
  relatedVideoTitle: string | null;
  relatedDone: boolean;
}

export interface RelatedVideo {
  id: string;
  title: string;
}

interface TaskRow {
  id: string;
  account_id: string;
  video_id: string;
  video_title: string;
  is_short: boolean;
  comment_text: string | null;
  comment_status: CommentStatus;
  comment_id: string | null;
  post_after: string;
  last_error: string | null;
  related_video_id: string | null;
  related_video_title: string | null;
  related_done: boolean;
}

const COLUMNS =
  "id, account_id, video_id, video_title, is_short, comment_text, comment_status, comment_id, post_after, last_error, related_video_id, related_video_title, related_done";

const toTask = (r: TaskRow): VideoTask => ({
  id: r.id,
  accountId: r.account_id,
  videoId: r.video_id,
  videoTitle: r.video_title,
  isShort: r.is_short,
  commentText: r.comment_text,
  commentStatus: r.comment_status,
  commentId: r.comment_id,
  postAfter: r.post_after,
  lastError: r.last_error,
  relatedVideoId: r.related_video_id,
  relatedVideoTitle: r.related_video_title,
  relatedDone: r.related_done,
});

/** Link al comentario (abre el video con el comentario arriba): ⋮ → Fijar */
export const pinUrl = (videoId: string, commentId: string) => `https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`;

/** Página de detalles del video en YouTube Studio, donde se elige el "Video relacionado" del Short */
export const studioEditUrl = (videoId: string) => `https://studio.youtube.com/video/${videoId}/edit`;

/** Lo que falta hacer a mano: fijar el comentario, elegir el video relacionado o revisar un error */
export const needsAction = (t: VideoTask) =>
  t.commentStatus === "publicado" || t.commentStatus === "error" || Boolean(t.relatedVideoId && !t.relatedDone);

export async function listVideoTasks(accountId: string): Promise<VideoTask[]> {
  const { data, error } = await db
    .from("studio_video_tasks")
    .select(COLUMNS)
    .eq("account_id", accountId)
    .order("post_after", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

/** Origen de cada Short subido desde la Fábrica (id del video de YouTube → 'shorts:<projectId>:<planId>') */
export async function listSourceRefs(accountId: string): Promise<Map<string, string>> {
  const { data, error } = await db
    .from("studio_video_tasks")
    .select("video_id, source_ref")
    .eq("account_id", accountId)
    .not("source_ref", "is", null)
    .limit(500);
  if (error) throw error;
  return new Map((data as { video_id: string; source_ref: string }[]).map((r) => [r.video_id, r.source_ref]));
}

export interface SaveTaskInput {
  accountId: string;
  videoId: string;
  videoTitle: string;
  isShort: boolean;
  commentText: string;
  /** Hora de publicación del video (desde ahí n8n intenta publicar el comentario) */
  postAfter: string;
  related: RelatedVideo | null;
  /** Origen en la Fábrica ('shorts:<projectId>:<planId>'); si no viene, no se toca el guardado */
  sourceRef?: string;
}

/** Crea o reemplaza las tareas del video. Un comentario nuevo queda pendiente (aún no se publicó). */
export async function saveVideoTask(input: SaveTaskInput): Promise<VideoTask> {
  const text = input.commentText.trim();
  const { data, error } = await db
    .from("studio_video_tasks")
    .upsert(
      {
        account_id: input.accountId,
        video_id: input.videoId,
        video_title: input.videoTitle.slice(0, 200),
        is_short: input.isShort,
        comment_text: text || null,
        comment_status: text ? "pendiente" : "sin",
        comment_id: null,
        attempts: 0,
        last_error: null,
        post_after: input.postAfter,
        related_video_id: input.related?.id ?? null,
        related_video_title: input.related?.title ?? null,
        related_done: false,
        ...(input.sourceRef ? { source_ref: input.sourceRef } : {}),
      },
      { onConflict: "account_id,video_id" }
    )
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toTask(data as TaskRow);
}

export async function updateVideoTask(
  id: string,
  patch: { commentStatus?: CommentStatus; relatedDone?: boolean; related?: RelatedVideo | null }
) {
  const { error } = await db
    .from("studio_video_tasks")
    .update({
      // Volver a "pendiente" (reintentar) reinicia los intentos de n8n
      ...(patch.commentStatus ? { comment_status: patch.commentStatus, ...(patch.commentStatus === "pendiente" ? { attempts: 0, last_error: null } : {}) } : {}),
      ...(patch.relatedDone !== undefined ? { related_done: patch.relatedDone } : {}),
      ...(patch.related !== undefined
        ? { related_video_id: patch.related?.id ?? null, related_video_title: patch.related?.title ?? null, related_done: false }
        : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

/** El video cambió de fecha: el comentario pendiente espera la nueva hora (si no hay tarea, no hace nada) */
export async function rescheduleVideoTask(accountId: string, videoId: string, postAfter: string) {
  const { error } = await db
    .from("studio_video_tasks")
    .update({ post_after: postAfter })
    .eq("account_id", accountId)
    .eq("video_id", videoId)
    .eq("comment_status", "pendiente");
  if (error) throw error;
}

/** Intenta publicar ya los comentarios indicados (id de tarea → id del comentario publicado). Los que YouTube no acepte los publica n8n a su hora. */
export async function postCommentsNow(taskIds: string[]): Promise<Map<string, string>> {
  const posted = new Map<string, string>();
  if (!taskIds.length) return posted;
  const { data, error } = await supabase.functions.invoke("studio-youtube-oauth", {
    body: { action: "post_comments", task_ids: taskIds },
  });
  if (error || !data?.ok) return posted;
  for (const p of data.posted as { id: string; comment_id: string }[]) posted.set(p.id, p.comment_id);
  return posted;
}

// ---------- Llamado al video largo (Shorts) ----------
// Texto fijo por idioma, sin IA: sirve también para Shorts que ya estaban listos o programados.
const CTA: Record<string, string> = {
  en: "🎬 Full story in the linked video",
  es: "🎬 La historia completa en el video vinculado",
  pt: "🎬 A história completa no vídeo vinculado",
  fr: "🎬 L'histoire complète dans la vidéo liée",
  de: "🎬 Die ganze Geschichte im verlinkten Video",
  it: "🎬 La storia completa nel video collegato",
  hi: "🎬 पूरी कहानी जुड़े हुए वीडियो में",
  id: "🎬 Cerita lengkapnya di video yang ditautkan",
};
const CTA_LINES = new Set(Object.values(CTA));

export const ctaLine = (lang: string) => CTA[lang] ?? CTA.en;

const isHashtagLine = (line: string) => /^(#\S+\s*)+$/.test(line.trim());

/** Agrega el llamado antes de la línea de hashtags (o al final). No lo repite si ya está. */
export function withCta(text: string, lang: string): string {
  const clean = withoutCta(text);
  const lines = clean.replace(/\s+$/, "").split("\n");
  const line = ctaLine(lang);
  if (!clean.trim()) return line;
  const last = lines.length - 1;
  if (isHashtagLine(lines[last])) {
    const before = lines.slice(0, last).join("\n").replace(/\s+$/, "");
    return `${before ? `${before}\n\n` : ""}${line}\n\n${lines[last]}`;
  }
  return `${lines.join("\n")}\n\n${line}`;
}

/** Quita el llamado (al cambiar o sacar el video relacionado) */
export function withoutCta(text: string): string {
  return text
    .split("\n")
    .filter((l) => !CTA_LINES.has(l.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Agrega el llamado a la descripción de un video ya subido (y a sus traducciones).
 * Cuesta ~51 unidades de la cuota diaria de YouTube.
 */
export async function addCtaToUploadedVideo(accountId: string, videoId: string): Promise<void> {
  const token = await getUploadToken(accountId);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,localizations&id=${videoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await googleError(res, "No se pudo leer el video en YouTube.");
  const video = (await res.json()).items?.[0];
  if (!video) throw new Error("El video ya no existe en YouTube.");
  const { snippet } = video;
  const lang = snippet.defaultLanguage ?? "en";
  const localizations = video.localizations as Record<string, { title: string; description?: string }> | undefined;
  const update = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,localizations", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: videoId,
      snippet: {
        title: snippet.title,
        description: withCta(snippet.description ?? "", lang),
        tags: snippet.tags,
        categoryId: snippet.categoryId,
        defaultLanguage: snippet.defaultLanguage,
        defaultAudioLanguage: snippet.defaultAudioLanguage,
      },
      ...(localizations
        ? {
            localizations: Object.fromEntries(
              Object.entries(localizations).map(([l, v]) => [l, { ...v, description: withCta(v.description ?? "", l) }])
            ),
          }
        : {}),
    }),
  });
  if (!update.ok) throw await googleError(update, "YouTube no aceptó el cambio de descripción.");
}
