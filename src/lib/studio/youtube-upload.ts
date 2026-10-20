// ============================================
// VEXA Content Studio - Subida directa a YouTube desde el navegador
// ============================================
// El archivo va del computador a YouTube (subida reanudable): no pasa por Supabase ni por n8n.
// La Edge Function `studio-youtube-oauth` (acción "upload_token") solo entrega un token de corta duración.
// Programar = subir como privado con status.publishAt: YouTube lo publica solo a esa hora.

import { supabase } from "@/integrations/supabase/client";
import type { Localization } from "./ai";

export type Privacy = "public" | "unlisted" | "private";

export interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  language: string;
  privacy: Privacy;
  /** ISO; si existe el video queda privado hasta esa hora */
  publishAt?: string;
  localizations?: Localization[];
}

// Token por canal en memoria: se reutiliza hasta un minuto antes de que venza
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Token de acceso del canal (sirve para subir, leer el canal y YouTube Analytics) */
export async function getUploadToken(accountId: string): Promise<string> {
  const cached = tokenCache.get(accountId);
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const { data, error } = await supabase.functions.invoke("studio-youtube-oauth", {
    body: { action: "upload_token", account_id: accountId },
  });
  if (error || !data?.ok) {
    const body = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data;
    throw new Error(body?.code === "refresh_failed" ? "YouTube revocó el acceso a este canal. Vuelve a conectarlo." : "No se pudo obtener permiso para usar este canal.");
  }
  tokenCache.set(accountId, { token: data.access_token, expiresAt: new Date(data.expires_at).getTime() });
  return data.access_token as string;
}

export async function googleError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null);
  const reason = body?.error?.errors?.[0]?.reason as string | undefined;
  const messages: Record<string, string> = {
    uploadLimitExceeded: "Llegaste al límite diario de subidas de YouTube para este canal.",
    quotaExceeded: "Se agotó la cuota diaria de la API de YouTube. Vuelve a intentarlo mañana.",
    invalidTitle: "YouTube rechazó el título (máximo 100 caracteres, sin < ni >).",
    invalidDescription: "YouTube rechazó la descripción (máximo 5.000 caracteres, sin < ni >).",
    invalidTags: "YouTube rechazó los tags (máximo 500 caracteres en total).",
    invalidPublishAt: "La fecha de publicación tiene que ser futura.",
    forbidden: "Este canal no permite esa acción.",
    insufficientPermissions: "Vuelve a conectar el canal desde Cuentas conectadas para poder editar videos.",
    videoNotFound: "El video ya no existe en YouTube.",
  };
  return new Error((reason && messages[reason]) ?? body?.error?.message ?? fallback);
}

/** YouTube exige que la fecha de publicación sea futura; se deja margen para que alcance a guardarse */
export const YOUTUBE_MIN_LEAD_MS = 15 * 60_000;

interface VideoStatus {
  privacyStatus?: string;
  publishAt?: string;
  embeddable?: boolean;
  license?: string;
  publicStatsViewable?: boolean;
  selfDeclaredMadeForKids?: boolean;
  containsSyntheticMedia?: boolean;
}

/**
 * Cambia la hora de un video programado (privado con publishAt) y devuelve la hora que guardó YouTube.
 * El PUT reemplaza todo `status`, así que se reenvían los campos actuales. Cuesta ~51 unidades de la cuota diaria.
 */
export async function rescheduleYouTubeVideo(accountId: string, videoId: string, at: Date): Promise<string> {
  const token = await getUploadToken(accountId);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await googleError(res, "No se pudo leer el video en YouTube.");
  const status = (await res.json()).items?.[0]?.status as VideoStatus | undefined;
  if (!status) throw new Error("El video ya no existe en YouTube.");
  if (status.privacyStatus !== "private" || !status.publishAt || new Date(status.publishAt).getTime() <= Date.now()) {
    throw new Error("Este video ya se publicó: YouTube no deja cambiarle la fecha.");
  }

  const next: VideoStatus = {
    privacyStatus: "private",
    publishAt: at.toISOString(),
    embeddable: status.embeddable,
    license: status.license,
    publicStatsViewable: status.publicStatsViewable,
    selfDeclaredMadeForKids: status.selfDeclaredMadeForKids,
    containsSyntheticMedia: status.containsSyntheticMedia,
  };
  const update = await fetch("https://www.googleapis.com/youtube/v3/videos?part=status", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: videoId, status: next }),
  });
  if (!update.ok) throw await googleError(update, "YouTube no aceptó la nueva fecha.");
  const saved = (await update.json().catch(() => null))?.status as VideoStatus | undefined;
  return saved?.publishAt ?? next.publishAt!;
}

