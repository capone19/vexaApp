import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fila que devuelve el update simulado (cada test la ajusta)
let updatedRow: Record<string, unknown> = {};
const updateSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    update: (row: unknown) => {
      updateSpy(row);
      return chain;
    },
    eq: () => chain,
    select: () => chain,
    single: async () => ({ data: updatedRow, error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      auth: { getSession: async () => ({ data: { session: { access_token: "token-de-prueba" } } }) },
    },
  };
});

import {
  composeCaption,
  matchFactoryShort,
  needsWatch,
  normalizeHashtags,
  NOTIFY_FAILED_MESSAGE,
  patchToRow,
  publishNow,
  replicaTime,
  retryPublication,
  schedulePublication,
  settingsFromRow,
  settingsToRow,
  splitCaption,
  toPublication,
  unschedule,
  updatePublication,
  validateReelFile,
  WEBM_MESSAGE,
  type FactoryShort,
  type InstagramPublication,
} from "./instagram";
import type { PublishPlan } from "./publish-plan";

const row = (patch: Record<string, unknown> = {}) => ({
  id: "p1",
  tenant_id: "t1",
  account_id: "a1",
  title: "Short",
  caption: "Hola\n\n#uno #dos",
  settings: { share_to_feed: false, thumb_offset_ms: 3000, collaborators: ["@ana", "luis"], first_comment: "Link en bio" },
  source_ref: "shorts:sp-1:plan-1",
  youtube_video_id: "yt1",
  status: "programado",
  scheduled_at: "2026-10-20T17:00:00.000Z",
  media_url: "https://r2/x.mp4",
  media_size: "1234",
  permalink: null,
  published_at: null,
  attempts: 0,
  last_error: null,
  created_at: "2026-10-19T00:00:00.000Z",
  updated_at: "2026-10-19T00:00:00.000Z",
  ...patch,
});

describe("mapeo de la tabla", () => {
  it("pasa de snake_case a camelCase", () => {
    const p = toPublication(row() as never);
    expect(p.accountId).toBe("a1");
    expect(p.youtubeVideoId).toBe("yt1");
    expect(p.mediaSize).toBe(1234);
    expect(p.settings).toEqual({
      shareToFeed: false,
      thumbOffsetMs: 3000,
      collaborators: ["ana", "luis"],
      firstComment: "Link en bio",
      locationId: undefined,
      audioName: undefined,
    });
  });

  it("share_to_feed es true si no viene", () => {
    expect(settingsFromRow({}).shareToFeed).toBe(true);
    expect(settingsFromRow(null).collaborators).toEqual([]);
  });

  it("solo escribe columnas editables y limita colaboradores", () => {
    const out = patchToRow({
      title: "  Mi Reel  ",
      status: "programado",
      scheduledAt: "2026-10-20T17:00:00.000Z",
      settings: { shareToFeed: true, collaborators: ["@a", "b", "c", "d"], firstComment: "  " },
    });
    expect(out).toEqual({
      title: "Mi Reel",
      status: "programado",
      scheduled_at: "2026-10-20T17:00:00.000Z",
      settings: { share_to_feed: true, collaborators: ["a", "b", "c"] },
    });
    expect(settingsToRow({ shareToFeed: true, collaborators: [], thumbOffsetMs: 1500.4 })).toEqual({ share_to_feed: true, thumb_offset_ms: 1500 });
  });
});

describe("validateReelFile", () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size });
  it("rechaza WebM con el mensaje de la Fábrica", () => {
    expect(validateReelFile(file("short.webm", "video/webm"))).toBe(WEBM_MESSAGE);
    expect(validateReelFile(file("short.webm", ""))).toBe(WEBM_MESSAGE);
  });
  it("acepta MP4 y MOV", () => {
    expect(validateReelFile(file("a.mp4", "video/mp4"))).toBeNull();
    expect(validateReelFile(file("a.mov", "video/quicktime"))).toBeNull();
  });
  it("rechaza otros formatos y archivos de 300 MB o más", () => {
    expect(validateReelFile(file("a.mkv", "video/x-matroska"))).toMatch(/MP4 o MOV/);
    expect(validateReelFile(file("a.mp4", "video/mp4", 300 * 1024 * 1024))).toMatch(/300 MB/);
  });
});

