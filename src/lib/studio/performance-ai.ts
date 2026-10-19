// ============================================
// VEXA Content Studio - Rendimiento: IA (flujo de n8n "VEXA Studio · Rendimiento IA")
// ============================================
// Dos agentes con criterio de estratega de YouTube (prompts en n8n):
//   diagnose  · por qué un video rindió como rindió: empaque, gancho, tema, estructura y retención,
//               con hipótesis que citan la métrica que las respalda.
//   replicate · el ADN del video (tipo de curiosidad, promesa, esqueleto, emoción) y 3 ángulos que
//               PROFUNDIZAN el tema sin copiarlo, más el plan para aprovechar la ola (Shorts, comentario, playlist).
// Cada resultado queda en studio_video_insights. Las réplicas guardan qué video salió de ellas: esa
// bitácora vuelve a la IA como "historial de aciertos", así aprende lo que funciona en ESTE canal.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ChannelProfile } from "./ai";
import {
  hookSecond,
  ratioLabel,
  retentionAt,
  retentionMoments,
  TZ_US,
  WEEKDAY_LABELS,
  zonedParts,
  type VideoFormat,
} from "./performance";
import type { DeepDetail, PerfVideo } from "./performance-data";
import type { Cue } from "./subtitles";

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const PERFORMANCE_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_PERFORMANCE || "/webhook/vexa-studio/performance";

const db = supabase as unknown as SupabaseClient;

// ---------- Lo que devuelve la IA ----------

export type Trigger = "curiosidad" | "morbo" | "injusticia" | "miedo" | "ironia" | "tabu" | "identidad" | "asombro" | "conflicto" | "polemica";

export const TRIGGER_LABELS: Record<Trigger, string> = {
  curiosidad: "Curiosidad",
  morbo: "Morbo",
  injusticia: "Injusticia",
  miedo: "Miedo",
  ironia: "Ironía",
  tabu: "Tabú",
  identidad: "Identidad (tú en la historia)",
  asombro: "Asombro",
  conflicto: "Conflicto",
  polemica: "Polémica",
};

export type HookType = "pregunta" | "dato_impactante" | "contradiccion" | "en_medias_res" | "amenaza" | "promesa" | "tu_en_la_historia" | "secreto";

export const HOOK_LABELS: Record<HookType, string> = {
  pregunta: "Pregunta",
  dato_impactante: "Dato impactante",
  contradiccion: "Contradicción",
  en_medias_res: "En medio de la acción",
  amenaza: "Amenaza / peligro",
  promesa: "Promesa",
  tu_en_la_historia: "Tú en la historia",
  secreto: "Secreto revelado",
};

export type Confidence = "alta" | "media" | "baja";

export interface Diagnosis {
  verdict_es: string;
  performance_read_es: string;
  sample_warning_es: string;
  packaging: {
    trigger: Trigger;
    title_formula_es: string;
    promise_es: string;
    score: number;
    analysis_es: string;
    title_alternatives: string[];
  };
  hook: {
    quote: string;
    hook_type: HookType;
    confirms_click: boolean;
    sets_stakes: boolean;
    opens_loop: boolean;
    score: number;
    analysis_es: string;
    rewrite: string;
  };
  topic: {
    core_topic_es: string;
    emotional_driver: Trigger;
    audience_identity_es: string;
    why_it_resonates_es: string;
    score: number;
  };
  structure: {
    beats: { at_s: number; beat_es: string; purpose_es: string }[];
    rehooks: number;
    payoff_timing_es: string;
    score: number;
    analysis_es: string;
  };
  retention_events: { at_s: number; type: "caida" | "pico" | "meseta"; quote: string; cause_es: string; fix_es: string }[];
  hypotheses: { claim_es: string; evidence_es: string; confidence: Confidence; test_es: string }[];
  timing_es: string;
  repeat_es: string[];
  avoid_es: string[];
}

