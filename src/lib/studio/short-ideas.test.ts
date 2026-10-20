import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { dHash, hamming, similarityLevel, sourceKeyFor, sourceSummary, spacingConflicts, spacingWarnings, usedRangesOf, type ShortIdea } from "./short-ideas";

const idea = (patch: Partial<ShortIdea>): ShortIdea => ({
  id: "x",
  accountId: "acc",
  sourceKey: "yt:ep1",
  sourceTitle: "Episodio 1",
  sourceVideoId: "ep1",
  sourceDuration: 390,
  projectId: "p1",
  planId: "x",
  sourceRef: "shorts:p1:x",
  status: "propuesta",
  stage: "propuesta",
  segments: [],
  rangeStart: null,
  rangeEnd: null,
  topic: "",
  thesis: "",
  angle: null,
  format: null,
  hookLine: "",
  hookText: "",
  title: "",
  endLine: "",
  firstLine: "",
  duration: null,
  score: null,
  similarity: null,
  similarTo: null,
  similarityReason: null,
  neighbors: [],
  checks: [],
  openFrameHash: null,
  youtubeVideoId: null,
  youtubeAt: null,
  igPublicationId: null,
  igStatus: null,
  igAt: null,
  igPermalink: null,
  plannedAt: null,
  usedAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...patch,
});

describe("usedRangesOf", () => {
  it("une los tramos que se pisan y solo cuenta los usados del mismo episodio", () => {
    const ideas = [
      idea({ id: "a", stage: "usada", segments: [{ start: 10, end: 40 }] }),
      idea({ id: "b", stage: "programada", segments: [{ start: 35, end: 60 }, { start: 100, end: 120 }] }),
      idea({ id: "c", stage: "propuesta", segments: [{ start: 200, end: 230 }] }),
      idea({ id: "d", stage: "publicada", sourceKey: "yt:ep2", segments: [{ start: 0, end: 30 }] }),
    ];
    expect(usedRangesOf(ideas, "yt:ep1")).toEqual([
      { start: 10, end: 60 },
      { start: 100, end: 120 },
    ]);
  });
});

describe("sourceSummary", () => {
  it("cupo de 6,5 min = 7 Shorts y nivel ok con poco uso", () => {
    const s = sourceSummary([idea({ id: "a", stage: "usada", segments: [{ start: 0, end: 39 }] })], "yt:ep1", 390);
    expect(s.budget).toBe(7);
    expect(s.used).toBe(1);
    expect(s.remaining).toBe(6);
    expect(s.coveragePct).toBe(10);
    expect(s.level).toBe("ok");
  });

  it("el cupo queda entre 2 y 10", () => {
    expect(sourceSummary([], "k", 30).budget).toBe(2);
    expect(sourceSummary([], "k", 60 * 60).budget).toBe(10);
  });

  it("agotado si se usó 70 % o más del video", () => {
    const s = sourceSummary([idea({ id: "a", stage: "publicada", segments: [{ start: 0, end: 280 }] })], "yt:ep1", 390);
    expect(s.level).toBe("agotado");
  });

  it("casi si queda 1 Short del cupo", () => {
    const used = Array.from({ length: 6 }, (_, i) => idea({ id: `u${i}`, stage: "usada", segments: [{ start: i * 30, end: i * 30 + 5 }] }));
    const s = sourceSummary(used, "yt:ep1", 390);
    expect(s.remaining).toBe(1);
    expect(s.level).toBe("casi");
  });

  it("agotado si no quedan tramos libres de 25 s", () => {
    // Video de 100 s con tramos usados que dejan huecos de 20 s
    const ideas = [
      idea({ id: "a", stage: "usada", segments: [{ start: 20, end: 40 }] }),
      idea({ id: "b", stage: "usada", segments: [{ start: 60, end: 80 }] }),
    ];
    const s = sourceSummary(ideas, "yt:ep1", 100);
    expect(s.freeSeconds).toBe(0);
    expect(s.level).toBe("agotado");
  });
});