describe("caption y hashtags", () => {
  it("separa y vuelve a juntar la línea de hashtags", () => {
    const { text, hashtags } = splitCaption("Gancho\n\nCuerpo\n\n#roma #historia");
    expect(text).toBe("Gancho\n\nCuerpo");
    expect(hashtags).toEqual(["#roma", "#historia"]);
    expect(composeCaption(text, hashtags)).toBe("Gancho\n\nCuerpo\n\n#roma #historia");
  });
  it("sin hashtags deja el texto igual", () => {
    expect(splitCaption("Solo texto")).toEqual({ text: "Solo texto", hashtags: [] });
    expect(composeCaption("Solo texto", [])).toBe("Solo texto");
  });
  it("normaliza, quita repetidos y deja máximo 5", () => {
    expect(normalizeHashtags(["roma", "#Roma", "# historia ", "a", "b", "c", "d"])).toEqual(["#roma", "#historia", "#a", "#b", "#c"]);
  });
});

describe("replicaTime", () => {
  const now = new Date(2026, 9, 19, 10, 0); // lunes 19 oct 10:00
  const plan: PublishPlan = { rules: [{ id: "r", format: "reel", days: [0, 1, 2, 3, 4, 5, 6], time: "19:00" }] };

  it("misma hora que YouTube si es futura", () => {
    const yt = new Date(2026, 9, 20, 14, 0);
    expect(replicaTime({ youtubeAt: yt, mode: "same", offsetHours: 3, plan: null, occupants: [], now })).toEqual({ at: yt, moved: false });
  });
  it("con desfase suma las horas", () => {
    const yt = new Date(2026, 9, 20, 14, 0);
    expect(replicaTime({ youtubeAt: yt, mode: "offset", offsetHours: 3, plan: null, occupants: [], now }).at).toEqual(new Date(2026, 9, 20, 17, 0));
  });
  it("nunca programa en el pasado: toma el próximo hueco del plan y avisa", () => {
    const yt = new Date(2026, 9, 18, 14, 0);
    const out = replicaTime({ youtubeAt: yt, mode: "same", offsetHours: 0, plan, occupants: [], now });
    expect(out.moved).toBe(true);
    expect(out.at).toEqual(new Date(2026, 9, 19, 19, 0));
  });
  it("sin plan, en el pasado queda en unos minutos más", () => {
    const out = replicaTime({ youtubeAt: new Date(2026, 9, 18, 14, 0), mode: "same", offsetHours: 0, plan: null, occupants: [], now });
    expect(out.moved).toBe(true);
    expect(out.at.getTime()).toBeGreaterThan(now.getTime());
  });
  it("modo plan usa el primer hueco libre desde la hora de YouTube", () => {
    const yt = new Date(2026, 9, 20, 9, 0);
    const occupants = [{ format: "reel" as const, at: new Date(2026, 9, 20, 19, 0) }];
    expect(replicaTime({ youtubeAt: yt, mode: "plan", offsetHours: 0, plan, occupants, now }).at).toEqual(new Date(2026, 9, 21, 19, 0));
  });
});

describe("needsWatch", () => {
  const pub = (status: InstagramPublication["status"], minutes: number | null) =>
    ({ status, scheduledAt: minutes === null ? null : new Date(Date.now() + minutes * 60_000).toISOString() }) as InstagramPublication;
  it("mira si hay algo publicándose o por salir en menos de 15 min", () => {
    expect(needsWatch([pub("publicando", null)])).toBe(true);
    expect(needsWatch([pub("programado", 10)])).toBe(true);
    expect(needsWatch([pub("programado", 60)])).toBe(false);
    expect(needsWatch([pub("borrador", null), pub("publicado", -5)])).toBe(false);
  });
});

