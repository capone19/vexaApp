// ============================================
// VEXA Content Studio - Fábrica de Shorts (reciclando el video largo)
// ============================================
// La IA (flujo de n8n "vexa-studio/shorts") trabaja en dos pasadas sobre los subtítulos:
//   1. explorador: propone 8-10 momentos candidatos
//   2. crítico + editor: los puntúa con la rúbrica, se queda con los mejores y escribe para cada uno
//      un guion de edición (cortes, efectos, sonidos, música, textos) que este motor ejecuta tal cual.
// El render corre en el navegador (shorts-render.ts): el video largo nunca sale de este PC.
// Los proyectos y los Shorts renderizados se guardan en IndexedDB, no en Supabase.

import { supabase } from "@/integrations/supabase/client";
import type { ChannelProfile } from "./ai";
import { sourceForAi, toIdeaCheck, toSourceStatus, type IdeaCheck, type IdeaSource, type SourceStatus } from "./short-ideas";
import type { Cue } from "./subtitles";
import type { RelatedVideo } from "./video-tasks";

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "https://n8ninnovatec-n8n.t0bgq1.easypanel.host";
const SHORTS_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_SHORTS || "/webhook/vexa-studio/shorts";

// ---------- Vocabulario de edición ----------

export type VisualFx = "punch_in" | "slow_zoom" | "bw" | "freeze" | "text_pop" | "shake" | "flash" | "glitch" | "dark";
export type SfxKind = "whoosh" | "impact" | "boom" | "hit" | "riser" | "reverse" | "ticking" | "heartbeat" | "glitch" | "camera";
export type MusicMood = "curiosidad" | "misterio" | "tension" | "epica" | "ninguna";
export type ShortLayout = "clasico" | "completo";

export const FX_LABELS: Record<VisualFx, string> = {
  punch_in: "Zoom de impacto",
  slow_zoom: "Zoom lento",
  bw: "Blanco y negro",
  freeze: "Congelado",
  text_pop: "Texto gigante",
  shake: "Vibración",
  flash: "Destello",
  glitch: "Glitch",
  dark: "Oscurecer",
};

export const SFX_LABELS: Record<SfxKind, string> = {
  whoosh: "Whoosh",
  impact: "Golpe",
  boom: "Boom grave",
  hit: "Golpe suave",
  riser: "Subida de tensión",
  reverse: "Platillo invertido",
  ticking: "Reloj",
  heartbeat: "Latido",
  glitch: "Glitch",
  camera: "Cámara",
};

export const MOOD_LABELS: Record<MusicMood, string> = {
  curiosidad: "Curiosidad",
  misterio: "Misterio",
  tension: "Tensión",
  epica: "Épica",
  ninguna: "Sin música",
};

export const SFX_KINDS = Object.keys(SFX_LABELS) as SfxKind[];
export const MUSIC_MOODS = (Object.keys(MOOD_LABELS) as MusicMood[]).filter((m) => m !== "ninguna");

// Duración permitida de cada efecto (segundos)
const FX_RANGE: Record<VisualFx, [number, number]> = {
  punch_in: [0.4, 3],
  slow_zoom: [2, 10],
  bw: [1, 6],
  freeze: [0.4, 1.5],
  text_pop: [0.6, 2.5],
  shake: [0.2, 1],
  flash: [0.1, 0.5],
  glitch: [0.15, 0.6],
  dark: [1.5, 8],
};

// ---------- Rúbrica ----------

export interface ShortScore {
  hook: number;
  standalone: number;
  curiosity: number;
  emotion: number;
  payoff: number;
  loop: number;
  pacing: number;
}

export const SCORE_WEIGHTS: Record<keyof ShortScore, number> = {
  hook: 2.5,
  standalone: 1.5,
  curiosity: 1.5,
  emotion: 1.5,
  payoff: 1.5,
  loop: 1,
  pacing: 0.5,
};

export const SCORE_LABELS: Record<keyof ShortScore, { label: string; help: string }> = {
  hook: { label: "Gancho", help: "Los primeros 1,5 s frenan el scroll" },
  standalone: { label: "Se entiende solo", help: "Alguien sin contexto lo entiende" },
  curiosity: { label: "Curiosidad", help: "Abre una pregunta que obliga a seguir viendo" },
  emotion: { label: "Intensidad", help: "Sorpresa, injusticia, miedo, asombro" },
  payoff: { label: "Remate", help: "Responde la pregunta o tiene un giro" },
  loop: { label: "Final / loop", help: "Termina en golpe o vuelve al inicio" },
  pacing: { label: "Ritmo", help: "Sin relleno, una sola idea" },
};

export function totalScore(score: ShortScore): number {
  return Math.round(
    (Object.keys(SCORE_WEIGHTS) as (keyof ShortScore)[]).reduce((sum, k) => sum + clamp(score[k] ?? 0, 0, 10) * SCORE_WEIGHTS[k], 0)
  );
}

// ---------- Plan de edición ----------

export interface ShortSegment {
  start: number;
  end: number;
}

export interface ShortEffect {
  id: string;
  type: VisualFx;
  /** segundo del video original */
  at: number;
  duration: number;
  text: string;
}

