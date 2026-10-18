// ============================================
// VEXA Content Studio - Subtítulos (.srt / .vtt)
// ============================================
// Los subtítulos que el creador ya tiene reemplazan a la transcripción: la IA lee el texto con sus tiempos
// (para los capítulos) y, al publicar, el mismo archivo se sube a YouTube como pista de subtítulos.

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** "00:01:02,345" | "01:02.345" -> segundos */
function toSeconds(stamp: string): number {
  const parts = stamp.trim().replace(",", ".").split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Lee SRT o WebVTT. Ignora numeración, encabezados y etiquetas de estilo. */
export function parseSubtitles(raw: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = raw.replace(/^﻿/, "").replace(/\r/g, "").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx === -1) continue;
    const [a, b] = lines[timeIdx].split("-->");
    const text = lines
      .slice(timeIdx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    cues.push({ start: toSeconds(a), end: toSeconds(b.trim().split(/\s+/)[0]), text });
  }
  return cues;
}

/** 125 -> "2:05" (formato de capítulos de YouTube) */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Texto compacto para la IA: una línea por subtítulo con su minuto */
export function cuesToTranscript(cues: Cue[]): string {
  return cues.map((c) => `[${formatTimestamp(c.start)}] ${c.text}`).join("\n");
}

export function isSubtitleFile(file: File): boolean {
  return /\.(srt|vtt)$/i.test(file.name);
}
