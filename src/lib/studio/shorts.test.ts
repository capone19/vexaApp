import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { buildTimeline, chunkWords, normalizePlan, timelineToSrt, totalScore, type ShortPlan } from "./shorts";
import type { Cue } from "./subtitles";

const cues: Cue[] = [
  { start: 10, end: 12.5, text: "Rome had a punishment" },
  { start: 12.5, end: 15, text: "worse than death." },
  { start: 15, end: 18, text: "They sewed you in a sack" },
  { start: 18, end: 21, text: "with a dog, a rooster," },
  { start: 21, end: 24, text: "a snake and a monkey." },
  { start: 30, end: 33, text: "And threw it into the river." },
];

const base = (patch: Partial<ShortPlan> = {}) =>
  normalizePlan(
    {
      title: "t",
      hookText: "hook",
      segments: [
        { start: 10.2, end: 18.1 },
        { start: 30, end: 33 },
      ],
      effects: [
        { id: "a", type: "punch_in", at: 11, duration: 1, text: "" },
        { id: "b", type: "freeze", at: 16, duration: 1, text: "" },
        { id: "c", type: "text_pop", at: 16, duration: 1, text: "sack" },
        { id: "d", type: "bw", at: 25, duration: 2, text: "" },
      ],
      sfx: [
        { id: "s1", type: "impact", at: 16 },
        { id: "s2", type: "whoosh", at: 30.5 },
      ],
      music: { mood: "tension", volume: 0.15, cuts: [32] },
      keywords: ["Rome", "river"],
      score: { hook: 9, standalone: 8, curiosity: 8, emotion: 9, payoff: 7, loop: 6, pacing: 8 },
      ...patch,
    },
    cues,
    60
  );

describe("normalizePlan", () => {
  it("pega los cortes a los bordes de los subtítulos y descarta efectos fuera de los tramos", () => {
    const plan = base();
    expect(plan.segments).toEqual([
      { start: 10, end: 18 },
      { start: 30, end: 33 },
    ]);
    expect(plan.effects.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(plan.effects.find((e) => e.id === "c")?.text).toBe("SACK");
  });

  it("recorta los Shorts que pasan el máximo", () => {
    const plan = base({ segments: [{ start: 0, end: 200 }] });
    const total = plan.segments.reduce((s, x) => s + x.end - x.start, 0);
    expect(total).toBeLessThanOrEqual(58);
  });
});

describe("buildTimeline", () => {
  it("encadena los tramos e inserta el congelado", () => {
    const tl = buildTimeline(base(), cues);
    expect(tl.items.map((i) => i.kind)).toEqual(["play", "freeze", "play", "play"]);
    // 8 s + 1 s congelado + 3 s
    expect(tl.duration).toBeCloseTo(12);
    const pop = tl.effects.find((e) => e.id === "c")!;
    expect(pop.outAt).toBeCloseTo(6);
    const whoosh = tl.sfx.find((s) => s.id === "s2")!;
    expect(whoosh.outAt).toBeCloseTo(9.5);
    expect(tl.musicCuts[0]).toBeCloseTo(11);
  });

  it("apagar los efectos quita el congelado y los sonidos", () => {
    const tl = buildTimeline(base({ effectsOn: false }), cues);
    expect(tl.duration).toBeCloseTo(11);
    expect(tl.effects).toHaveLength(0);
    expect(tl.sfx).toHaveLength(0);
  });

  it("marca las palabras clave y no repite palabras entre tramos", () => {
    const tl = buildTimeline(base(), cues);
    const words = tl.captions.flatMap((c) => c.words);
    expect(words.filter((w) => w.key).map((w) => w.text)).toEqual(["Rome", "river."]);
    expect(words.some((w) => w.text === "snake")).toBe(false);
    expect(timelineToSrt(tl)).toContain("00:00:00,000 -->");
  });
});

describe("chunkWords", () => {
  it("agrupa de a 3 palabras como máximo y corta en la puntuación", () => {
    const chunks = chunkWords(
      ["one", "two", "three", "four.", "five"].map((text, i) => ({ text, start: i * 0.3, end: i * 0.3 + 0.3, key: false }))
    );
    expect(chunks.map((c) => c.words.map((w) => w.text).join(" "))).toEqual(["one two three", "four.", "five"]);
  });
});

describe("totalScore", () => {
  it("pondera la rúbrica sobre 100", () => {
    expect(totalScore({ hook: 10, standalone: 10, curiosity: 10, emotion: 10, payoff: 10, loop: 10, pacing: 10 })).toBe(100);
    expect(totalScore(base().score)).toBe(81);
  });
});