describe("spacingConflicts", () => {
  const at = new Date("2026-10-22T15:00:00Z");

  it("avisa si un vecino del mismo tema sale a menos de 72 h", () => {
    const a = idea({ id: "a", neighbors: [{ id: "b", similarity: 62 }], segments: [{ start: 0, end: 30 }] });
    const b = idea({ id: "b", sourceKey: "yt:ep2", plannedAt: "2026-10-23T15:00:00Z", segments: [{ start: 0, end: 30 }] });
    const out = spacingConflicts(a, at, [a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].reason).toBe("tema");
  });

  it("también vale el vecino declarado del otro lado y la fecha de Programación", () => {
    const a = idea({ id: "a", segments: [{ start: 0, end: 30 }] });
    const b = idea({ id: "b", sourceKey: "yt:ep2", neighbors: [{ id: "a", similarity: 55 }], segments: [{ start: 0, end: 30 }] });
    expect(spacingConflicts(a, at, [a, b], new Map([["b", new Date("2026-10-21T12:00:00Z")]]))).toHaveLength(1);
  });

  it("mismo capítulo: mismo episodio con tramos a menos de 60 s", () => {
    const a = idea({ id: "a", segments: [{ start: 100, end: 130 }] });
    const near = idea({ id: "b", plannedAt: "2026-10-22T20:00:00Z", segments: [{ start: 170, end: 200 }] });
    const far = idea({ id: "c", plannedAt: "2026-10-22T20:00:00Z", segments: [{ start: 300, end: 330 }] });
    const out = spacingConflicts(a, at, [a, near, far]);
    expect(out.map((c) => c.other.id)).toEqual(["b"]);
    expect(out[0].reason).toBe("capitulo");
  });

  it("no avisa con 3 días o más, vecinos bajo 55 % ni descartadas", () => {
    const a = idea({ id: "a", neighbors: [{ id: "b", similarity: 54 }, { id: "c", similarity: 80 }, { id: "d", similarity: 80 }] });
    const b = idea({ id: "b", sourceKey: "yt:ep2", plannedAt: "2026-10-22T18:00:00Z" });
    const c = idea({ id: "c", sourceKey: "yt:ep2", plannedAt: "2026-10-25T15:00:00Z" });
    const d = idea({ id: "d", sourceKey: "yt:ep2", stage: "descartada", plannedAt: "2026-10-22T18:00:00Z" });
    expect(spacingConflicts(a, at, [a, b, c, d])).toHaveLength(0);
  });

  it("spacingWarnings arma el aviso con las fechas de Programación", () => {
    const a = idea({ id: "a", sourceRef: "shorts:p:1", neighbors: [{ id: "b", similarity: 70 }] });
    const b = idea({ id: "b", sourceRef: "shorts:p:2", sourceKey: "yt:ep2", title: "Castigos de Roma" });
    const out = spacingWarnings(
      [
        { key: "d1", sourceRef: "shorts:p:1", at },
        { key: "d2", sourceRef: "shorts:p:2", at: new Date("2026-10-23T15:00:00Z") },
        { key: "d3", sourceRef: null, at },
      ],
      [a, b]
    );
    expect(out.get("d1")).toMatch(/^Mismo tema que «Castigos de Roma» \(.+\)\. Sepáralos al menos 3 días\.$/);
    expect(out.get("d2")).toContain("Mismo tema que");
    expect(out.has("d3")).toBe(false);
  });
});

describe("dHash y hamming", () => {
  const image = (pixel: (x: number, y: number) => number) => {
    const data = new Uint8ClampedArray(9 * 8 * 4);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 9; x++) {
        const v = pixel(x, y);
        data.set([v, v, v, 255], (y * 9 + x) * 4);
      }
    }
    return { data, width: 9, height: 8 };
  };

  it("degradado que oscurece hacia la derecha = todos los bits en 1", () => {
    expect(dHash(image((x) => 255 - x * 20))).toBe("ffffffffffffffff");
  });

  it("degradado que aclara hacia la derecha = todos los bits en 0", () => {
    expect(dHash(image((x) => x * 20))).toBe("0000000000000000");
  });

  it("devuelve 16 hex y es estable", () => {
    const img = image((x, y) => (x * 37 + y * 91) % 256);
    expect(dHash(img)).toMatch(/^[0-9a-f]{16}$/);
    expect(dHash(img)).toBe(dHash(img));
  });

  it("hamming cuenta los bits distintos", () => {
    expect(hamming("0000000000000000", "0000000000000000")).toBe(0);
    expect(hamming("ffffffffffffffff", "0000000000000000")).toBe(64);
    expect(hamming("000000000000000f", "0000000000000001")).toBe(3);
    expect(hamming("abc", "0000000000000000")).toBe(64);
  });
});

describe("similarityLevel y sourceKeyFor", () => {
  it("niveles de parecido", () => {
    expect(similarityLevel(null)).toBe("sin_dato");
    expect(similarityLevel(49)).toBe("ok");
    expect(similarityLevel(50)).toBe("cercana");
    expect(similarityLevel(75)).toBe("repetida");
  });

  it("clave del episodio: video de YouTube o huella del archivo", async () => {
    expect(await sourceKeyFor({ relatedVideo: { id: "abc", title: "t" }, duration: 1, width: 1, height: 1 })).toBe("yt:abc");
    const key = await sourceKeyFor({ relatedVideo: null, duration: 390.04, width: 1920, height: 1080 });
    expect(key).toMatch(/^file:[0-9a-f]{16}$/);
    expect(await sourceKeyFor({ relatedVideo: null, duration: 390.01, width: 1920, height: 1080 })).toBe(key);
  });
});