export interface ShortSfx {
  id: string;
  type: SfxKind;
  at: number;
}

export interface ShortMusic {
  mood: MusicMood;
  volume: number;
  /** segundos del original donde la música se corta un instante antes del remate */
  cuts: number[];
}

export interface ShortPlan {
  id: string;
  candidateIndex: number;
  title: string;
  hookText: string;
  endText: string;
  hookLine: string;
  segments: ShortSegment[];
  effects: ShortEffect[];
  sfx: ShortSfx[];
  music: ShortMusic;
  keywords: string[];
  score: ShortScore;
  rationale: string;
  editingNotes: string;
  description: string;
  hashtags: string[];
  pinnedComment: string;
  // Ajustes de render (los toca el creador)
  layout: ShortLayout;
  /** 0 = izquierda, 1 = derecha: qué parte del cuadro horizontal se ve en pantalla completa */
  focusX: number;
  /** Clásico: 1 = 16:9 completo, 1.33 = 4:3, 1.78 = cuadrado */
  videoZoom: number;
  /** Apagar efectos y sonidos sin perder el plan */
  effectsOn: boolean;
  captionsOn: boolean;
  /** Cambia cuando se edita el plan: invalida el render guardado */
  revision: number;
  /** Registro de ideas: parecido con lo ya hecho y lista de control (lo arma n8n) */
  idea?: IdeaCheck;
}

export interface ShortCandidate {
  index: number;
  start: number;
  end: number;
  hookLine: string;
  angle: string;
  hookStrength: number;
  summary: string;
  why: string;
  topic?: string;
}

export interface Discarded {
  candidateIndex: number;
  reason: string;
}

export const ANGLE_LABELS: Record<string, string> = {
  shock: "Impacto",
  injustice: "Injusticia",
  mystery: "Misterio",
  absurd: "Absurdo",
  conflict: "Conflicto",
  revelation: "Revelación",
  countdown: "Cuenta regresiva",
  emotional: "Emoción",
  awe: "Asombro",
};