export interface ReplicaAngle {
  name_es: string;
  premise_es: string;
  why_deeper_es: string;
  titles: string[];
  thumbnail: { concept_es: string; text: string; composition_es: string };
  hook_script: string;
  outline: { mark: string; beat_es: string; rehook: string }[];
  research_es: string[];
  difference: { changes_es: string; overlap_risk: "bajo" | "medio" | "alto"; why_not_repetitive_es: string };
  prediction: { ratio_min: number; ratio_max: number; rationale_es: string };
}

export type ShortSource = "video_largo" | "recorte_short" | "secuela";

export const SHORT_SOURCE_LABELS: Record<ShortSource, string> = {
  video_largo: "Del video largo original (Fábrica de Shorts)",
  recorte_short: "Recorte nuevo del video largo para el Short viral",
  secuela: "De la secuela, cuando la grabemos",
};

export interface Replica {
  dna: {
    curiosity_type: Trigger;
    title_promise_es: string;
    skeleton_es: string[];
    emotion: Trigger;
    audience_identity_es: string;
    what_made_it_work_es: string;
  };
  angles: ReplicaAngle[];
  recommended_angle: number;
  recommended_reason_es: string;
  wave_plan_es: string[];
  shorts_plan: { source: ShortSource; why_es: string; moments_es: string[]; factory_notes: string };
  pinned_comment: string;
  playlist: { title: string; description: string; why_es: string };
  publish_es: string;
}

// ---------- Contexto que se le manda ----------

export interface AnalysisContext {
  accountId: string;
  profile: ChannelProfile;
  video: PerfVideo;
  detail: DeepDetail | null;
  cues: Cue[] | null;
  /** Todos los videos del canal (para comparar y para el historial) */
  all: PerfVideo[];
  insights: Insight[];
  /** Horario recomendado (EE. UU. y Chile) para que la IA proponga cuándo publicar */
  schedule: string;
}

const round = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);

function transcriptForAi(cues: Cue[], max = 60_000): string {
  const text = cues.map((c) => `[${c.start.toFixed(1)}-${c.end.toFixed(1)}] ${c.text}`).join("\n");
  return text.length > max ? `${text.slice(0, max)}\n[…]` : text;
}

function quoteAt(cues: Cue[] | null, seconds: number): string {
  if (!cues?.length) return "";
  const cue = cues.find((c) => c.end >= seconds) ?? cues[cues.length - 1];
  const i = cues.indexOf(cue);
  return cues
    .slice(Math.max(0, i - 1), i + 2)
    .map((c) => c.text)
    .join(" ")
    .slice(0, 240);
}

