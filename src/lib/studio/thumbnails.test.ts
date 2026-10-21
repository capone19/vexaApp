import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("./shorts-render", () => ({
  OUT_W: 1080,
  OUT_H: 1920,
  POP_FONT: "Anton",
  YELLOW: "#FFE14D",
  loadShortFonts: () => Promise.resolve(),
}));

import { normalizePlan, type ShortPlan } from "./shorts";
import type { Cue } from "./subtitles";
import { composeThumbnail, frameTimes, layoutPhrase, MAX_THUMBNAIL_BYTES, thumbnailTranscript, type MeasureText } from "./thumbnails";

const cues: Cue[] = [
  { start: 10, end: 12.5, text: "Rome had a punishment" },
  { start: 12.5, end: 15, text: "worse than death." },
  { start: 30, end: 33, text: "And threw it into the river." },
];

const plan = (patch: Partial<ShortPlan> = {}) =>
  normalizePlan(
    {
      title: "t",
      hookText: "hook",
      segments: [
        { start: 10, end: 15 },
        { start: 30, end: 33 },
      ],
      effects: [],
      sfx: [],
      score: { hook: 9, standalone: 8, curiosity: 8, emotion: 9, payoff: 7, loop: 6, pacing: 8 },
      ...patch,
    },
    cues,
    60
  );

// Anton es angosta: ~0,5 del tamaño por letra
const measure: MeasureText = (text, size) => text.length * size * 0.5;

describe("thumbnailTranscript", () => {
  it("usa los tiempos del Short, no los del video original", () => {
    const lines = thumbnailTranscript(plan(), cues).split("\n");
    expect(lines[0]).toMatch(/^\[0\.00-\d+\.\d{2}\] Rome/);
    const last = lines[lines.length - 1];
    expect(last).toContain("river.");
    // El último tramo parte en el segundo 5 del Short (después de los 5 s del primero)
    const start = Number(/^\[(\d+\.\d{2})-/.exec(lines.find((l) => l.includes("threw")) ?? "")?.[1]);
    expect(start).toBeGreaterThanOrEqual(5);
    expect(start).toBeLessThan(8);
  });
});

describe("frameTimes", () => {
  it("mitad de cada tramo, o 30 % y 70 % si hay uno solo", () => {
    expect(frameTimes({ segments: [{ start: 10, end: 20 }, { start: 30, end: 34 }] })).toEqual([15, 32]);
    expect(frameTimes({ segments: [{ start: 10, end: 20 }] })).toEqual([13, 17]);
    expect(frameTimes({ segments: [1, 2, 3, 4].map((i) => ({ start: i * 10, end: i * 10 + 2 })) })).toHaveLength(3);
  });
});

describe("layoutPhrase", () => {
  it("una frase corta va grande, en una línea y dentro del bloque", () => {
    const l = layoutPhrase(measure, { top: "same crime", highlight: "lions" });
    expect(l.boxes).toHaveLength(1);
    expect(l.boxes[0].text).toBe("LIONS");
    expect(l.highlightSize).toBe(200);
    expect(l.topLines.map((t) => t.text)).toEqual(["SAME CRIME"]);
    expect(l.top).toBeGreaterThanOrEqual(280);
    expect(l.bottom).toBeLessThanOrEqual(860);
  });

  it("achica la letra y parte el remate largo en 2 líneas que caben en 900 px", () => {
    const l = layoutPhrase(measure, { top: "the rich walked free while the poor", highlight: "dug their own graves forever" });
    expect(l.boxes).toHaveLength(2);
    expect(l.highlightSize).toBeLessThan(200);
    for (const b of l.boxes) expect(b.w).toBeLessThanOrEqual(900);
    for (const t of l.topLines) expect(measure(t.text, l.topSize)).toBeLessThanOrEqual(900);
    expect(l.top).toBeGreaterThanOrEqual(280);
    expect(l.bottom).toBeLessThanOrEqual(860);
  });

  it("sin línea de arriba solo va la caja", () => {
    const l = layoutPhrase(measure, { top: "", highlight: "again" });
    expect(l.topLines).toHaveLength(0);
    expect(l.boxes).toHaveLength(1);
  });
});

describe("composeThumbnail", () => {
  afterEach(() => vi.unstubAllGlobals());

  const setup = (sizes: number[]) => {
    const qualities: number[] = [];
    const ctx = new Proxy(
      { measureText: (text: string) => ({ width: text.length * 40 }) } as Record<string, unknown>,
      { get: (target, key) => (key in target ? target[key as string] : vi.fn()), set: () => true }
    );
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (cb: (b: Blob) => void, _type: string, quality: number) => {
        qualities.push(quality);
        cb(new Blob([new Uint8Array(sizes[qualities.length - 1] ?? 10)], { type: "image/jpeg" }));
      },
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    vi.stubGlobal("createImageBitmap", async () => ({ width: 1088, height: 1920, close: vi.fn() }));
    vi.stubGlobal("fetch", async () => ({ blob: async () => new Blob(["x"]) }));
    return { canvas, qualities };
  };

  it("arma un JPG 1080×1920 con el nombre de la miniatura", async () => {
    const { canvas, qualities } = setup([1000]);
    const file = await composeThumbnail("data:image/jpeg;base64,eA==", { top: "same crime", highlight: "lions" }, "castigo");
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(file.name).toBe("castigo-miniatura.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(qualities).toEqual([0.9]);
  });

  it("si pasa de 2 MB baja la calidad a 0,8", async () => {
    const { qualities } = setup([MAX_THUMBNAIL_BYTES + 1, 1000]);
    const file = await composeThumbnail(new Blob(["x"]), { top: "", highlight: "lions" });
    expect(qualities).toEqual([0.9, 0.8]);
    expect(file.size).toBe(1000);
  });
});
