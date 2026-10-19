// ============================================
// VEXA Content Studio - Contenido publicado en YouTube
// ============================================
// La Edge Function `studio-youtube-oauth` (acción "videos") lee el canal con el token guardado
// y devuelve los videos subidos, del más reciente al más antiguo.

import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnail: string | null;
  durationSeconds: number;
  isShort: boolean;
  privacy: "public" | "unlisted" | "private" | string;
  /** Si está programado: cuándo lo publica YouTube */
  publishAt: string | null;
  live: "none" | "live" | "upcoming" | string;
  views: number;
  likes: number;
  comments: number;
}

export interface YouTubeChannelStats {
  subscribers: number;
  views: number;
  videos: number;
}

export type YouTubeVideosResult =
  | { ok: true; channel: YouTubeChannelStats; videos: YouTubeVideo[]; nextPageToken: string | null }
  | { ok: false; code: string };

interface VideoRow {
  id: string;
  title: string;
  description: string;
  published_at: string | null;
  thumbnail: string | null;
  duration_seconds: number;
  is_short: boolean;
  privacy: string;
  publish_at?: string | null;
  live: string;
  views: number;
  likes: number;
  comments: number;
}

export async function fetchYouTubeVideos(accountId: string, pageToken?: string): Promise<YouTubeVideosResult> {
  const { data, error } = await supabase.functions.invoke("studio-youtube-oauth", {
    body: { action: "videos", account_id: accountId, page_token: pageToken },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, code: body?.code ?? "network" };
  }
  if (!data?.ok) return { ok: false, code: data?.code ?? "network" };
  return {
    ok: true,
    channel: data.channel,
    nextPageToken: data.next_page_token,
    videos: (data.videos as VideoRow[]).map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      publishedAt: v.published_at,
      thumbnail: v.thumbnail,
      durationSeconds: v.duration_seconds,
      isShort: v.is_short,
      privacy: v.privacy,
      publishAt: v.publish_at ?? null,
      live: v.live,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
    })),
  };
}

/** Contenido del canal que ocupa el calendario: programados (privados con fecha) y publicados */
export function scheduleTimes(videos: YouTubeVideo[]): { video: YouTubeVideo; at: Date; scheduled: boolean }[] {
  return videos.flatMap((video) => {
    const scheduled = video.privacy === "private" && Boolean(video.publishAt);
    const iso = scheduled ? video.publishAt : video.privacy === "private" ? null : video.publishedAt;
    if (!iso) return [];
    return [{ video, at: new Date(iso), scheduled }];
  });
}

/** 3723 -> "1:02:03" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export const YOUTUBE_ERROR_MESSAGES: Record<string, string> = {
  refresh_failed: "YouTube revocó el acceso a este canal. Vuelve a conectarlo desde Cuentas conectadas.",
  no_refresh_token: "Falta el permiso sin conexión de este canal. Vuelve a conectarlo.",
  no_tokens: "Este canal no tiene credenciales guardadas. Vuelve a conectarlo.",
  forbidden: "No tienes permiso para ver este canal.",
  unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
  network: "No se pudo contactar al servidor.",
  internal_error: "YouTube no respondió. Vuelve a intentarlo en unos segundos.",
};