/** Datos duros para que la IA no opine en el aire */
function buildPayload(ctx: AnalysisContext) {
  const { video, detail, cues, all } = ctx;
  const peers = all.filter((v) => v.format === video.format && v.id !== video.id);
  const med = (pick: (v: PerfVideo) => number | null) => {
    const values = peers.map(pick).filter((n): n is number => n !== null && Number.isFinite(n)).sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : null;
  };
  const retention = detail?.retention ?? [];
  const hookS = hookSecond(video.format);
  const published = new Date(video.publishedAt);
  const us = zonedParts(published, TZ_US);
  const ranked = [...peers].filter((v) => v.ratio !== null).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  const describe = (v: PerfVideo) => ({
    title: v.title,
    ratio: round(v.ratio),
    views: v.views,
    avg_view_pct: round(v.avgViewPercentage),
    duration_s: v.durationSeconds,
  });
  const byId = new Map(all.map((v) => [v.id, v]));
  const trackRecord = ctx.insights
    .filter((i) => i.kind === "replica" && i.resultVideoId)
    .slice(0, 8)
    .map((i) => {
      const data = i.data as Replica;
      const angle = data.angles?.[data.recommended_angle] ?? data.angles?.[0];
      const result = byId.get(i.resultVideoId as string);
      return {
        source_video: i.videoTitle,
        angle: angle?.name_es ?? "",
        predicted_ratio: angle ? `${angle.prediction.ratio_min}-${angle.prediction.ratio_max}` : "",
        result_title: i.resultVideoTitle ?? "",
        actual_ratio: round(result?.ratio ?? null),
      };
    });

  return {
    format: video.format,
    language: ctx.profile.language || "en",
    profile: ctx.profile,
    video: {
      title: video.title,
      description: video.description.slice(0, 3000),
      tags: video.tags.slice(0, 30),
      duration_s: video.durationSeconds,
      published_us_et: `${WEEKDAY_LABELS[us.weekday]} ${String(us.hour).padStart(2, "0")}:${String(us.minute).padStart(2, "0")} ET`,
      age_days: Math.round((Date.now() - published.getTime()) / 86_400_000),
    },
    metrics: {
      views: video.views,
      ratio_vs_channel: round(video.ratio),
      ratio_day: video.ratioDay + 1,
      ratio_28d: round(video.ratio28),
      views_day1: video.cum[0] ?? null,
      views_day3: video.cum[2] ?? null,
      views_day7: video.cum[6] ?? null,
      views_day28: video.cum[27] ?? null,
      avg_view_pct: round(video.avgViewPercentage),
      avg_view_duration_s: round(video.avgViewDuration, 0),
      subs_gained: video.subscribersGained,
      subs_per_1000_views: video.views && video.subscribersGained !== null ? round((video.subscribersGained / video.views) * 1000) : null,
      likes_per_1000_views: video.views ? round((video.likes / video.views) * 1000) : null,
      comments_per_1000_views: video.views ? round((video.comments / video.views) * 1000) : null,
      shares: video.shares,
      impressions: detail?.impressions ?? null,
      ctr_pct: detail?.ctr ?? null,
      [`retention_at_${hookS}s_pct`]: round(retentionAt(retention, hookS, video.durationSeconds)),
      retention_at_60s_pct: video.format === "video" ? round(retentionAt(retention, 60, video.durationSeconds)) : null,
      retention_end_pct: retention.length ? round(retention[retention.length - 1].percent) : null,
      relative_retention_median: (() => {
        const rel = retention.map((p) => p.relative).filter((n): n is number => n !== null);
        return rel.length ? round(rel.sort((a, b) => a - b)[Math.floor(rel.length / 2)], 2) : null;
      })(),
      traffic: (detail?.traffic ?? []).slice(0, 6).map((t) => `${t.label} ${Math.round(t.share * 100)}%`),
      countries: (detail?.countries ?? []).map((c) => `${c.country} ${Math.round(c.share * 100)}%`),
    },
    channel_medians: {
      videos_compared: peers.length,
      avg_view_pct: round(med((v) => v.avgViewPercentage)),
      views_day7: med((v) => v.cum[6] ?? null),
      subs_per_1000_views: round(med((v) => (v.views && v.subscribersGained !== null ? (v.subscribersGained / v.views) * 1000 : null))),
    },
    retention_curve: retention
      .filter((_, i) => i % 5 === 0)
      .map((p) => `${Math.round(p.ratio * video.durationSeconds)}s ${round(p.percent)}%${p.relative !== null ? ` (rel ${round(p.relative, 2)})` : ""}`),
    retention_moments: retentionMoments(retention, video.durationSeconds).map((m) => ({
      at_s: m.at,
      type: m.type,
      change_pts: round(m.change),
      quote: quoteAt(cues, m.at),
    })),
    best_videos: ranked.slice(0, 5).map(describe),
    worst_videos: ranked.slice(-4).reverse().map(describe),
    track_record: trackRecord,
    schedule: ctx.schedule,
    transcript: cues?.length ? transcriptForAi(cues) : "",
  };
}

async function sessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return token;
}

async function callPerformanceAi<T>(stage: "diagnose" | "replicate", payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${N8N_BASE_URL}${PERFORMANCE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: await sessionToken(), stage, ...payload }),
  });
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `n8n respondió ${res.status}`);
  return body.result as T;
}