describe("matchFactoryShort", () => {
  const short = (patch: Partial<FactoryShort>): FactoryShort => ({
    sourceRef: "",
    projectId: "sp-1",
    planId: "plan-1",
    projectName: "P",
    language: "es",
    title: "El castigo romano",
    description: "",
    hashtags: [],
    file: {} as File,
    srt: "",
    durationSeconds: 40,
    sentToSchedule: true,
    ...patch,
  });
  it("prefiere el vínculo guardado al subir a YouTube", () => {
    const linked = short({ planId: "plan-2", title: "Otro título" });
    const refs = new Map([["yt1", "shorts:sp-1:plan-2"]]);
    expect(matchFactoryShort({ id: "yt1", title: "El castigo romano" }, refs, [short({}), linked])).toBe(linked);
  });
  it("si no hay vínculo, busca por título entre los enviados a Programación", () => {
    const hit = short({});
    expect(matchFactoryShort({ id: "yt9", title: "  el castigo  ROMANO " }, new Map(), [short({ sentToSchedule: false, planId: "x" }), hit])).toBe(hit);
    expect(matchFactoryShort({ id: "yt9", title: "Nada" }, new Map(), [hit])).toBeNull();
  });
});

describe("aviso de la hora a n8n (contrato 4.4)", () => {
  const fetchMock = vi.fn();
  const scheduleCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/webhook/vexa-studio/instagram/programar"));

  beforeEach(() => {
    fetchMock.mockReset();
    updateSpy.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ ok: true, armed: true, publication_id: "p1", scheduled_at: "2026-10-20T17:00:00.000Z" }), { status: 200 })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("programar avisa después de guardar, con el access_token de la sesión", async () => {
    updatedRow = row();
    const { notice } = await schedulePublication("p1", new Date("2026-10-20T17:00:00.000Z"));
    expect(updateSpy).toHaveBeenCalledWith({ status: "programado", scheduled_at: "2026-10-20T17:00:00.000Z" });
    expect(scheduleCalls()).toHaveLength(1);
    expect(JSON.parse(scheduleCalls()[0][1].body)).toEqual({ access_token: "token-de-prueba", publication_id: "p1" });
    expect(notice).toEqual({ armed: true, scheduledAt: "2026-10-20T17:00:00.000Z" });
  });

  it("publicar ahora, reintentar y reprogramar también avisan", async () => {
    updatedRow = row();
    await publishNow("p1");
    await retryPublication("p1");
    await updatePublication("p1", { scheduledAt: "2026-10-21T17:00:00.000Z" });
    expect(scheduleCalls()).toHaveLength(3);
  });

  it("cambiar solo el texto o pasar a borrador no avisa", async () => {
    updatedRow = row();
    await updatePublication("p1", { caption: "Nuevo texto" });
    updatedRow = row({ status: "borrador", scheduled_at: null });
    const { notice } = await unschedule("p1");
    expect(scheduleCalls()).toHaveLength(0);
    expect(notice).toBeNull();
  });

  it("si el aviso falla no deshace el cambio: reintenta una vez y devuelve aviso_fallido", async () => {
    updatedRow = row();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { publication, notice } = await schedulePublication("p1", new Date("2026-10-20T17:00:00.000Z"));
    expect(publication.status).toBe("programado");
    expect(scheduleCalls()).toHaveLength(2);
    expect(notice).toEqual({ armed: false, reason: "aviso_fallido" });
    expect(NOTIFY_FAILED_MESSAGE).toMatch(/1 hora de atraso/);
  });

  it("sin video n8n responde armed:false y la alarma se arma al subir", async () => {
    updatedRow = row({ media_url: null });
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ ok: true, armed: false, publication_id: "p1", reason: "sin_video" }), { status: 200 })
    );
    const { notice } = await schedulePublication("p1", new Date("2026-10-20T17:00:00.000Z"));
    expect(notice).toEqual({ armed: false, reason: "sin_video" });
  });
});
