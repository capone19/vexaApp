import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { hasMusicBed, MUSIC_MOODS, normalizePlan, SFX_KINDS } from "./shorts";
import { MUSIC_LIBRARY, musicUrl, SFX_LIBRARY, sfxUrl, trackFor } from "./shorts-library";

const onDisk = (url: string) => existsSync(join(process.cwd(), "public", url));

describe("biblioteca de sonidos de los Shorts", () => {
  it("cada ánimo con música trae canciones y todos los archivos existen", () => {
    for (const mood of MUSIC_MOODS) {
      expect(MUSIC_LIBRARY[mood].length).toBeGreaterThan(0);
      for (const t of MUSIC_LIBRARY[mood]) expect(onDisk(musicUrl(t.file)), t.file).toBe(true);
    }
    for (const kind of SFX_KINDS) {
      for (let n = 1; n <= (SFX_LIBRARY[kind] ?? 0); n++) expect(onDisk(sfxUrl(kind, n)), `${kind}-${n}`).toBe(true);
    }
  });

  it("usa la canción elegida y, sin elección, siempre la misma para la misma semilla", () => {
    expect(trackFor("morbo", "morbo-black-mass", 0.9).file).toBe("morbo-black-mass");
    expect(trackFor("morbo", "otra-que-no-existe", 0).file).toBe(MUSIC_LIBRARY.morbo[0].file);
    expect(trackFor("tension", undefined, 0.6)).toEqual(trackFor("tension", undefined, 0.6));
    expect(trackFor("tension", undefined, 0.999).file).toBe(MUSIC_LIBRARY.tension[MUSIC_LIBRARY.tension.length - 1].file);
  });

  it("'Música original' y 'Sin música' no agregan música ni guardan canción", () => {
    expect(hasMusicBed("original")).toBe(false);
    expect(hasMusicBed("ninguna")).toBe(false);
    expect(hasMusicBed("suspenso")).toBe(true);
    const plan = (mood: string) =>
      normalizePlan({ segments: [{ start: 1, end: 9 }], music: { mood: mood as never, track: "suspenso-anxious", volume: 0.15, cuts: [] } }, [], 60);
    expect(plan("original").music).toMatchObject({ mood: "original" });
    expect(plan("original").music.track).toBeUndefined();
    expect(plan("suspenso").music.track).toBe("suspenso-anxious");
    expect(plan("rarisimo").music.mood).toBe("misterio");
  });
});
