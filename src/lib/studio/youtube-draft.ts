// ============================================
// VEXA Content Studio - Borradores de YouTube (subir ahora o programar)
// ============================================
// Un borrador junta el archivo, sus subtítulos y miniatura, y los metadatos (con o sin IA).
// Los borradores de la Programación se guardan en IndexedDB del navegador, con los archivos
// incluidos: viven en este PC (no en Supabase) y sobreviven a recargar la página.

import {
  generateMetadata,
  transcribeAudio,
  translateWithAi,
  type ChannelProfile,
  type GeneratedMetadata,
  type Localization,
} from "./ai";
import { captureFrames, extractAudioChunks, getVideoInfo, type VideoInfo } from "./media";
import { cuesToTranscript, parseSubtitles, type Cue } from "./subtitles";
import { postCommentsNow, saveVideoTask, withCta, type RelatedVideo, type VideoTask } from "./video-tasks";
import { getUploadToken, setThumbnail, uploadCaptions, uploadVideo, type Privacy } from "./youtube-upload";

export type DraftFormat = "video" | "short";

export interface YouTubeDraft {
  id: string;
  accountId: string;
  file: File | null;
  subtitleFile: File | null;
  thumbnailFile: File | null;
  format: DraftFormat;
  video: VideoInfo | null;
  language: string;
  notes: string;
  title: string;
  description: string;
  /** Separados por coma, tal como se editan */
  tags: string;
  ai: GeneratedMetadata | null;
  /** Comentario para fijar; sin definir = el que propuso la IA */
  pinnedComment?: string;
  /** Shorts: video largo al que lleva (se elige luego en YouTube Studio; aquí agrega el llamado al texto) */
  relatedVideo?: RelatedVideo | null;
  useLocalizations: boolean;
  /** Short nacido en la Fábrica: 'shorts:<projectId>:<planId>' (Instagram lo usa para encontrar el archivo) */
  sourceRef?: string;
  /** ISO; null = sin fecha todavía */
  scheduledAt: string | null;
  error?: string;
  createdAt: string;
}