export const MAX_SHORT_SECONDS = 59;

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pega un tiempo al borde de subtítulo más cercano (si hay uno a menos de `tolerance` s) */
function snap(time: number, edges: number[], tolerance = 0.6): number {
  let best = time;
  let bestDist = tolerance;
  for (const e of edges) {
    const d = Math.abs(e - time);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}

export function outputDuration(plan: Pick<ShortPlan, "segments" | "effects" | "effectsOn">): number {
  const base = plan.segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
  const freezes = plan.effectsOn ? plan.effects.filter((e) => e.type === "freeze").reduce((s, e) => s + e.duration, 0) : 0;
  return base + freezes;
}

const insideSegments = (at: number, segments: ShortSegment[]) => segments.some((s) => at >= s.start && at < s.end);

/** Ordena y valida lo que devolvió la IA (o lo que editó el creador) para que el motor nunca falle */
export function normalizePlan(raw: Partial<ShortPlan>, cues: Cue[], videoDuration: number): ShortPlan {
  const starts = cues.map((c) => c.start);
  const ends = cues.map((c) => c.end);
  let segments = (raw.segments ?? [])
    .map((s) => {
      const start = clamp(snap(Number(s.start), starts), 0, videoDuration);
      const end = clamp(snap(Number(s.end), ends), 0, videoDuration);
      return { start: round2(start), end: round2(end) };
    })
    .filter((s) => s.end - s.start >= 0.8);

  // Tope de duración: se recorta el final
  let total = 0;
  segments = segments.flatMap((s) => {
    const room = MAX_SHORT_SECONDS - 1.5 - total;
    if (room <= 0.8) return [];
    const end = Math.min(s.end, s.start + room);
    total += end - s.start;
    return [{ start: s.start, end: round2(end) }];
  });

  const effects: ShortEffect[] = (raw.effects ?? [])
    .filter((e) => e && e.type in FX_RANGE && insideSegments(Number(e.at), segments))
    .map((e) => {
      const [min, max] = FX_RANGE[e.type];
      return {
        id: e.id ?? uid(),
        type: e.type,
        at: round2(Number(e.at)),
        duration: round2(clamp(Number(e.duration), min, max)),
        text: e.type === "text_pop" ? String(e.text ?? "").toUpperCase().trim().slice(0, 28) : "",
      };
    })
    .filter((e) => e.type !== "text_pop" || e.text)
    .sort((a, b) => a.at - b.at);
  // Un solo congelado: más de uno corta demasiado la narración
  const firstFreeze = effects.find((e) => e.type === "freeze");
  const cleanEffects = effects.filter((e) => e.type !== "freeze" || e === firstFreeze);

  const sfx: ShortSfx[] = (raw.sfx ?? [])
    .filter((s) => s && SFX_KINDS.includes(s.type) && insideSegments(Number(s.at), segments))
    .map((s) => ({ id: s.id ?? uid(), type: s.type, at: round2(Number(s.at)) }))
    .sort((a, b) => a.at - b.at);

  const mood: MusicMood = raw.music?.mood && raw.music.mood in MOOD_LABELS ? raw.music.mood : "misterio";
  const score = raw.score ?? ({} as ShortScore);
  return {
    id: raw.id ?? uid(),
    candidateIndex: Number(raw.candidateIndex ?? -1),
    title: String(raw.title ?? "").slice(0, 100),
    hookText: String(raw.hookText ?? "").slice(0, 80),
    endText: String(raw.endText ?? "").slice(0, 40),
    hookLine: String(raw.hookLine ?? ""),
    segments,
    effects: cleanEffects,
    sfx,
    music: {
      mood,
      volume: clamp(Number(raw.music?.volume ?? 0.15), 0, 0.5),
      cuts: (raw.music?.cuts ?? []).map(Number).filter((c) => insideSegments(c, segments)).slice(0, 3),
    },
    keywords: (raw.keywords ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 12),
    score: {
      hook: clamp(Number(score.hook), 0, 10),
      standalone: clamp(Number(score.standalone), 0, 10),
      curiosity: clamp(Number(score.curiosity), 0, 10),
      emotion: clamp(Number(score.emotion), 0, 10),
      payoff: clamp(Number(score.payoff), 0, 10),
      loop: clamp(Number(score.loop), 0, 10),
      pacing: clamp(Number(score.pacing), 0, 10),
    },
    rationale: String(raw.rationale ?? ""),
    editingNotes: String(raw.editingNotes ?? ""),
    description: String(raw.description ?? ""),
    hashtags: (raw.hashtags ?? []).map((h) => `#${String(h).replace(/^#+/, "").replace(/\s+/g, "")}`).filter((h) => h.length > 1).slice(0, 3),
    pinnedComment: String(raw.pinnedComment ?? ""),
    layout: raw.layout === "completo" ? "completo" : "clasico",
    focusX: clamp(Number(raw.focusX ?? 0.5), 0, 1),
    videoZoom: clamp(Number(raw.videoZoom ?? 1), 1, 1.78),
    effectsOn: raw.effectsOn ?? true,
    captionsOn: raw.captionsOn ?? true,
    revision: Number(raw.revision ?? 0),
    ...(raw.idea ? { idea: raw.idea } : {}),
  };
}

// ---------- IA (n8n) ----------

interface AiShort {
  candidate_index: number;
  title: string;
  hook_text: string;
  end_text: string;
  hook_line: string;
  segments: ShortSegment[];
  effects: { type: VisualFx; at: number; duration: number; text: string }[];
  sfx: { type: SfxKind; at: number }[];
  music: ShortMusic;
  keywords: string[];
  score: ShortScore;
  rationale_es: string;
  editing_notes_es: string;
  description: string;
  hashtags: string[];
  pinned_comment: string;
  /** Registro de ideas: lo agrega n8n cuando la app manda account_id, project_id y source */
  idea?: Parameters<typeof toIdeaCheck>[0];
}

export interface ChannelLearning {
  title: string;
  views: number;
  avg_view_pct: number;
  duration: number;
}

export interface AiContext {
  language: string;
  profile: ChannelProfile;
  cues: Cue[];
  duration: number;
  videoTitle: string;
  notes: string;
  learnings: ChannelLearning[];
  /** Con estos tres n8n lee el historial del canal y anota cada idea en el registro */
  accountId?: string;
  projectId?: string;
  source?: IdeaSource;
  /** Momento elegido a mano: n8n no lo descarta solo, solo avisa */
  manual?: boolean;
  /** "Sacar igual" en un episodio agotado */
  overrideBudget?: boolean;
}

/** El episodio ya dio todos los Shorts recomendados: n8n no gastó IA */
export class SaturatedError extends Error {
  sourceStatus: SourceStatus | null;
  constructor(message: string, sourceStatus: SourceStatus | null) {
    super(message);
    this.name = "SaturatedError";
    this.sourceStatus = sourceStatus;
  }
}

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return token;
}

/** Transcripción con tiempos exactos (en segundos) para que la IA corte donde corresponde */
export function cuesForAi(cues: Cue[]): string {
  return cues.map((c) => `[${c.start.toFixed(2)}-${c.end.toFixed(2)}] ${c.text}`).join("\n");
}

/** POST al webhook de Shorts con el token de la sesión. Episodio agotado = SaturatedError */
export async function postShorts<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${N8N_BASE_URL}${SHORTS_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: await accessToken(), ...payload }),
  });
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (body?.saturated) throw new SaturatedError(body.error ?? "Este episodio ya dio todos los Shorts recomendados.", toSourceStatus(body.source_status));
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `n8n respondió ${res.status}`);
  return body as T;
}

async function callShortsAi<T>(stage: "scout" | "edit", ctx: AiContext, extra: Record<string, unknown>): Promise<T> {
  // Sin cuenta, proyecto y episodio n8n trabaja como antes, sin registro
  const registry =
    ctx.accountId && ctx.projectId && ctx.source?.key
      ? {
          account_id: ctx.accountId,
          project_id: ctx.projectId,
          source: sourceForAi(ctx.source),
          ...(ctx.manual ? { manual: true } : {}),
          ...(ctx.overrideBudget ? { override_budget: true } : {}),
        }
      : {};
  return postShorts<T>({
    stage,
    language: ctx.language,
    profile: ctx.profile,
    transcript: cuesForAi(ctx.cues),
    duration_seconds: ctx.duration,
    video_title: ctx.videoTitle,
    notes: ctx.notes,
    learnings: ctx.learnings,
    ...registry,
    ...extra,
  });
}

