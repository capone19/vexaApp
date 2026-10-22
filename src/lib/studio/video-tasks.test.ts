import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { needsAction, type VideoTask } from "./video-tasks";

const task = (patch: Partial<VideoTask> = {}): VideoTask => ({
  id: "t1",
  accountId: "a1",
  videoId: "uPzm3fvWVdI",
  videoTitle: "Short",
  isShort: true,
  commentText: null,
  commentStatus: "sin",
  commentId: null,
  postAfter: "2026-10-21T22:00:00.000Z",
  lastError: null,
  relatedVideoId: null,
  relatedVideoTitle: null,
  relatedDone: false,
  thumbnailPending: false,
  ...patch,
});

describe("needsAction", () => {
  it("es false si no falta nada", () => {
    expect(needsAction(task())).toBe(false);
  });

  it("es true con la miniatura pendiente", () => {
    expect(needsAction(task({ thumbnailPending: true }))).toBe(true);
  });

  it("sigue marcando el comentario por fijar y el video relacionado", () => {
    expect(needsAction(task({ commentStatus: "publicado" }))).toBe(true);
    expect(needsAction(task({ relatedVideoId: "abc", relatedDone: false }))).toBe(true);
    expect(needsAction(task({ relatedVideoId: "abc", relatedDone: true }))).toBe(false);
  });
});
