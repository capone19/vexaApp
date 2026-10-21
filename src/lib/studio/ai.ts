// ============================================
// VEXA Content Studio - IA de metadatos (flujo de n8n "VEXA Studio · IA de metadatos")
// ============================================
// n8n valida la sesión de Supabase del usuario antes de gastar en OpenAI, así que cada pedido lleva
// el access_token de la sesión. Supabase solo se usa para leer el perfil del canal (columna ai_profile).

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AudioChunk } from "./media";
import type { Cue } from "./subtitles";

export const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const METADATA_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_METADATA || "/webhook/vexa-studio/metadata";
const TRANSCRIBE_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_TRANSCRIBE || "/webhook/vexa-studio/transcribe";
const TRANSLATE_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_TRANSLATE || "/webhook/vexa-studio/translate";

// Las tablas del Studio aún no están en los tipos generados de Supabase
const db = supabase as unknown as SupabaseClient;

export const LANGUAGES: Record<string, string> = {
  en: "Inglés",
  es: "Español",
  pt: "Portugués",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  hi: "Hindi",
  id: "Indonesio",
};

export const YOUTUBE_CATEGORIES: Record<string, string> = {
  "27": "Educación",
  "24": "Entretenimiento",
  "22": "Personas y blogs",
  "23": "Comedia",
  "26": "Consejos y estilo",
  "28": "Ciencia y tecnología",
  "1": "Cine y animación",
};

/** Perfil de estilo del canal, guardado en studio_accounts.ai_profile */
export interface ChannelProfile {
  language: string;
  niche: string;
  tone: string;
  audience: string;
  cta: string;
  example_titles: string[];
  /** Idiomas a los que se traducen título y descripción al publicar */
  localize_to: string[];
  category_id: string;
}

export const EMPTY_PROFILE: ChannelProfile = {
  language: "en",
  niche: "",
  tone: "",
  audience: "",
  cta: "",
  example_titles: [],
  localize_to: [],
  category_id: "27",
};

export function normalizeProfile(raw: unknown): ChannelProfile {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<ChannelProfile>;
  return {
    ...EMPTY_PROFILE,
    ...p,
    example_titles: Array.isArray(p.example_titles) ? p.example_titles.filter(Boolean) : [],
    localize_to: Array.isArray(p.localize_to) ? p.localize_to.filter((l) => l in LANGUAGES) : [],
  };
}

export async function saveChannelProfile(accountId: string, profile: ChannelProfile) {
  const { error } = await db.from("studio_accounts").update({ ai_profile: profile }).eq("id", accountId);
  if (error) throw error;
}

export interface TitleOption {
  text: string;
  angle: "curiosity" | "controversy" | "stakes";
  why: string;
  /** El mismo título en cada idioma de traducción del canal */
  localized_titles: { lang: string; title: string }[];
}

export interface Localization {
  lang: string;
  title: string;
  description: string;
}

export interface GeneratedMetadata {
  ok: true;
  language: string;
  titles: TitleOption[];
  thumbnail_text: string[];
  description: string;
  tags: string[];
  hashtags: string[];
  pinned_comment: string;
  localizations: Localization[];
  notes_es: string;
}

export const ANGLE_LABELS: Record<TitleOption["angle"], string> = {
  curiosity: "Curiosidad",
  controversy: "Polémica",
  stakes: "Impacto",
};

export async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return token;
}

export async function readResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `n8n respondió ${res.status}`);
  return body as T;
}

export interface GenerateInput {
  language: string;
  format: "video" | "short";
  transcript: string;
  durationSeconds?: number;
  notes?: string;
  frames?: string[];
  profile: ChannelProfile;
  channelName?: string;
  localizeTo: string[];
  current?: { title?: string; description?: string };
}

export async function generateMetadata(input: GenerateInput): Promise<GeneratedMetadata> {
  const res = await fetch(`${N8N_BASE_URL}${METADATA_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: await accessToken(),
      language: input.language,
      format: input.format,
      transcript: input.transcript,
      duration_seconds: input.durationSeconds ?? null,
      notes: input.notes ?? "",
      frames: input.frames ?? [],
      profile: { ...input.profile, channel_name: input.channelName },
      localize_to: input.localizeTo,
      current: input.current ?? {},
    }),
  });
  return readResponse<GeneratedMetadata>(res);
}

/** Transcribe los trozos de audio uno por uno (solo cuando el video no trae subtítulos) */
export async function transcribeAudio(chunks: AudioChunk[], onProgress?: (done: number, total: number) => void): Promise<Cue[]> {
  const token = await accessToken();
  const cues: Cue[] = [];
  for (const [i, chunk] of chunks.entries()) {
    onProgress?.(i, chunks.length);
    const form = new FormData();
    form.append("access_token", token);
    form.append("offset", String(chunk.offset));
    form.append("audio", chunk.blob, `audio-${i}.wav`);
    const res = await fetch(`${N8N_BASE_URL}${TRANSCRIBE_PATH}`, { method: "POST", body: form });
    const body = await readResponse<{ segments: Cue[] }>(res);
    cues.push(...body.segments);
  }
  onProgress?.(chunks.length, chunks.length);
  return cues;
}

/** Traducción con IA: al español por defecto (respaldo del traductor del navegador) o al idioma indicado */
export async function translateWithAi(texts: string[], target = "es"): Promise<string[]> {
  const res = await fetch(`${N8N_BASE_URL}${TRANSLATE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: await accessToken(), texts, target }),
  });
  const body = await readResponse<{ translations: string[] }>(res);
  return body.translations;
}