/** Pasada 1: el explorador propone los momentos candidatos (sin los tramos ya usados del episodio) */
export async function scoutMoments(
  ctx: AiContext
): Promise<{ candidates: ShortCandidate[]; overview: string; sourceStatus: SourceStatus | null; removedOverlap: number }> {
  const body = await callShortsAi<{
    candidates: { start: number; end: number; hook_line: string; angle: string; hook_strength: number; summary_es: string; why_es: string; topic?: string }[];
    overview_es: string;
    source_status?: Parameters<typeof toSourceStatus>[0];
    removed_overlap?: number;
  }>("scout", ctx, {});
  return {
    overview: body.overview_es,
    sourceStatus: toSourceStatus(body.source_status),
    removedOverlap: Number(body.removed_overlap ?? 0) || 0,
    candidates: body.candidates.map((c, index) => ({
      index,
      start: round2(clamp(c.start, 0, ctx.duration)),
      end: round2(clamp(c.end, 0, ctx.duration)),
      hookLine: c.hook_line,
      angle: c.angle,
      hookStrength: clamp(c.hook_strength, 0, 10),
      summary: c.summary_es,
      why: c.why_es,
      ...(c.topic ? { topic: c.topic } : {}),
    })),
  };
}

function fromAi(s: AiShort, ctx: AiContext, keep?: Partial<ShortPlan>): ShortPlan {
  const idea = toIdeaCheck(s.idea) ?? keep?.idea;
  return normalizePlan(
    {
      ...keep,
      // Las ideas nuevas usan su propio id como plan.id: así source_ref enlaza solo (en la revisión se conserva el id)
      id: keep?.id ?? idea?.planId ?? undefined,
      idea,
      candidateIndex: s.candidate_index,
      title: s.title,
      hookText: s.hook_text,
      endText: s.end_text,
      hookLine: s.hook_line,
      segments: s.segments,
      effects: s.effects.map((e) => ({ ...e, id: uid() })),
      sfx: s.sfx.map((x) => ({ ...x, id: uid() })),
      music: s.music,
      keywords: s.keywords,
      score: s.score,
      rationale: s.rationale_es,
      editingNotes: s.editing_notes_es,
      description: s.description,
      hashtags: s.hashtags,
      pinnedComment: s.pinned_comment,
      revision: (keep?.revision ?? -1) + 1,
    },
    ctx.cues,
    ctx.duration
  );
}

/** Pasada 2: el crítico puntúa, descarta lo flojo y edita los mejores */
export async function editShorts(
  ctx: AiContext,
  candidates: ShortCandidate[],
  count: number
): Promise<{
  plans: ShortPlan[];
  discarded: Discarded[];
  notes: string;
  sourceStatus: SourceStatus | null;
  budgetNotice: string;
  registryError: string;
  /** Los que n8n descartó solo por repetir algo ya hecho */
  autoDiscarded: number;
}> {
  const body = await callShortsAi<{
    shorts: AiShort[];
    discarded: { candidate_index: number; reason_es: string; auto?: boolean }[];
    notes_es: string;
    source_status?: Parameters<typeof toSourceStatus>[0];
    budget_notice?: string;
    registry_error?: string;
  }>("edit", ctx, {
    count,
    candidates: candidates.map((c) => ({
      index: c.index,
      start: c.start,
      end: c.end,
      angle: c.angle,
      hook_line: c.hookLine,
      summary_es: c.summary,
      ...(c.topic ? { topic: c.topic } : {}),
    })),
  });
  const plans = body.shorts
    .map((s) => fromAi(s, ctx))
    .filter((p) => p.segments.length)
    .sort((a, b) => totalScore(b.score) - totalScore(a.score));
  const discarded = body.discarded ?? [];
  return {
    plans,
    discarded: discarded.map((d) => ({ candidateIndex: d.candidate_index, reason: d.reason_es })),
    notes: body.notes_es,
    sourceStatus: toSourceStatus(body.source_status),
    budgetNotice: body.budget_notice ?? "",
    registryError: body.registry_error ?? "",
    autoDiscarded: discarded.filter((d) => d.auto === true).length,
  };
}