export function newDraft(accountId: string, profile: ChannelProfile, patch: Partial<YouTubeDraft> = {}): YouTubeDraft {
  return {
    id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    accountId,
    file: null,
    subtitleFile: null,
    thumbnailFile: null,
    format: "video",
    video: null,
    language: profile.language,
    notes: "",
    title: "",
    description: "",
    tags: "",
    ai: null,
    useLocalizations: profile.localize_to.length > 0,
    scheduledAt: null,
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

/** Vertical y de hasta 3 minutos: YouTube lo trata como Short */
export async function inspectVideo(file: File): Promise<{ video: VideoInfo | null; format: DraftFormat }> {
  try {
    const video = await getVideoInfo(file);
    return { video, format: video.height > video.width && video.duration <= 180 ? "short" : "video" };
  } catch {
    return { video: null, format: "video" };
  }
}

export const parseTags = (tags: string) =>
  tags
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

/** Comentario que se publicará: el editado o, si no se tocó, el de la IA */
export const draftComment = (draft: Pick<YouTubeDraft, "pinnedComment" | "ai">) => draft.pinnedComment ?? draft.ai?.pinned_comment ?? "";

export const baseName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/\.(en|es|pt|fr|de|it|hi|id)$/i, "").toLowerCase();

// Transcripción ya pagada de cada archivo: regenerar no vuelve a transcribir
const transcripts = new WeakMap<File, Cue[]>();

export class NeedsTranscription extends Error {
  constructor() {
    super("Este video no tiene subtítulos.");
  }
}

/** Subtítulos del creador > transcripción ya hecha > transcribir el audio (solo si se permite) */
async function resolveTranscript(draft: YouTubeDraft, allowTranscribe: boolean, onStep: (s: string) => void): Promise<Cue[]> {
  if (draft.subtitleFile) {
    const cues = parseSubtitles(await draft.subtitleFile.text());
    if (!cues.length) throw new Error("El archivo de subtítulos está vacío o no es .srt/.vtt.");
    return cues;
  }
  const file = draft.file;
  if (!file || !file.type.startsWith("video/")) return [];
  const cached = transcripts.get(file);
  if (cached) return cached;
  if (!allowTranscribe) throw new NeedsTranscription();
  onStep("Extrayendo el audio…");
  const chunks = await extractAudioChunks(file);
  const cues = await transcribeAudio(chunks, (done, total) =>
    onStep(total > 1 ? `Transcribiendo ${Math.min(done + 1, total)} de ${total}…` : "Transcribiendo el audio…")
  );
  transcripts.set(file, cues);
  return cues;
}

/** Rellena título, descripción y tags con IA. Lanza NeedsTranscription si haría falta pagar una transcripción. */
export async function fillDraftWithAi(
  draft: YouTubeDraft,
  opts: { profile: ChannelProfile; channelName?: string; allowTranscribe?: boolean; onStep?: (s: string) => void }
): Promise<Partial<YouTubeDraft>> {
  const onStep = opts.onStep ?? (() => undefined);
  const cues = await resolveTranscript(draft, Boolean(opts.allowTranscribe), onStep);
  if (!cues.length && !draft.notes.trim()) {
    throw new Error("Falta contexto: agrega los subtítulos (.srt) o escribe notas sobre el video.");
  }
  onStep("Mirando el video…");
  const frames = draft.file?.type.startsWith("video/") ? await captureFrames(draft.file).catch(() => []) : [];
  onStep("Escribiendo títulos y descripción…");
  const ai = await generateMetadata({
    language: draft.language,
    format: draft.format,
    transcript: cuesToTranscript(cues),
    durationSeconds: draft.video?.duration ?? cues.at(-1)?.end,
    notes: draft.notes,
    frames,
    profile: opts.profile,
    channelName: opts.channelName,
    localizeTo: opts.profile.localize_to,
    current: { title: draft.title, description: draft.description },
  });
  const related = draft.format === "short" && draft.relatedVideo;
  return {
    ai,
    title: ai.titles[0]?.text ?? draft.title,
    description: related ? withCta(ai.description, draft.language) : ai.description,
    pinnedComment: related ? withCta(ai.pinned_comment, draft.language) : ai.pinned_comment,
    tags: ai.tags.join(", "),
    error: undefined,
  };
}

/** Traducciones del título elegido; lo que se editó a mano se traduce en el momento */
async function resolveLocalizations(draft: YouTubeDraft): Promise<Localization[]> {
  const { ai } = draft;
  if (!ai) return [];
  const title = draft.title.trim();
  const option = ai.titles.find((t) => t.text === title);
  const descriptionEdited = draft.description.trim() !== ai.description.trim();
  return Promise.all(
    ai.localizations
      .filter((l) => l.lang !== draft.language)
      .map(async (l) => {
        const optionTitle = option?.localized_titles?.find((x) => x.lang === l.lang)?.title;
        const [localTitle] = optionTitle ? [optionTitle] : await translateWithAi([title], l.lang);
        const [localDescription] = descriptionEdited ? await translateWithAi([draft.description], l.lang) : [l.description];
        return { lang: l.lang, title: localTitle.slice(0, 100), description: localDescription.slice(0, 5000) };
      })
  );
}

/** Unidades de cuota de la API de YouTube que gasta publicar este borrador (límite: 10.000 al día) */
export function quotaUnits(draft: Pick<YouTubeDraft, "subtitleFile" | "thumbnailFile" | "format">): number {
  // La miniatura de los Shorts no va por la API: se sube a mano en YouTube Studio
  return 1600 + (draft.subtitleFile ? 400 : 0) + (draft.thumbnailFile && draft.format !== "short" ? 50 : 0);
}

export const DAILY_QUOTA = 10_000;

/** Lo que falta para poder programar el borrador (vacío = listo) */
export function draftProblems(draft: YouTubeDraft, needsDate: boolean): string[] {
  const problems: string[] = [];
  if (!draft.file) problems.push("Falta el archivo de video");
  if (!draft.title.trim()) problems.push("Falta el título");
  if (needsDate && !draft.scheduledAt) problems.push("Falta la fecha");
  if (needsDate && draft.scheduledAt && new Date(draft.scheduledAt).getTime() < Date.now() + 15 * 60_000) {
    problems.push("La fecha ya pasó o está muy cerca");
  }
  return problems;
}

export interface PublishResult {
  videoId: string;
  warnings: string[];
  /** Comentario para fijar y video relacionado pendientes de este video */
  task: VideoTask | null;
  /** Miniatura del Short que queda pendiente para subirla a mano en YouTube Studio (la API no la aplica) */
  thumbnailPending: { videoId: string; file: File } | null;
}

/** Sube el borrador a YouTube. Con publishAt queda privado y YouTube lo publica solo a esa hora. */
export async function publishDraft(
  draft: YouTubeDraft,
  opts: {
    categoryId: string;
    privacy: Privacy;
    publishAt?: string;
    onStatus?: (text: string) => void;
    onProgress?: (fraction: number) => void;
  }
): Promise<PublishResult> {
  if (!draft.file) throw new Error("Falta el archivo de video.");
  const onStatus = opts.onStatus ?? (() => undefined);
  const warnings: string[] = [];

  let localizations: Localization[] | undefined;
  if (draft.useLocalizations && draft.ai?.localizations.length) {
    onStatus("Preparando traducciones…");
    localizations = await resolveLocalizations(draft).catch(() => {
      warnings.push("Traducciones: no se pudieron preparar; se subió sin ellas");
      return undefined;
    });
  }

  onStatus("Subiendo el video…");
  const token = await getUploadToken(draft.accountId);
  const videoId = await uploadVideo(
    token,
    draft.file,
    {
      title: draft.title.trim(),
      description: draft.description,
      tags: parseTags(draft.tags),
      categoryId: opts.categoryId,
      language: draft.language,
      privacy: opts.privacy,
      publishAt: opts.publishAt,
      localizations,
    },
    opts.onProgress ?? (() => undefined)
  );
  // Shorts: YouTube responde OK a thumbnails.set pero no aplica la imagen. Queda pendiente para subirla en Studio,
  // con una copia temporal en este PC (se borra al marcarla como subida)
  let thumbnailPending: PublishResult["thumbnailPending"] = null;
  if (draft.thumbnailFile && draft.format === "short") {
    await saveShortThumbnail(videoId, draft.thumbnailFile).catch(() => undefined);
    thumbnailPending = { videoId, file: draft.thumbnailFile };
  } else if (draft.thumbnailFile) {
    onStatus("Subiendo la miniatura…");
    await setThumbnail(token, videoId, draft.thumbnailFile).catch((e: Error) => warnings.push(`Miniatura: ${e.message}`));
  }
  if (draft.subtitleFile) {
    onStatus("Subiendo los subtítulos…");
    await uploadCaptions(token, videoId, draft.subtitleFile, draft.language).catch((e: Error) =>
      warnings.push(`Subtítulos: ${e.message}`)
    );
  }

  // Comentario para fijar: se intenta publicar ya (con el video privado YouTube puede no aceptarlo;
  // en ese caso n8n lo publica a la hora de publicación y avisa por Telegram)
  let task: VideoTask | null = null;
  const comment = draftComment(draft).trim();
  const related = draft.format === "short" ? (draft.relatedVideo ?? null) : null;
  if (comment || related || draft.sourceRef || thumbnailPending) {
    try {
      task = await saveVideoTask({
        accountId: draft.accountId,
        videoId,
        videoTitle: draft.title.trim(),
        isShort: draft.format === "short",
        commentText: comment,
        postAfter: opts.publishAt ?? new Date().toISOString(),
        related,
        sourceRef: draft.sourceRef,
        thumbnailPending: thumbnailPending ? true : undefined,
      });
      if (comment) {
        onStatus("Publicando el comentario…");
        const commentId = (await postCommentsNow([task.id])).get(task.id);
        if (commentId) task = { ...task, commentStatus: "publicado", commentId };
      }
    } catch {
      warnings.push(
        thumbnailPending
          ? "Pendientes: no se pudieron guardar; sube la miniatura a mano en YouTube Studio"
          : "Comentario: no se pudo dejar programado; agrégalo desde Programación"
      );
    }
  }
  return { videoId, warnings, task, thumbnailPending };
}

// ---------- Guardado local (IndexedDB) ----------
// Los metadatos y los archivos van en almacenes separados: editar el título no reescribe el video.

const DB_NAME = "vexa-studio";
const DRAFTS = "youtube-drafts";
const FILES = "youtube-draft-files";

export type DraftFileKey = "file" | "subtitleFile" | "thumbnailFile";
const FILE_KEYS: DraftFileKey[] = ["file", "subtitleFile", "thumbnailFile"];

type StoredDraft = Omit<YouTubeDraft, DraftFileKey>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DRAFTS, { keyPath: "id" }).createIndex("accountId", "accountId");
      req.result.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction) => () => T): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction([DRAFTS, FILES], mode);
      const result = run(tx);
      tx.oncomplete = () => resolve(result());
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("No se pudo guardar en este navegador."));
    });
  } finally {
    db.close();
  }
}

