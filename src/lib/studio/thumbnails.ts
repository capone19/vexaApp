// ============================================
// VEXA Content Studio - Miniatura con IA para Shorts (y portada de Reels)
// ============================================
// n8n ("VEXA Studio · Miniaturas", webhook vexa-studio/thumbnail) lee lo que dice el Short, propone 3 frases
// cortas y la escena, y dibuja el fondo vertical sin texto. La frase la pone esta app en un canvas (Anton y
// la caja amarilla de los Shorts) y arma un JPG 1080×1920.
// Las imágenes se guardan solo en la carpeta del PC: en IndexedDB queda la ficha (frases, escena, rutas),
// nunca el archivo. n8n no guarda nada.

import { accessToken, N8N_BASE_URL, readResponse, type ChannelProfile } from "./ai";
import { buildTimeline, FILES, hasAccess, safeName, tx, writeFile, type ShortPlan, type ShortsProject, type StoredRender } from "./shorts";
import { loadShortFonts, OUT_H, OUT_W, POP_FONT, YELLOW } from "./shorts-render";
import type { Cue } from "./subtitles";

const THUMBNAIL_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_THUMBNAIL || "/webhook/vexa-studio/thumbnail";

/** La IA tarda 30 a 90 s (texto + imagen) */
const THUMBNAIL_TIMEOUT_MS = 180_000;
/** YouTube acepta miniaturas de hasta 2 MB */
export const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

export const THUMBNAIL_COST_NOTE = "Cada imagen gasta unos centavos de OpenAI.";
export const FOLDER_HINT = "Elige tu carpeta de Shorts en el disco D (por ejemplo D:\\VEXA\\Shorts). Ahí se guardan los videos y las miniaturas.";

// ---------- Tipos ----------

export interface ThumbnailPhrase {
  /** Línea de arriba en blanco (puede venir vacía) */
  top: string;
  /** Remate en la caja amarilla */
  highlight: string;
  trigger: string;
  why_es: string;
}

export interface ThumbnailResult {
  ok: boolean;
  /** Fondo sin texto (data URL JPEG 1088×1920); null si falló la imagen */
  image: string | null;
  phrases: ThumbnailPhrase[];
  recommended: number;
  /** Escena dibujada (en inglés): sirve para "Otra imagen" */
  scene: string;
  conceptEs: string;
  /** Solo si falló la imagen pero llegaron frases y escena */
  error?: string;
}

export interface ThumbnailInput {
  stage: "propose" | "image";
  language: string;
  profile: Pick<ChannelProfile, "niche" | "tone" | "audience">;
  episodeTitle?: string;
  short: { title: string; hookLine: string; description: string; transcript: string };
  /** 2-3 fotogramas del video original (data URL) */
  frames?: string[];
  /** Solo si no hay video local y el Short ya está en YouTube */
  frameUrls?: string[];
  guidance?: string;
  /** Frases ya usadas en otras miniaturas del proyecto */
  avoid?: string[];
  /** Obligatoria con stage "image" */
  scene?: string;
}

export interface PhraseText {
  top: string;
  highlight: string;
}

interface RawThumbnail {
  ok?: boolean;
  error?: string;
  image?: string | null;
  phrases?: Partial<ThumbnailPhrase>[];
  recommended?: number;
  scene?: string;
  concept_es?: string;
}

// ---------- Llamada a n8n ----------

const toResult = (raw: RawThumbnail): ThumbnailResult => {
  const phrases = (raw.phrases ?? [])
    .map((p) => ({
      top: String(p.top ?? "").trim(),
      highlight: String(p.highlight ?? "").trim(),
      trigger: String(p.trigger ?? ""),
      why_es: String(p.why_es ?? ""),
    }))
    .filter((p) => p.highlight || p.top)
    .slice(0, 3);
  const recommended = Number.isInteger(raw.recommended) && (raw.recommended as number) < phrases.length ? (raw.recommended as number) : 0;
  return {
    ok: raw.ok !== false && Boolean(raw.image),
    image: raw.image || null,
    phrases,
    recommended,
    scene: String(raw.scene ?? ""),
    conceptEs: String(raw.concept_es ?? ""),
    ...(raw.ok === false || !raw.image ? { error: raw.error || "No se pudo dibujar la imagen." } : {}),
  };
};