/** Pedirle cambios a la IA sobre un Short ya editado ("empieza antes", "más intenso", "sin música"…) */
export async function reviseShort(ctx: AiContext, plan: ShortPlan, candidates: ShortCandidate[], instruction: string): Promise<ShortPlan> {
  const current = {
    candidate_index: plan.candidateIndex,
    title: plan.title,
    hook_text: plan.hookText,
    end_text: plan.endText,
    segments: plan.segments,
    effects: plan.effects.map(({ type, at, duration, text }) => ({ type, at, duration, text })),
    sfx: plan.sfx.map(({ type, at }) => ({ type, at })),
    music: plan.music,
    keywords: plan.keywords,
    plan_id: plan.id,
  };
  const candidate = candidates.find((c) => c.index === plan.candidateIndex);
  // El crítico ve el rango original ampliado para poder alargar el Short si se lo piden
  const pool = candidate
    ? [{ index: candidate.index, start: Math.max(0, candidate.start - 20), end: Math.min(ctx.duration, candidate.end + 20), angle: candidate.angle, hook_line: candidate.hookLine, summary_es: candidate.summary }]
    : [];
  const body = await callShortsAi<{ shorts: AiShort[] }>("edit", ctx, { count: 1, candidates: pool, instruction, current_plan: current });
  const revised = body.shorts[0];
  if (!revised) throw new Error("La IA no devolvió el Short corregido.");
  const { layout, focusX, videoZoom, effectsOn, captionsOn, id, revision, idea } = plan;
  return fromAi(revised, ctx, { layout, focusX, videoZoom, effectsOn, captionsOn, id, revision, idea });
}

// ---------- Línea de tiempo del Short ----------

export type TimelineItem =
  | { kind: "play"; srcStart: number; srcEnd: number; outStart: number; outEnd: number; segment: number }
  | { kind: "freeze"; src: number; outStart: number; outEnd: number; segment: number };

export interface TimedEffect extends ShortEffect {
  outAt: number;
}

export interface TimedSfx extends ShortSfx {
  outAt: number;
}

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
  key: boolean;
}

export interface CaptionChunk {
  words: CaptionWord[];
  start: number;
  end: number;
}

export interface Timeline {
  items: TimelineItem[];
  duration: number;
  effects: TimedEffect[];
  sfx: TimedSfx[];
  musicCuts: number[];
  captions: CaptionChunk[];
}

/** Lleva un segundo del original al segundo del Short (primera vez que aparece) */
function toOutput(items: TimelineItem[], src: number): number | null {
  for (const it of items) {
    // Lo marcado justo en un congelado (texto gigante, golpe) cae al inicio de la pausa
    if (it.kind === "freeze" && Math.abs(src - it.src) < 0.02) return it.outStart;
    if (it.kind === "play" && src >= it.srcStart && src < it.srcEnd) return it.outStart + (src - it.srcStart);
  }
  return null;
}

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Reparte cada subtítulo en palabras con tiempos proporcionales a su largo */
export function wordsFromCues(cues: Cue[]): { text: string; start: number; end: number }[] {
  return cues.flatMap((c) => {
    const words = c.text.split(/\s+/).filter(Boolean);
    const weights = words.map((w) => Math.max(2, w.length) + (/[.,!?;:]$/.test(w) ? 2 : 0));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const span = Math.max(0.1, c.end - c.start);
    let t = c.start;
    return words.map((text, i) => {
      const d = (weights[i] / total) * span;
      const word = { text, start: t, end: t + d };
      t += d;
      return word;
    });
  });
}

export function buildTimeline(plan: ShortPlan, cues: Cue[]): Timeline {
  const freezes = plan.effectsOn ? plan.effects.filter((e) => e.type === "freeze") : [];
  const items: TimelineItem[] = [];
  let out = 0;
  plan.segments.forEach((seg, segment) => {
    // Un congelado parte el tramo en dos: antes y después de la pausa
    const cuts = freezes.filter((f) => f.at > seg.start + 0.05 && f.at < seg.end - 0.05).sort((a, b) => a.at - b.at);
    let from = seg.start;
    for (const f of cuts) {
      items.push({ kind: "play", srcStart: from, srcEnd: f.at, outStart: out, outEnd: out + (f.at - from), segment });
      out += f.at - from;
      items.push({ kind: "freeze", src: f.at, outStart: out, outEnd: out + f.duration, segment });
      out += f.duration;
      from = f.at;
    }
    items.push({ kind: "play", srcStart: from, srcEnd: seg.end, outStart: out, outEnd: out + (seg.end - from), segment });
    out += seg.end - from;
  });

  const effects: TimedEffect[] = plan.effectsOn
    ? plan.effects.flatMap((e) => {
        const outAt = toOutput(items, e.at);
        return outAt === null ? [] : [{ ...e, outAt }];
      })
    : [];
  const sfx: TimedSfx[] = plan.effectsOn
    ? plan.sfx.flatMap((s) => {
        const outAt = toOutput(items, s.at);
        return outAt === null ? [] : [{ ...s, outAt }];
      })
    : [];
  const musicCuts = plan.music.cuts.map((c) => toOutput(items, c)).filter((c): c is number => c !== null);

  // Subtítulos palabra por palabra en tiempo del Short
  const keys = new Set(plan.keywords.flatMap((k) => k.split(/\s+/)).map(normWord).filter(Boolean));
  const allWords = wordsFromCues(cues);
  const words: CaptionWord[] = [];
  for (const it of items) {
    if (it.kind !== "play") continue;
    for (const w of allWords) {
      const mid = (w.start + w.end) / 2;
      if (mid < it.srcStart || mid >= it.srcEnd) continue;
      words.push({
        text: w.text,
        start: it.outStart + Math.max(0, w.start - it.srcStart),
        end: it.outStart + Math.min(it.srcEnd, w.end) - it.srcStart,
        key: keys.has(normWord(w.text)),
      });
    }
  }
  return { items, duration: out, effects, sfx, musicCuts, captions: chunkWords(words) };
}