export async function listDrafts(accountId: string): Promise<YouTubeDraft[]> {
  const rows = await transaction("readonly", (tx) => {
    const req = tx.objectStore(DRAFTS).index("accountId").getAll(accountId) as IDBRequest<StoredDraft[]>;
    return () => req.result;
  });
  const drafts = await transaction("readonly", (tx) => {
    const files = tx.objectStore(FILES);
    const reqs = rows.map((row) => FILE_KEYS.map((k) => files.get(`${row.id}:${k}`) as IDBRequest<File | undefined>));
    return () =>
      rows.map((row, i) => ({
        ...row,
        file: reqs[i][0].result ?? null,
        subtitleFile: reqs[i][1].result ?? null,
        thumbnailFile: reqs[i][2].result ?? null,
      }));
  });
  return drafts.sort(
    (a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9") || a.createdAt.localeCompare(b.createdAt)
  );
}

/** Guarda el borrador; los archivos solo se escriben si se indican (por defecto, todos) */
export async function saveDraft(draft: YouTubeDraft, changedFiles: DraftFileKey[] = FILE_KEYS): Promise<void> {
  // Almacenamiento persistente: el navegador no borra los videos guardados si le falta espacio
  void navigator.storage?.persist?.().catch(() => undefined);
  const { file, subtitleFile, thumbnailFile, ...meta } = draft;
  const files = { file, subtitleFile, thumbnailFile };
  await transaction("readwrite", (tx) => {
    tx.objectStore(DRAFTS).put(meta);
    for (const key of changedFiles) {
      const value = files[key];
      if (value) tx.objectStore(FILES).put(value, `${draft.id}:${key}`);
      else tx.objectStore(FILES).delete(`${draft.id}:${key}`);
    }
    return () => undefined;
  });
}

/** Cambia la miniatura de un borrador que sigue sin subir. false si el borrador ya no existe */
export async function setDraftThumbnail(draftId: string, file: File): Promise<boolean> {
  return transaction("readwrite", (tx) => {
    let found = false;
    const req = tx.objectStore(DRAFTS).get(draftId) as IDBRequest<StoredDraft | undefined>;
    req.onsuccess = () => {
      if (!req.result) return;
      found = true;
      tx.objectStore(FILES).put(file, `${draftId}:thumbnailFile`);
    };
    return () => found;
  });
}

export async function deleteDraft(id: string): Promise<void> {
  await transaction("readwrite", (tx) => {
    tx.objectStore(DRAFTS).delete(id);
    for (const key of FILE_KEYS) tx.objectStore(FILES).delete(`${id}:${key}`);
    return () => undefined;
  });
}

// ---------- Miniatura pendiente de un Short ya subido ----------
// Única imagen que se guarda en IndexedDB: es temporal y se borra al marcarla como subida en Studio.
const shortThumbKey = (videoId: string) => `yt-thumb:${videoId}`;

export async function saveShortThumbnail(videoId: string, file: File): Promise<void> {
  await transaction("readwrite", (tx) => {
    tx.objectStore(FILES).put(file, shortThumbKey(videoId));
    return () => undefined;
  });
}

export async function getShortThumbnail(videoId: string): Promise<File | null> {
  return transaction("readonly", (tx) => {
    const req = tx.objectStore(FILES).get(shortThumbKey(videoId)) as IDBRequest<File | undefined>;
    return () => req.result ?? null;
  });
}

export async function deleteShortThumbnail(videoId: string): Promise<void> {
  await transaction("readwrite", (tx) => {
    tx.objectStore(FILES).delete(shortThumbKey(videoId));
    return () => undefined;
  });
}
