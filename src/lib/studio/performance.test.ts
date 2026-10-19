import { describe, expect, it } from "vitest";
import {
  adviseSlot,
  convertHour,
  cumulative,
  expectedViewsAt,
  levelFor,
  liveStatus,
  medianCurve,
  outlierRatio,
  publishSlotStats,
  ratioLabel,
  retentionAt,
  retentionMoments,
  viewsHeatmap,
  zonedParts,
  type CurveVideo,
  type RetentionPoint,
  type Snapshot,
} from "./performance";

const curve = (id: string, perDay: number, days = 10, format: CurveVideo["format"] = "video"): CurveVideo => ({
  id,
  format,
  cum: cumulative(new Array(days).fill(perDay)),
});

describe("curva típica y multiplicador", () => {
  const videos = [curve("a", 10), curve("b", 20), curve("c", 30), curve("roma", 120), curve("s1", 500, 10, "short")];

  it("la mediana por día no cuenta el video medido ni los de otro formato", () => {
    const base = medianCurve(videos, "video", "roma");
    expect(base[0]).toBe(20);
    expect(base[6]).toBe(140);
    expect(base[12]).toBeNull();
  });

  it("compara a los 7 días contra la mediana de los otros", () => {
    const base = medianCurve(videos, "video", "roma");
    const { ratio, day } = outlierRatio(videos[3], base);
    expect(day).toBe(6);
    expect(ratio).toBeCloseTo(6);
    expect(levelFor(ratio)).toBe("viral");
  });

  it("sin 3 videos de base no inventa un multiplicador", () => {
    const base = medianCurve([curve("a", 10), curve("b", 20)], "video");
    expect(outlierRatio(curve("x", 50), base).ratio).toBeNull();
    expect(levelFor(null)).toBe("sin-base");
  });

  it("interpola las vistas esperadas por hora", () => {
    const base = [100, 200, 300];
    expect(expectedViewsAt(base, 0)).toBe(0);
    expect(expectedViewsAt(base, 6)).toBeCloseTo(50);
    expect(expectedViewsAt(base, 24)).toBeCloseTo(150);
    expect(expectedViewsAt(base, 500)).toBe(300);
  });
});

describe("fotos por hora", () => {
  const pub = "2026-10-10T12:00:00Z";
  const snaps: Snapshot[] = Array.from({ length: 30 }, (_, i) => ({
    videoId: "v",
    takenAt: new Date(Date.parse(pub) + (i + 1) * 3_600_000).toISOString(),
    views: (i + 1) * 50,
  }));

  it("calcula vistas de 24 h, ritmo por hora y multiplicador en vivo", () => {
    const live = liveStatus(snaps, pub, [100, 200, 300]);
    expect(live?.views).toBe(1500);
    expect(live?.last24h).toBe(1200);
    expect(live?.perHour).toBeCloseTo(50);
    expect(live?.ageHours).toBe(30);
    expect(live?.ratio).toBeGreaterThan(5);
  });

  it("con pocas horas usa la referencia de EE. UU.", () => {
    const map = viewsHeatmap(snaps, "UTC", new Map([["v", pub]]));
    expect(map.hours).toBe(6);
    expect(adviseSlot(map, "video")).toMatchObject({ confidence: "referencia", weekday: 6, hour: 12 });
  });

  it("encuentra el peak de la audiencia sin el sesgo del estreno", () => {
    // 6 días de fotos: el estreno (primeras 24 h) tiene un peak falso a las 3 UTC; el hábito real son las vistas entre 19 y 20 UTC
    const start = Date.parse("2026-10-01T00:00:00Z");
    const list: Snapshot[] = [];
    let views = 0;
    for (let h = 1; h <= 24 * 6; h++) {
      const hour = h % 24;
      views += h < 24 && hour === 3 ? 5000 : hour === 20 ? 300 : 20;
      list.push({ videoId: "x", takenAt: new Date(start + h * 3_600_000).toISOString(), views });
    }
    const map = viewsHeatmap(list, "UTC", new Map([["x", new Date(start).toISOString()]]));
    expect(map.hours).toBeGreaterThan(72);
    const advice = adviseSlot(map, "short");
    expect(advice.peakHour).toBe(19);
    expect(advice.hour).toBe(18);
    expect(advice.confidence).toBe("baja");
  });
});

describe("horarios", () => {
  it("lee día y hora en otra zona", () => {
    const p = zonedParts(new Date("2026-10-17T16:30:00Z"), "America/New_York");
    expect(p).toEqual({ weekday: 6, hour: 12, minute: 30 });
  });

  it("convierte una hora de EE. UU. a Chile", () => {
    const cl = convertHour(6, 12, "America/New_York", "America/Santiago", new Date("2026-10-19T00:00:00Z"));
    expect(cl).toEqual({ weekday: 6, hour: 13 });
  });

  it("agrupa el rendimiento por franja de publicación", () => {
    const stats = publishSlotStats([
      { publishedAt: "2026-10-17T16:00:00Z", ratio: 3 },
      { publishedAt: "2026-10-16T17:00:00Z", ratio: 1 },
      { publishedAt: "2026-10-16T02:00:00Z", ratio: 0.5 },
    ]);
    expect(stats.find((s) => s.label === "Mediodía")).toMatchObject({ videos: 2, medianRatio: 2 });
    expect(stats.find((s) => s.label === "Noche")).toMatchObject({ videos: 1, medianRatio: 0.5 });
  });
});

describe("retención", () => {
  const points: RetentionPoint[] = Array.from({ length: 100 }, (_, i) => {
    const ratio = (i + 1) / 100;
    let percent = 100 - i * 0.4;
    if (i >= 40) percent -= 15;
    if (i >= 70 && i < 74) percent += 6;
    return { ratio, percent, relative: 0.5 };
  });

  it("interpola la retención a un segundo", () => {
    expect(retentionAt(points, 50, 1000)).toBeCloseTo(98.4);
  });

  it("encuentra la caída fuerte y el pico", () => {
    const moments = retentionMoments(points, 1000);
    expect(moments.some((m) => m.type === "caida" && Math.abs(m.at - 390) <= 20)).toBe(true);
    expect(moments.some((m) => m.type === "pico")).toBe(true);
  });

  it("formatea el multiplicador", () => {
    expect(ratioLabel(3.24)).toBe("×3,2");
    expect(ratioLabel(12.4)).toBe("×12");
    expect(ratioLabel(null)).toBe("—");
  });
});
