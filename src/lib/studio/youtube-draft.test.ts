import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { quotaUnits } from "./youtube-draft";

const jpg = new File(["x"], "miniatura.jpg", { type: "image/jpeg" });
const srt = new File(["1"], "subs.srt");

describe("quotaUnits", () => {
  it("no suma la miniatura de un Short (se sube a mano en Studio)", () => {
    expect(quotaUnits({ format: "short", thumbnailFile: jpg, subtitleFile: null })).toBe(1600);
  });

  it("suma 50 por la miniatura de un video largo", () => {
    expect(quotaUnits({ format: "video", thumbnailFile: jpg, subtitleFile: null })).toBe(1650);
  });

  it("suma 400 por los subtítulos", () => {
    expect(quotaUnits({ format: "short", thumbnailFile: null, subtitleFile: srt })).toBe(2000);
  });
});