function putChunk(
  url: string,
  file: File,
  from: number,
  onProgress: (fraction: number) => void
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (from > 0) xhr.setRequestHeader("Content-Range", `bytes ${from}-${file.size - 1}/${file.size}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((from + e.loaded) / file.size);
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(from > 0 ? file.slice(from) : file);
  });
}

/** Pregunta a YouTube cuántos bytes recibió antes de un corte de red */
async function uploadedBytes(url: string, size: number): Promise<number | { done: string }> {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Range": `bytes */${size}` } });
  if (res.ok) return { done: await res.text() };
  const range = res.headers.get("Range");
  return range ? Number(range.split("-")[1]) + 1 : 0;
}

/** Sube el video y devuelve su id. Reintenta desde donde quedó si se corta la conexión. */
export async function uploadVideo(
  token: string,
  file: File,
  meta: UploadMetadata,
  onProgress: (fraction: number) => void
): Promise<string> {
  const localizations = Object.fromEntries(
    (meta.localizations ?? []).map((l) => [l.lang, { title: l.title, description: l.description }])
  );
  const parts = ["snippet", "status", ...(Object.keys(localizations).length ? ["localizations"] : [])];
  const resource = {
    snippet: {
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      categoryId: meta.categoryId,
      defaultLanguage: meta.language,
      defaultAudioLanguage: meta.language,
    },
    status: {
      privacyStatus: meta.publishAt ? "private" : meta.privacy,
      ...(meta.publishAt ? { publishAt: meta.publishAt } : {}),
      selfDeclaredMadeForKids: false,
    },
    ...(Object.keys(localizations).length ? { localizations } : {}),
  };

  const init = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=${parts.join(",")}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(file.size),
        "X-Upload-Content-Type": file.type || "video/*",
      },
      body: JSON.stringify(resource),
    }
  );
  if (!init.ok) throw await googleError(init, "YouTube no aceptó el video.");
  const uploadUrl = init.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube no entregó la dirección de subida.");

  let from = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await putChunk(uploadUrl, file, from, onProgress);
      if (res.status === 200 || res.status === 201) return JSON.parse(res.body).id as string;
      if (res.status !== 308 && res.status < 500) {
        throw await googleError(new Response(res.body, { status: res.status }), "YouTube rechazó la subida.");
      }
    } catch (err) {
      if (err instanceof Error && err.message !== "network") throw err;
    }
    // Corte de red o error 5xx: esperar y seguir desde el último byte que llegó
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    const status = await uploadedBytes(uploadUrl, file.size).catch(() => from);
    if (typeof status === "object") return JSON.parse(status.done).id as string;
    from = status;
  }
  throw new Error("Se cortó la conexión varias veces. Revisa tu internet y vuelve a intentarlo.");
}

export async function setThumbnail(token: string, videoId: string, image: File) {
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": image.type || "image/jpeg" }, body: image }
  );
  if (!res.ok) {
    const err = await googleError(res, "YouTube no aceptó la miniatura.");
    // La miniatura personalizada exige un canal verificado por teléfono
    throw res.status === 403 ? new Error("Para usar miniatura propia, verifica tu canal en youtube.com/verify.") : err;
  }
}

/** Sube el .srt/.vtt como pista oficial de subtítulos del video */
export async function uploadCaptions(token: string, videoId: string, subtitles: File, language: string) {
  const boundary = `vexa${Date.now()}`;
  const metadata = JSON.stringify({ snippet: { videoId, language, name: "", isDraft: false } });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    subtitles,
    `\r\n--${boundary}--`,
  ]);
  const res = await fetch("https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw await googleError(res, "YouTube no aceptó los subtítulos.");
}