/** Grupos de 1-3 palabras (cortan en puntuación) al estilo de los Shorts */
export function chunkWords(words: CaptionWord[]): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let current: CaptionWord[] = [];
  const flush = () => {
    if (!current.length) return;
    chunks.push({ words: current, start: current[0].start, end: current[current.length - 1].end });
    current = [];
  };
  for (const w of words) {
    const chars = current.reduce((s, x) => s + x.text.length + 1, 0);
    const gap = current.length ? w.start - current[current.length - 1].end : 0;
    if (current.length >= 3 || chars + w.text.length > 18 || gap > 0.35) flush();
    current.push(w);
    if (/[.,!?;:]$/.test(w.text)) flush();
  }
  flush();
  // Cada grupo queda en pantalla hasta que aparece el siguiente (sin parpadeos)
  for (let i = 0; i < chunks.length - 1; i++) {
    const next = chunks[i + 1];
    if (next.start - chunks[i].end < 0.4) chunks[i].end = next.start;
  }
  return chunks;
}

/** Subtítulos del Short en .srt (YouTube los usa como pista de subtítulos) */
export function timelineToSrt(timeline: Timeline): string {
  const stamp = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, "0");
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0");
    const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0");
    return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`;
  };
  return timeline.captions
    .map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.words.map((w) => w.text).join(" ")}\n`)
    .join("\n");
}

// ---------- Aprendizaje: cómo le fue a los Shorts del canal ----------

/** Shorts del canal de los últimos 90 días, de mejor a peor (la IA aprende qué ganchos funcionan aquí) */
export async function channelLearnings(accountId: string): Promise<ChannelLearning[]> {
  const { fetchChannelAnalytics } = await import("./youtube-analytics");
  const analytics = await fetchChannelAnalytics(accountId, 90);
  return analytics.videos
    .filter((v) => v.isShort && v.views > 0)
    .map((v) => ({ title: v.title, views: v.views, avg_view_pct: v.avgViewPercentage, duration: v.durationSeconds }))
    .sort((a, b) => b.avg_view_pct * Math.log10(b.views + 10) - a.avg_view_pct * Math.log10(a.views + 10))
    .slice(0, 15);
}

// ---------- Proyectos (IndexedDB de este navegador) ----------

export type ProjectStage = "nuevo" | "explorando" | "editando" | "listo" | "error";

export interface ShortsProject {
  id: string;
  accountId: string;
  name: string;
  language: string;
  notes: string;
  count: number;
  duration: number;
  width: number;
  height: number;
  cues: Cue[];
  stage: ProjectStage;
  error?: string;
  overview: string;
  selectionNotes: string;
  candidates: ShortCandidate[];
  discarded: Discarded[];
  plans: ShortPlan[];
  relatedVideo: RelatedVideo | null;
  /** Shorts ya enviados a Programación: planId -> id del borrador */
  sentToSchedule: Record<string, string>;
  /** Episodio en el registro de ideas: 'yt:<id>' o 'file:<huella>' */
  sourceKey?: string;
  /** Los Shorts de antes del registro ya se anotaron (se hace una sola vez) */
  registeredAt?: string;
  /** Último estado del episodio que mandó n8n */
  sourceStatus?: SourceStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredRender {
  planId: string;
  revision: number;
  file: File;
  srt: string;
  /** Si se guardó en la carpeta del PC: subcarpeta y nombre del archivo */
  path?: string[];
}

/** Lo que queda en el navegador de cada render: el archivo solo si no hay carpeta elegida */
type RenderRecord = Omit<StoredRender, "file"> & { file?: File };

const DB_NAME = "vexa-studio-shorts";
const PROJECTS = "projects";
export const FILES = "files";
const AUDIO = "audio-library";
const SETTINGS = "settings";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" }).createIndex("accountId", "accountId");
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function tx<T>(stores: string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => () => T): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(stores, mode);
      const result = run(t);
      t.oncomplete = () => resolve(result());
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error("No se pudo guardar en este navegador."));
    });
  } finally {
    db.close();
  }
}

// ---------- Archivos del PC (Chrome y Edge) ----------
// Con la API de archivos del navegador, el video largo se lee desde donde está (sin copiarlo) y los
// Shorts se escriben directo en una carpeta elegida una vez. Así el navegador no acumula gigas.