/** Frases + escena + fondo ("propose") o solo otro fondo con la misma escena ("image") */
export async function generateThumbnail(input: ThumbnailInput): Promise<ThumbnailResult> {
  let res: Response;
  try {
    res = await fetch(`${N8N_BASE_URL}${THUMBNAIL_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(THUMBNAIL_TIMEOUT_MS),
      body: JSON.stringify({
        access_token: await accessToken(),
        stage: input.stage,
        language: input.language,
        profile: { niche: input.profile.niche, tone: input.profile.tone, audience: input.profile.audience },
        ...(input.episodeTitle ? { episode: { title: input.episodeTitle } } : {}),
        short: {
          title: input.short.title,
          hook_line: input.short.hookLine,
          description: input.short.description,
          transcript: input.short.transcript,
        },
        frames: (input.frames ?? []).slice(0, 3),
        ...(input.frameUrls?.length ? { frame_urls: input.frameUrls.slice(0, 3) } : {}),
        guidance: input.guidance ?? "",
        avoid: input.avoid ?? [],
        scene: input.scene ?? "",
      }),
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new Error("La IA tardó demasiado en dibujar. Vuelve a intentarlo.");
    }
    throw new Error("No se pudo conectar con la IA. Revisa tu conexión y vuelve a intentarlo.");
  }
  try {
    return toResult(await readResponse<RawThumbnail>(res.clone()));
  } catch (e) {
    // Si falló solo la imagen, igual vienen las frases y la escena: se muestran con "Otra imagen"
    const body = (await res.json().catch(() => null)) as RawThumbnail | null;
    if (res.ok && body && (body.phrases?.length || body.scene)) return toResult({ ...body, ok: false });
    throw e;
  }
}

// ---------- Lo que dice el Short y fotogramas del episodio ----------

/** Líneas "[inicio-fin] palabras" con los tiempos del Short (no los del video original) */
export function thumbnailTranscript(plan: ShortPlan, cues: Cue[]): string {
  return buildTimeline(plan, cues)
    .captions.map((c) => `[${c.start.toFixed(2)}-${c.end.toFixed(2)}] ${c.words.map((w) => w.text).join(" ")}`)
    .join("\n");
}

/** Segundos del video original donde se toman los fotogramas */
export function frameTimes(plan: Pick<ShortPlan, "segments">, max = 3): number[] {
  const segments = plan.segments.filter((s) => s.end > s.start);
  if (segments.length === 1) {
    const [s] = segments;
    return [s.start + (s.end - s.start) * 0.3, s.start + (s.end - s.start) * 0.7].slice(0, max);
  }
  return segments.map((s) => (s.start + s.end) / 2).slice(0, max);
}

const FRAME_WIDTH = 768;

/** Fotogramas del video original (para que la IA dibuje los mismos personajes). Sin video, [] */
export async function captureFrames(video: File | null, plan: Pick<ShortPlan, "segments">, max = 3): Promise<string[]> {
  if (!video) return [];
  const url = URL.createObjectURL(video);
  const el = document.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.src = url;
  const frames: string[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      el.onloadeddata = () => resolve();
      el.onerror = () => reject(new Error("No se pudo leer el video."));
    });
    const width = FRAME_WIDTH;
    const height = Math.round((FRAME_WIDTH * (el.videoHeight || 9)) / (el.videoWidth || 16));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    for (const t of frameTimes(plan, max)) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        el.addEventListener("seeked", done, { once: true });
        setTimeout(done, 3000);
        el.currentTime = Math.min(t, Math.max(0, (el.duration || t) - 0.1));
      });
      ctx.drawImage(el, 0, 0, width, height);
      frames.push(canvas.toDataURL("image/jpeg", 0.8));
    }
  } catch {
    // Sin fotogramas la IA igual dibuja (con el aviso en pantalla)
  } finally {
    el.removeAttribute("src");
    el.load();
    URL.revokeObjectURL(url);
  }
  return frames;
}

// ---------- Componer la miniatura (fondo + frase) ----------

/** Ancho máximo del texto y bloque donde va (dentro del recorte 3:4 de Instagram y lejos de los botones de YouTube) */
const TEXT_MAX_W = 900;
const BLOCK_TOP = 280;
const BLOCK_BOTTOM = 860;
const TOP_SIZES = { max: 130, min: 48 };
const HIGHLIGHT_SIZES = { max: 200, min: 60, oneLineMin: 120 };
const BOX_PAD_X = 0.3;
const BOX_H = 1.22;
const BOX_GAP = 14;
const TOP_LINE_H = 1.08;
const TOP_GAP = 26;

/** Ancho del texto con la tipografía Anton a ese tamaño */
export type MeasureText = (text: string, size: number) => number;

export interface PhraseLayout {
  topSize: number;
  /** Centro vertical de cada línea blanca */
  topLines: { text: string; y: number }[];
  highlightSize: number;
  boxes: { text: string; x: number; y: number; w: number; h: number }[];
  top: number;
  bottom: number;
}

/** Corte en 2 líneas lo más parejas posible (por palabras) */
function splitTwo(text: string, measure: MeasureText, size: number): [string, string] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best: [string, string] | null = null;
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const pair: [string, string] = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const width = Math.max(measure(pair[0], size), measure(pair[1], size));
    if (width < bestWidth) {
      best = pair;
      bestWidth = width;
    }
  }
  return best;
}

interface Fitted {
  size: number;
  lines: string[];
}

/** Primer tamaño (de mayor a menor, en pasos de 4 px) en que las líneas caben */
function fitLines(text: string, measure: MeasureText, width: (size: number) => number, max: number, min: number, twoLines: boolean): Fitted | null {
  for (let size = max; size >= min; size -= 4) {
    const lines = twoLines ? (splitTwo(text, measure, size) ?? [text]) : [text];
    if (lines.every((line) => measure(line, size) <= width(size))) return { size, lines };
  }
  return null;
}

/**
 * Tamaños y posiciones de la frase: achica la letra hasta que quepa en 900 px, parte el remate en
 * 2 líneas como máximo y centra el bloque entre y=280 y y=860.
 */
export function layoutPhrase(measure: MeasureText, phrase: PhraseText, scale = 1): PhraseLayout {
  const top = phrase.top.trim().toUpperCase();
  const highlight = phrase.highlight.trim().toUpperCase();
  const hMax = Math.round(HIGHLIGHT_SIZES.max * scale);
  const tMax = Math.round(TOP_SIZES.max * scale);
  const boxWidth = (size: number) => TEXT_MAX_W - 2 * size * BOX_PAD_X;
  const textWidth = () => TEXT_MAX_W;

  // Remate: una línea si cabe grande; si no, dos líneas; en el peor caso, lo que quepa
  const hl: Fitted = highlight
    ? (fitLines(highlight, measure, boxWidth, hMax, Math.min(hMax, HIGHLIGHT_SIZES.oneLineMin), false) ??
      fitLines(highlight, measure, boxWidth, hMax, HIGHLIGHT_SIZES.min, true) ??
      fitLines(highlight, measure, boxWidth, HIGHLIGHT_SIZES.min, 20, true) ?? { size: 20, lines: splitTwo(highlight, measure, 20) ?? [highlight] })
    : { size: 0, lines: [] };

  // Arriba: una línea si cabe a buen tamaño; si no, dos
  const tp: Fitted | null = top
    ? (fitLines(top, measure, textWidth, tMax, Math.max(TOP_SIZES.min, Math.round(70 * scale)), false) ??
      fitLines(top, measure, textWidth, tMax, TOP_SIZES.min, true) ?? { size: TOP_SIZES.min, lines: splitTwo(top, measure, TOP_SIZES.min) ?? [top] })
    : null;

  const topHeight = tp ? tp.lines.length * tp.size * TOP_LINE_H + (hl.lines.length ? TOP_GAP : 0) : 0;
  const boxH = Math.round(hl.size * BOX_H);
  const height = topHeight + hl.lines.length * boxH + Math.max(0, hl.lines.length - 1) * BOX_GAP;
  // Si no cabe en el bloque, se achica todo un poco y se vuelve a armar
  if (height > BLOCK_BOTTOM - BLOCK_TOP && scale > 0.4) return layoutPhrase(measure, phrase, scale * 0.9);

  let y = BLOCK_TOP + Math.max(0, (BLOCK_BOTTOM - BLOCK_TOP - height) / 2);
  const start = y;
  const topLines: PhraseLayout["topLines"] = [];
  if (tp) {
    for (const text of tp.lines) {
      topLines.push({ text, y: y + (tp.size * TOP_LINE_H) / 2 });
      y += tp.size * TOP_LINE_H;
    }
    if (hl.lines.length) y += TOP_GAP;
  }
  const boxes = hl.lines.map((text, i) => {
    const w = Math.min(TEXT_MAX_W, measure(text, hl.size) + 2 * hl.size * BOX_PAD_X);
    if (i > 0) y += BOX_GAP;
    const box = { text, x: (OUT_W - w) / 2, y, w, h: boxH };
    y += boxH;
    return box;
  });
  return { topSize: tp?.size ?? 0, topLines, highlightSize: hl.size, boxes, top: start, bottom: y };
}

async function toBitmap(background: Blob | string): Promise<ImageBitmap> {
  const blob = typeof background === "string" ? await (await fetch(background)).blob() : background;
  return createImageBitmap(blob);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo armar la miniatura."))), "image/jpeg", quality)
  );
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fondo (en modo "cover") + frase con el estilo de los Shorts → JPG 1080×1920 de hasta 2 MB */
export async function composeThumbnail(background: Blob | string, phrase: PhraseText, baseName = "short"): Promise<File> {
  await loadShortFonts();
  const image = await toBitmap(background);
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede armar la miniatura.");

  const scale = Math.max(OUT_W / image.width, OUT_H / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
  image.close?.();

  const measure: MeasureText = (text, size) => {
    ctx.font = `${size}px ${POP_FONT}`;
    return ctx.measureText(text).width;
  };
  const layout = layoutPhrase(measure, phrase);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  if (layout.topLines.length) {
    ctx.font = `${layout.topSize}px ${POP_FONT}`;
    // El trazo va centrado en el borde: 20 px dejan ~10 px de negro por fuera
    ctx.lineWidth = 20;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    for (const line of layout.topLines) {
      ctx.strokeText(line.text, OUT_W / 2, line.y);
      ctx.fillText(line.text, OUT_W / 2, line.y);
    }
  }

  ctx.font = `${layout.highlightSize}px ${POP_FONT}`;
  for (const box of layout.boxes) {
    ctx.fillStyle = YELLOW;
    roundedRect(ctx, box.x, box.y, box.w, box.h, box.h * 0.18);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillText(box.text, OUT_W / 2, box.y + box.h / 2 + box.h * 0.03);
  }

  let blob = await canvasToJpeg(canvas, 0.9);
  if (blob.size > MAX_THUMBNAIL_BYTES) blob = await canvasToJpeg(canvas, 0.8);
  return new File([blob], `${baseName}-miniatura.jpg`, { type: "image/jpeg" });
}

/** Descarga un archivo desde el navegador */
export function downloadFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------- Ficha local (IndexedDB, sin imágenes) + archivos en la carpeta del PC ----------

export interface ThumbnailRecord {
  planId: string;
  phrases: ThumbnailPhrase[];
  recommended: number;
  phrase: PhraseText;
  scene: string;
  conceptEs: string;
  /** Subcarpeta y archivo del JPG final */
  path?: [string, string];
  /** Subcarpeta y archivo del fondo sin texto (para cambiar la frase sin volver a pagar) */
  bgPath?: [string, string];
  createdAt: string;
}

export interface StoredThumbnail extends ThumbnailRecord {
  /** null si el archivo ya no está en la carpeta o falta el permiso */
  file: File | null;
  background: File | null;
}

const thumbKey = (projectId: string, planId: string) => `${projectId}:thumb:${planId}`;

/** Nombre base de los archivos: el del render si existe; si no, el título del plan */
export function thumbnailBaseName(plan: Pick<ShortPlan, "title">, render?: StoredRender | null): string {
  if (render) return render.file.name.replace(/\.[^.]+$/, "");
  return safeName(plan.title || "short");
}

/** Guarda el JPG final y el fondo en "<carpeta>/<proyecto>/" y la ficha en el navegador */
export async function saveThumbnail(
  project: ShortsProject,
  planId: string,
  data: Omit<ThumbnailRecord, "planId" | "path" | "bgPath" | "createdAt">,
  files: { final: File; background: Blob },
  folder: FileSystemDirectoryHandle
): Promise<StoredThumbnail> {
  const sub = safeName(project.name);
  const dir = await folder.getDirectoryHandle(sub, { create: true });
  const bgName = files.final.name.replace(/-miniatura\.jpg$/, "-miniatura-fondo.jpg");
  await writeFile(dir, files.final.name, files.final);
  await writeFile(dir, bgName, files.background);
  const record: ThumbnailRecord = {
    planId,
    phrases: data.phrases,
    recommended: data.recommended,
    phrase: { top: data.phrase.top, highlight: data.phrase.highlight },
    scene: data.scene,
    conceptEs: data.conceptEs,
    path: [sub, files.final.name],
    bgPath: [sub, bgName],
    createdAt: new Date().toISOString(),
  };
  await tx([FILES], "readwrite", (t) => {
    t.objectStore(FILES).put(record, thumbKey(project.id, planId));
    return () => undefined;
  });
  const background = files.background instanceof File ? files.background : new File([files.background], bgName, { type: "image/jpeg" });
  return { ...record, file: files.final, background };
}

/** Fichas de las miniaturas del proyecto, con sus archivos si siguen en la carpeta */
export async function loadThumbnails(project: ShortsProject, folder: FileSystemDirectoryHandle | null): Promise<Record<string, StoredThumbnail>> {
  const records = await tx([FILES], "readonly", (t) => {
    const reqs = project.plans.map((p) => t.objectStore(FILES).get(thumbKey(project.id, p.id)) as IDBRequest<ThumbnailRecord | undefined>);
    return () => reqs.map((r) => r.result ?? null);
  });
  const canRead = folder ? await hasAccess(folder, "readwrite").catch(() => false) : false;
  const read = async (path?: [string, string]) => {
    if (!path || !folder || !canRead) return null;
    try {
      const dir = await folder.getDirectoryHandle(path[0]);
      return await (await dir.getFileHandle(path[1])).getFile();
    } catch {
      // Lo borraste o moviste de la carpeta
      return null;
    }
  };
  const out: Record<string, StoredThumbnail> = {};
  for (const rec of records) {
    if (!rec) continue;
    const [file, background] = await Promise.all([read(rec.path), read(rec.bgPath)]);
    out[rec.planId] = { ...rec, file, background };
  }
  return out;
}

/** Frases ya usadas ("arriba remate") para que la IA no las repita */
export const phraseText = (p: PhraseText) => [p.top, p.highlight].filter(Boolean).join(" ").trim();
