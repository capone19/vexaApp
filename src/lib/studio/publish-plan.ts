// ============================================
// VEXA Content Studio - Frecuencia de publicación (Programación de YouTube)
// ============================================
// Cada canal guarda en studio_accounts.publish_plan qué días y a qué hora sale cada formato.
// Con eso el calendario arma los espacios de la semana y reparte los videos solo.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SlotFormat = "short" | "video";

export interface PlanRule {
  id: string;
  format: SlotFormat;
  /** 0 = domingo … 6 = sábado (como Date.getDay) */
  days: number[];
  /** "14:00" en la hora del computador */
  time: string;
}

export interface PublishPlan {
  rules: PlanRule[];
}

export interface PlanSlot {
  key: string;
  format: SlotFormat;
  at: Date;
}

/** Lunes primero, como en el calendario chileno */
export const WEEK_DAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "L", long: "Lunes" },
  { value: 2, short: "M", long: "Martes" },
  { value: 3, short: "X", long: "Miércoles" },
  { value: 4, short: "J", long: "Jueves" },
  { value: 5, short: "V", long: "Viernes" },
  { value: 6, short: "S", long: "Sábado" },
  { value: 0, short: "D", long: "Domingo" },
];

export const SLOT_FORMAT_LABELS: Record<SlotFormat, string> = { short: "Short", video: "Video" };

const ruleId = () => `r-${Math.random().toString(36).slice(2, 8)}`;

export const PLAN_PRESETS: { id: string; label: string; detail: string; rules: Omit<PlanRule, "id">[] }[] = [
  {
    id: "recomendado",
    label: "Recomendado",
    detail: "1 video el sábado y 1 Short diario el resto de la semana",
    rules: [
      { format: "video", days: [6], time: "13:00" },
      { format: "short", days: [0, 1, 2, 3, 4, 5], time: "14:00" },
    ],
  },
  {
    id: "intenso",
    label: "Crecimiento rápido",
    detail: "1 video el sábado y 2 Shorts diarios",
    rules: [
      { format: "video", days: [6], time: "13:00" },
      { format: "short", days: [0, 1, 2, 3, 4, 5, 6], time: "12:00" },
      { format: "short", days: [0, 1, 2, 3, 4, 5, 6], time: "19:00" },
    ],
  },
  {
    id: "liviano",
    label: "Liviano",
    detail: "1 video el sábado y Shorts lunes, miércoles y viernes",
    rules: [
      { format: "video", days: [6], time: "13:00" },
      { format: "short", days: [1, 3, 5], time: "14:00" },
    ],
  },
];

export function presetRules(presetId: string): PlanRule[] {
  const preset = PLAN_PRESETS.find((p) => p.id === presetId) ?? PLAN_PRESETS[0];
  return preset.rules.map((r) => ({ ...r, days: [...r.days], id: ruleId() }));
}

export const newRule = (format: SlotFormat): PlanRule => ({ id: ruleId(), format, days: [1, 2, 3, 4, 5], time: "14:00" });

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizePlan(raw: unknown): PublishPlan {
  const rules = (raw as { rules?: unknown })?.rules;
  if (!Array.isArray(rules)) return { rules: presetRules("recomendado") };
  return {
    rules: rules
      .map((r) => r as Partial<PlanRule>)
      .filter((r) => (r.format === "short" || r.format === "video") && typeof r.time === "string" && TIME_RE.test(r.time))
      .map((r) => ({
        id: r.id || ruleId(),
        format: r.format as SlotFormat,
        time: r.time as string,
        days: Array.isArray(r.days) ? r.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [],
      })),
  };
}

export async function savePublishPlan(accountId: string, plan: PublishPlan) {
  const db = supabase as unknown as SupabaseClient;
  const { error } = await db.from("studio_accounts").update({ publish_plan: plan }).eq("id", accountId);
  if (error) throw error;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Lunes = inicio de semana
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Espacios de publicación entre `from` (incluido) y `to` (excluido), ordenados por hora */
export function slotsBetween(plan: PublishPlan, from: Date, to: Date): PlanSlot[] {
  const slots: PlanSlot[] = [];
  for (let day = new Date(from.getFullYear(), from.getMonth(), from.getDate()); day < to; day = addDays(day, 1)) {
    for (const rule of plan.rules) {
      if (!rule.days.includes(day.getDay())) continue;
      const [h, m] = rule.time.split(":").map(Number);
      const at = new Date(day);
      at.setHours(h, m, 0, 0);
      if (at >= from && at < to) slots.push({ key: `${rule.format}-${at.toISOString()}`, format: rule.format, at });
    }
  }
  return slots.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface Occupant {
  format: SlotFormat;
  at: Date;
}

/**
 * Espacios que siguen libres: en cada día, cada contenido ya agendado ocupa
 * el espacio de su formato más cercano a su hora.
 */
export function freeSlots(slots: PlanSlot[], occupants: Occupant[]): PlanSlot[] {
  const taken = new Set<string>();
  for (const o of occupants) {
    const candidates = slots.filter((s) => s.format === o.format && sameDay(s.at, o.at) && !taken.has(s.key));
    const nearest = candidates.sort(
      (a, b) => Math.abs(a.at.getTime() - o.at.getTime()) - Math.abs(b.at.getTime() - o.at.getTime())
    )[0];
    if (nearest) taken.add(nearest.key);
  }
  return slots.filter((s) => !taken.has(s.key));
}

/** YouTube exige que la hora programada sea futura; se deja margen para subir el archivo */
export const MIN_LEAD_MS = 20 * 60_000;