// ---------- Bitácora (studio_video_insights) ----------

export interface Insight {
  id: string;
  videoId: string;
  videoTitle: string;
  isShort: boolean;
  kind: "diagnostico" | "replica";
  data: Diagnosis | Replica;
  resultVideoId: string | null;
  resultVideoTitle: string | null;
  createdAt: string;
}

interface InsightRow {
  id: string;
  video_id: string;
  video_title: string;
  is_short: boolean;
  kind: Insight["kind"];
  data: Diagnosis | Replica;
  result_video_id: string | null;
  result_video_title: string | null;
  created_at: string;
}

const fromRow = (r: InsightRow): Insight => ({
  id: r.id,
  videoId: r.video_id,
  videoTitle: r.video_title,
  isShort: r.is_short,
  kind: r.kind,
  data: r.data,
  resultVideoId: r.result_video_id,
  resultVideoTitle: r.result_video_title,
  createdAt: r.created_at,
});

export async function loadInsights(accountId: string): Promise<Insight[]> {
  const { data, error } = await db
    .from("studio_video_insights")
    .select("id, video_id, video_title, is_short, kind, data, result_video_id, result_video_title, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data as InsightRow[]).map(fromRow);
}

async function saveInsight(accountId: string, video: PerfVideo, kind: Insight["kind"], data: Diagnosis | Replica): Promise<Insight> {
  const { data: row, error } = await db
    .from("studio_video_insights")
    .insert({ account_id: accountId, video_id: video.id, video_title: video.title, is_short: video.format === "short", kind, data })
    .select("id, video_id, video_title, is_short, kind, data, result_video_id, result_video_title, created_at")
    .single();
  if (error) throw error;
  return fromRow(row as InsightRow);
}

export async function linkReplicaResult(id: string, video: { id: string; title: string } | null): Promise<void> {
  const { error } = await db
    .from("studio_video_insights")
    .update({ result_video_id: video?.id ?? null, result_video_title: video?.title ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInsight(id: string): Promise<void> {
  const { error } = await db.from("studio_video_insights").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Acciones ----------

export async function diagnoseVideo(ctx: AnalysisContext): Promise<Insight> {
  const result = await callPerformanceAi<Diagnosis>("diagnose", buildPayload(ctx));
  return saveInsight(ctx.accountId, ctx.video, "diagnostico", result);
}

export async function replicateVideo(ctx: AnalysisContext, diagnosis: Diagnosis | null, guidance: string): Promise<Insight> {
  const result = await callPerformanceAi<Replica>("replicate", { ...buildPayload(ctx), diagnosis, guidance: guidance.slice(0, 2000) });
  return saveInsight(ctx.accountId, ctx.video, "replica", result);
}

// ---------- Brief para producirlo con Claude ----------

const FORMAT_NAMES: Record<VideoFormat, string> = { video: "video largo", short: "Short" };

/** Brief en Markdown listo para pegar en la sesión de Claude que investiga y escribe el guion */
export function replicaBrief(insight: Insight, video: Pick<PerfVideo, "id" | "title" | "ratio" | "views" | "format"> | null, angleIndex?: number): string {
  const r = insight.data as Replica;
  const idx = angleIndex ?? r.recommended_angle ?? 0;
  const a = r.angles[idx] ?? r.angles[0];
  const format = video?.format ?? (insight.isShort ? "short" : "video");
  const lines = [
    `# Brief: ${a.name_es}`,
    "",
    `Quiero producir un ${FORMAT_NAMES[format]} que profundice el tema de un video que está rindiendo sobre lo normal en mi canal. Usa mi proceso de siempre (investigar en libros y fuentes primarias, validar cada dato, guion, producción). Este brief viene del análisis de rendimiento de VEXA: respeta el esqueleto y la emoción, pero NO copies el video original.`,
    "",
    "## Video de referencia",
    `- "${insight.videoTitle}" — https://youtu.be/${insight.videoId}`,
    video ? `- ${video.views.toLocaleString("es-CL")} vistas · ${ratioLabel(video.ratio)} sobre lo normal del canal` : "",
    "",
    "## ADN que funcionó (mantener)",
    `- Gatillo de curiosidad: ${TRIGGER_LABELS[r.dna.curiosity_type] ?? r.dna.curiosity_type} · emoción dominante: ${TRIGGER_LABELS[r.dna.emotion] ?? r.dna.emotion}`,
    `- Promesa del título: ${r.dna.title_promise_es}`,
    `- Identidad del espectador: ${r.dna.audience_identity_es}`,
    `- Por qué funcionó: ${r.dna.what_made_it_work_es}`,
    "- Esqueleto:",
    ...r.dna.skeleton_es.map((s, i) => `  ${i + 1}. ${s}`),
    "",
    `## Ángulo elegido: ${a.name_es}`,
    a.premise_es,
    "",
    `**Por qué va más hondo:** ${a.why_deeper_es}`,
    "",
    "### Títulos",
    ...a.titles.map((t) => `- ${t}`),
    "",
    "### Miniatura",
    `- Concepto: ${a.thumbnail.concept_es}`,
    `- Texto: "${a.thumbnail.text}"`,
    `- Composición: ${a.thumbnail.composition_es}`,
    "",
    "### Gancho (narración)",
    `> ${a.hook_script.replace(/\n/g, "\n> ")}`,
    "",
    "### Esqueleto con re-ganchos",
    ...a.outline.map((o) => `- **${o.mark}** — ${o.beat_es}${o.rehook ? `\n  - Re-gancho: "${o.rehook}"` : ""}`),
    "",
    "### Qué investigar (verificar todo con fuentes)",
    ...a.research_es.map((s) => `- ${s}`),
    "",
    "### Chequeo de diferencia (contenido original, no repetido)",
    `- Qué cambia: ${a.difference.changes_es}`,
    `- Riesgo de parecerse demasiado: ${a.difference.overlap_risk}`,
    `- ${a.difference.why_not_repetitive_es}`,
    "",
    `### Meta: ${a.prediction.ratio_min}x–${a.prediction.ratio_max}x lo normal del canal`,
    a.prediction.rationale_es,
    "",
    "## Aprovechar la ola",
    ...r.wave_plan_es.map((s, i) => `${i + 1}. ${s}`),
    "",
    `**Shorts:** ${SHORT_SOURCE_LABELS[r.shorts_plan.source]}. ${r.shorts_plan.why_es}`,
    ...r.shorts_plan.moments_es.map((s) => `- ${s}`),
    "",
    `**Comentario fijado:** ${r.pinned_comment}`,
    `**Playlist:** ${r.playlist.title} — ${r.playlist.description}`,
    `**Publicación:** ${r.publish_es}`,
    "",
    "## Otros ángulos posibles",
    ...r.angles.filter((_, i) => i !== idx).map((o) => `- **${o.name_es}**: ${o.premise_es} (títulos: ${o.titles.slice(0, 2).join(" / ")})`),
  ];
  return lines.filter((l, i, all) => !(l === "" && all[i - 1] === "")).join("\n");
}

// ---------- Fábrica de Shorts en "modo ola" ----------

const WAVE_KEY = "vexa_studio_shorts_wave";

export interface ShortsWave {
  name: string;
  notes: string;
  relatedVideoId: string | null;
}

export function setShortsWave(wave: ShortsWave) {
  try {
    sessionStorage.setItem(WAVE_KEY, JSON.stringify(wave));
  } catch {
    // Sin almacenamiento: la Fábrica abre sin datos precargados
  }
}

export function takeShortsWave(): ShortsWave | null {
  try {
    const raw = sessionStorage.getItem(WAVE_KEY);
    sessionStorage.removeItem(WAVE_KEY);
    return raw ? (JSON.parse(raw) as ShortsWave) : null;
  } catch {
    return null;
  }
}