type PermissionMode = { mode: "read" | "readwrite" };
type WithPermission = {
  queryPermission(opts: PermissionMode): Promise<PermissionState>;
  requestPermission(opts: PermissionMode): Promise<PermissionState>;
};
type PickerWindow = Window & {
  showDirectoryPicker?: (opts?: { id?: string; mode?: string }) => Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?: (opts?: { id?: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle[]>;
};

export const canUseLocalFiles = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window && "showOpenFilePicker" in window;

/** true si ya hay permiso; con request=true lo pide (tiene que venir de un clic) */
export async function hasAccess(handle: FileSystemHandle, mode: "read" | "readwrite", request = false): Promise<boolean> {
  const h = handle as unknown as WithPermission;
  if ((await h.queryPermission({ mode })) === "granted") return true;
  return request ? (await h.requestPermission({ mode })) === "granted" : false;
}

export async function getShortsFolder(): Promise<FileSystemDirectoryHandle | null> {
  return tx([SETTINGS], "readonly", (t) => {
    const req = t.objectStore(SETTINGS).get("folder") as IDBRequest<FileSystemDirectoryHandle | undefined>;
    return () => req.result ?? null;
  });
}

export async function chooseShortsFolder(): Promise<FileSystemDirectoryHandle> {
  const dir = await (window as PickerWindow).showDirectoryPicker!({ id: "vexa-shorts", mode: "readwrite" });
  await tx([SETTINGS], "readwrite", (t) => {
    t.objectStore(SETTINGS).put(dir, "folder");
    return () => undefined;
  });
  return dir;
}

/** Elegir el video largo sin copiarlo: se guarda solo la referencia al archivo */
export async function pickVideoFile(): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
  try {
    const [handle] = await (window as PickerWindow).showOpenFilePicker!({
      id: "vexa-shorts-video",
      types: [{ description: "Video", accept: { "video/*": [".mp4", ".mov", ".webm", ".mkv", ".m4v"] } }],
    });
    return { file: await handle.getFile(), handle };
  } catch {
    return null;
  }
}

export const safeName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "Shorts";

export async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

// ---------- Proyectos ----------

export function newProject(accountId: string, patch: Partial<ShortsProject>): ShortsProject {
  const now = new Date().toISOString();
  return {
    id: `sp-${Date.now().toString(36)}-${uid().slice(0, 5)}`,
    accountId,
    name: "",
    language: "en",
    notes: "",
    count: 3,
    duration: 0,
    width: 0,
    height: 0,
    cues: [],
    stage: "nuevo",
    overview: "",
    selectionNotes: "",
    candidates: [],
    discarded: [],
    plans: [],
    relatedVideo: null,
    sentToSchedule: {},
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export async function listProjects(accountId: string): Promise<ShortsProject[]> {
  const rows = await tx([PROJECTS], "readonly", (t) => {
    const req = t.objectStore(PROJECTS).index("accountId").getAll(accountId) as IDBRequest<ShortsProject[]>;
    return () => req.result;
  });
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Guarda el proyecto. El video: la referencia al archivo del PC si existe; si no, una copia */
export async function saveProject(project: ShortsProject, video?: File | FileSystemFileHandle | null): Promise<void> {
  void navigator.storage?.persist?.().catch(() => undefined);
  await tx([PROJECTS, FILES], "readwrite", (t) => {
    t.objectStore(PROJECTS).put({ ...project, updatedAt: new Date().toISOString() });
    if (video instanceof File) {
      t.objectStore(FILES).put(video, `${project.id}:video`);
      t.objectStore(FILES).delete(`${project.id}:videoHandle`);
    } else if (video) {
      t.objectStore(FILES).put(video, `${project.id}:videoHandle`);
      t.objectStore(FILES).delete(`${project.id}:video`);
    }
    return () => undefined;
  });
}

export interface ProjectVideo {
  file: File | null;
  /** El video está en el PC pero hay que volver a dar permiso (un clic) */
  handle: FileSystemFileHandle | null;
}

export async function loadProjectVideo(projectId: string, request = false): Promise<ProjectVideo> {
  const [copy, handle] = await tx([FILES], "readonly", (t) => {
    const a = t.objectStore(FILES).get(`${projectId}:video`) as IDBRequest<File | undefined>;
    const b = t.objectStore(FILES).get(`${projectId}:videoHandle`) as IDBRequest<FileSystemFileHandle | undefined>;
    return () => [a.result ?? null, b.result ?? null] as const;
  });
  if (copy) return { file: copy, handle: null };
  if (!handle) return { file: null, handle: null };
  try {
    if (await hasAccess(handle, "read", request)) return { file: await handle.getFile(), handle };
  } catch {
    // El archivo se movió o se borró: hay que elegirlo de nuevo
    return { file: null, handle: null };
  }
  return { file: null, handle };
}

/** Borra el proyecto del navegador (los Shorts y miniaturas ya guardados en la carpeta del PC se quedan ahí) */
export async function deleteProject(project: ShortsProject): Promise<void> {
  await tx([PROJECTS, FILES], "readwrite", (t) => {
    t.objectStore(PROJECTS).delete(project.id);
    t.objectStore(FILES).delete(`${project.id}:video`);
    t.objectStore(FILES).delete(`${project.id}:videoHandle`);
    for (const plan of project.plans) {
      t.objectStore(FILES).delete(`${project.id}:render:${plan.id}`);
      t.objectStore(FILES).delete(`${project.id}:thumb:${plan.id}`);
    }
    return () => undefined;
  });
}

/** Con carpeta elegida, el Short y su .srt van a "<carpeta>/<proyecto>/"; en el navegador queda solo la ficha */
export async function saveRender(project: ShortsProject, render: StoredRender, folder: FileSystemDirectoryHandle | null): Promise<StoredRender> {
  let record: RenderRecord = render;
  let saved = render;
  if (folder) {
    const sub = safeName(project.name);
    const dir = await folder.getDirectoryHandle(sub, { create: true });
    await writeFile(dir, render.file.name, render.file);
    await writeFile(dir, render.file.name.replace(/\.[^.]+$/, ".srt"), render.srt);
    const path = [sub, render.file.name];
    saved = { ...render, path };
    record = { planId: render.planId, revision: render.revision, srt: render.srt, path };
  }
  await tx([FILES], "readwrite", (t) => {
    t.objectStore(FILES).put(record, `${project.id}:render:${render.planId}`);
    return () => undefined;
  });
  return saved;
}

export async function loadRenders(project: ShortsProject, folder: FileSystemDirectoryHandle | null): Promise<Record<string, StoredRender>> {
  const records = await tx([FILES], "readonly", (t) => {
    const reqs = project.plans.map((p) => t.objectStore(FILES).get(`${project.id}:render:${p.id}`) as IDBRequest<RenderRecord | undefined>);
    return () => reqs.map((r) => r.result ?? null);
  });
  const out: Record<string, StoredRender> = {};
  const canRead = folder ? await hasAccess(folder, "readwrite").catch(() => false) : false;
  for (const [i, rec] of records.entries()) {
    // Un render de una versión anterior del plan ya no sirve
    if (!rec || rec.revision !== project.plans[i].revision) continue;
    if (rec.file) {
      out[rec.planId] = { ...rec, file: rec.file };
    } else if (rec.path && folder && canRead) {
      try {
        const dir = await folder.getDirectoryHandle(rec.path[0]);
        const file = await (await dir.getFileHandle(rec.path[1])).getFile();
        out[rec.planId] = { ...rec, file };
      } catch {
        // Lo borraste o moviste de la carpeta: se puede volver a renderizar
      }
    }
  }
  return out;
}

// ---------- Biblioteca de sonidos propia (música y efectos del creador) ----------

export interface AudioAsset {
  id: string;
  kind: "music" | "sfx";
  /** Ánimo de la música o tipo de efecto */
  tag: MusicMood | SfxKind;
  name: string;
  file: File;
}

export async function listAudio(): Promise<AudioAsset[]> {
  return tx([AUDIO], "readonly", (t) => {
    const req = t.objectStore(AUDIO).getAll() as IDBRequest<AudioAsset[]>;
    return () => req.result;
  });
}

export async function saveAudio(asset: Omit<AudioAsset, "id">): Promise<AudioAsset> {
  const full = { ...asset, id: `a-${Date.now().toString(36)}-${uid().slice(0, 4)}` };
  await tx([AUDIO], "readwrite", (t) => {
    t.objectStore(AUDIO).put(full);
    return () => undefined;
  });
  return full;
}

export async function deleteAudio(id: string): Promise<void> {
  await tx([AUDIO], "readwrite", (t) => {
    t.objectStore(AUDIO).delete(id);
    return () => undefined;
  });
}

// ---------- Enviar a Programación ----------

/** Vínculo entre un Short publicado (YouTube o Instagram) y su archivo de la Fábrica */
export const shortsSourceRef = (projectId: string, planId: string) => `shorts:${projectId}:${planId}`;

export function parseShortsSourceRef(ref: string | null | undefined): { projectId: string; planId: string } | null {
  const match = /^shorts:([^:]+):(.+)$/.exec(ref ?? "");
  return match ? { projectId: match[1], planId: match[2] } : null;
}

/** Crea el borrador del Short en Programación con el video, sus subtítulos, la miniatura (si hay) y los textos de la IA */
export async function sendShortToSchedule(
  project: ShortsProject,
  plan: ShortPlan,
  render: StoredRender,
  profile: ChannelProfile,
  thumbnail: File | null = null
): Promise<string> {
  const { newDraft, saveDraft } = await import("./youtube-draft");
  const { withCta } = await import("./video-tasks");
  const related = project.relatedVideo;
  let description = plan.description.trim();
  const missingTags = plan.hashtags.filter((h) => !description.includes(h));
  if (missingTags.length) description = `${description}\n\n${missingTags.join(" ")}`.trim();
  const comment = plan.pinnedComment.trim();
  const timeline = buildTimeline(plan, project.cues);
  const draft = newDraft(project.accountId, profile, {
    file: render.file,
    subtitleFile: new File([render.srt], render.file.name.replace(/\.[^.]+$/, ".srt"), { type: "application/x-subrip" }),
    thumbnailFile: thumbnail,
    format: "short",
    // La duración se conoce del plan: los .webm grabados en el navegador no la traen en el archivo
    video: { duration: timeline.duration, width: 1080, height: 1920 },
    language: project.language,
    title: plan.title.trim(),
    description: related ? withCta(description, project.language) : description,
    tags: [...plan.hashtags.map((h) => h.replace(/^#/, "")), ...plan.keywords].slice(0, 15).join(", "),
    pinnedComment: comment ? (related ? withCta(comment, project.language) : comment) : undefined,
    relatedVideo: related,
    notes: `Short de "${project.name}" (Fábrica de Shorts · puntaje ${totalScore(plan.score)}). Gancho: ${plan.hookLine}`,
    sourceRef: shortsSourceRef(project.id, plan.id),
  });
  await saveDraft(draft);
  return draft.id;
}
