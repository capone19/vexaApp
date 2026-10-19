// ============================================
// VEXA Content Studio - Motor de render de Shorts (en el navegador)
// ============================================
// Ejecuta el guion de edición de la IA sobre el video original: corta los tramos, arma el cuadro 9:16
// (clásico con título arriba o pantalla completa), dibuja subtítulos palabra por palabra, aplica los
// efectos (zooms, blanco y negro, congelados, textos gigantes…) y mezcla voz + música + efectos.
// La vista previa y el render son lo mismo: para el render se graba el canvas en tiempo real.
// Mientras renderiza, la pestaña tiene que quedar visible (el navegador frena las pestañas ocultas).

import { buildTimeline, type CaptionChunk, type ShortPlan, type SfxKind, type Timeline, type TimelineItem } from "./shorts";
import { loadSounds, type ShortSounds } from "./shorts-audio";
import type { Cue } from "./subtitles";

export const OUT_W = 1080;
export const OUT_H = 1920;

const TITLE_FONT = '"Montserrat", "Arial Black", "Helvetica Neue", sans-serif';
const POP_FONT = '"Anton", "Impact", "Arial Black", sans-serif';
const YELLOW = "#FFE14D";

// Cuánto antes de su marca empieza cada sonido (los que "suben" terminan justo en la marca)
const SFX_LEAD: Partial<Record<SfxKind, number | "end">> = { whoosh: 0.3, riser: "end", reverse: "end" };
const SFX_GAIN: Partial<Record<SfxKind, number>> = { boom: 0.95, impact: 0.85, riser: 0.55, reverse: 0.5, ticking: 0.5, heartbeat: 0.9, glitch: 0.45 };

let fontsReady: Promise<void> | null = null;

/** Tipografías de los Shorts (Google Fonts); si no cargan se usan las del sistema */
export function loadShortFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    if (!document.getElementById("vexa-short-fonts")) {
      const link = document.createElement("link");
      link.id = "vexa-short-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@800;900&display=swap";
      document.head.appendChild(link);
      await new Promise((r) => {
        link.onload = r;
        link.onerror = r;
        setTimeout(r, 4000);
      });
    }
    await Promise.all([document.fonts.load(`900 80px Montserrat`), document.fonts.load(`80px Anton`)]).catch(() => undefined);
  })();
  return fontsReady;
}

export function pickRecorderType(): string {
  const types = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0→1 al entrar, 1 mientras dura, 1→0 al salir */
function ramp(t: number, start: number, dur: number, fadeIn = 0.12, fadeOut = 0.12) {
  const p = t - start;
  if (p < 0 || p > dur) return 0;
  return Math.min(easeOut(clamp01(p / fadeIn)), clamp01((dur - p) / fadeOut));
}

/** Ruido determinista para vibraciones y glitches */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

interface Look {
  zoom: number;
  shakeX: number;
  shakeY: number;
  bw: number;
  dark: number;
  flash: number;
  glitch: boolean;
}

export interface PlayOptions {
  record: boolean;
  /** Escuchar mientras corre (en el render se puede apagar) */
  monitor: boolean;
  onProgress?: (seconds: number, total: number) => void;
}

export class ShortEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private bgBlur: boolean;
  private bgTiny: HTMLCanvasElement;
  private bgTinyCtx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private url: string;
  private audio: AudioContext | null = null;
  private voiceGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private monitorGain: GainNode | null = null;
  private recDest: MediaStreamAudioDestinationNode | null = null;
  private plan: ShortPlan | null = null;
  private timeline: Timeline | null = null;
  private sounds: ShortSounds | null = null;
  private soundsKey = "";
  private running = false;
  private stopRequested = false;
  private sources: AudioScheduledSourceNode[] = [];

  constructor(canvas: HTMLCanvasElement, file: File) {
    this.canvas = canvas;
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Este navegador no permite dibujar video.");
    this.ctx = ctx;
    // Fondo difuminado: un cuadro chico con blur real. Agrandar un cuadro diminuto sin blur se ve pixelado.
    this.bg = document.createElement("canvas");
    this.bg.width = 216;
    this.bg.height = 384;
    this.bgCtx = this.bg.getContext("2d")!;
    this.bgBlur = typeof this.bgCtx.filter === "string";
    if (this.bgBlur) this.bgCtx.filter = "blur(10px)";
    // Sin ctx.filter (Safari): se achica a 27×48 y se agranda en dos pasos con suavizado
    this.bgTiny = document.createElement("canvas");
    this.bgTiny.width = 27;
    this.bgTiny.height = 48;
    this.bgTinyCtx = this.bgTiny.getContext("2d")!;
    this.url = URL.createObjectURL(file);
    this.video = document.createElement("video");
    this.video.preload = "auto";
    this.video.playsInline = true;
    this.video.src = this.url;
  }

  get isRunning() {
    return this.running;
  }

  get duration() {
    return this.timeline?.duration ?? 0;
  }

  async ready(): Promise<void> {
    if (this.video.readyState >= 2) return;
    await new Promise<void>((resolve, reject) => {
      this.video.addEventListener("loadeddata", () => resolve(), { once: true });
      this.video.addEventListener("error", () => reject(new Error("El navegador no pudo leer el video.")), { once: true });
    });
  }

  /** El grafo de audio se crea una sola vez por video (un <video> solo admite una fuente) */
  private ensureAudio() {
    if (this.audio) return this.audio;
    const audio = new AudioContext({ sampleRate: 48000 });
    const voice = audio.createMediaElementSource(this.video);
    this.voiceGain = audio.createGain();
    this.musicGain = audio.createGain();
    this.musicGain.gain.value = 0;
    this.sfxBus = audio.createGain();
    this.sfxBus.gain.value = 0.8;
    const mix = audio.createGain();
    const comp = audio.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.15;
    voice.connect(this.voiceGain).connect(mix);
    this.musicGain.connect(mix);
    this.sfxBus.connect(mix);
    mix.connect(comp);
    this.monitorGain = audio.createGain();
    comp.connect(this.monitorGain).connect(audio.destination);
    this.recDest = audio.createMediaStreamDestination();
    comp.connect(this.recDest);
    this.audio = audio;
    return audio;
  }

  /** Carga el plan: arma la línea de tiempo (los sonidos se preparan al reproducir) */
  async load(plan: ShortPlan, cues: Cue[]): Promise<void> {
    if (this.running) return;
    await Promise.all([this.ready(), loadShortFonts()]);
    this.plan = plan;
    this.timeline = buildTimeline(plan, cues);
  }

  /** Música y efectos que usa el plan (se reutilizan mientras no cambien) */
  private async prepareSounds(audio: AudioContext, plan: ShortPlan, tl: Timeline) {
    const sfxKinds = [...new Set(tl.sfx.map((s) => s.type))].sort();
    const key = `${plan.music.mood}:${Math.ceil(tl.duration)}:${sfxKinds.join(",")}`;
    if (key === this.soundsKey) return;
    this.sounds = await loadSounds(audio, { mood: plan.music.mood, seconds: tl.duration, sfx: sfxKinds, seed: plan.candidateIndex + 1 });
    this.soundsKey = key;
  }

  private seek(time: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.video.removeEventListener("seeked", done);
        resolve();
      };
      const timer = setTimeout(done, 5000);
      this.video.addEventListener("seeked", done);
      this.video.currentTime = time;
    });
  }

  /** Muestra el cuadro del Short en el segundo indicado (portada y navegación) */
  async showAt(t: number): Promise<void> {
    if (!this.timeline || this.running) return;
    const item = this.timeline.items.find((it) => t >= it.outStart && t < it.outEnd) ?? this.timeline.items[0];
    if (!item) return;
    const src = item.kind === "play" ? item.srcStart + (t - item.outStart) : item.src;
    await this.seek(Math.max(0, src));
    this.draw(t, item);
  }

  stop() {
    this.stopRequested = true;
  }

  destroy() {
    this.stopRequested = true;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    URL.revokeObjectURL(this.url);
    void this.audio?.close().catch(() => undefined);
  }

  /** Reproduce el Short; con record:true devuelve el archivo grabado */
  async play(opts: PlayOptions): Promise<Blob | null> {
    const tl = this.timeline;
    const plan = this.plan;
    if (!tl || !plan || !tl.items.length || this.running) return null;
    const audio = this.ensureAudio();
    const video = this.video;
    this.running = true;
    this.stopRequested = false;
    await audio.resume();
    try {
      await this.prepareSounds(audio, plan, tl);
    } catch (e) {
      this.running = false;
      throw e;
    }
    this.monitorGain!.gain.value = opts.monitor ? 1 : 0;
    this.voiceGain!.gain.value = 1;

    let index = 0;
    let item: TimelineItem = tl.items[0];
    await this.seek(item.kind === "play" ? item.srcStart : item.src);

    // Grabación: canvas a 30 fps + la mezcla de audio
    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    if (opts.record) {
      const mimeType = pickRecorderType();
      const stream = this.canvas.captureStream(30);
      this.recDest!.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      this.draw(0, item);
      recorder.start(500);
    }

    // Música: arranca con el Short y se corta un instante antes de los remates
    const vol = plan.music.mood === "ninguna" ? 0 : plan.music.volume;
    const start = audio.currentTime;
    if (this.sounds?.music && vol > 0) {
      const src = audio.createBufferSource();
      src.buffer = this.sounds.music.buffer;
      src.loop = this.sounds.music.loop;
      src.connect(this.musicGain!);
      src.start(start);
      this.sources.push(src);
      const g = this.musicGain!.gain;
      g.cancelScheduledValues(start);
      g.setValueAtTime(0, start);
      g.linearRampToValueAtTime(vol, start + 0.4);
    }
    const pendingSfx = tl.sfx
      .map((s) => {
        const buffer = this.sounds?.sfx[s.type];
        if (!buffer) return null;
        const lead = SFX_LEAD[s.type];
        const offset = lead === "end" ? buffer.duration - 0.05 : (lead ?? 0);
        return { at: s.outAt - offset, buffer, gain: SFX_GAIN[s.type] ?? 0.75 };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.at - b.at);
    const pendingCuts = [...tl.musicCuts].sort((a, b) => a - b);
    let fadedOut = false;

    const fireAudio = (t: number) => {
      const now = audio.currentTime;
      // Se agenda con 100 ms de anticipación en el reloj de audio: queda exacto aunque el cuadro llegue tarde
      while (pendingSfx.length && pendingSfx[0].at <= t + 0.1) {
        const s = pendingSfx.shift()!;
        const src = audio.createBufferSource();
        src.buffer = s.buffer;
        const g = audio.createGain();
        g.gain.value = s.gain;
        src.connect(g).connect(this.sfxBus!);
        const delay = s.at - t;
        if (delay >= 0) src.start(now + delay);
        else src.start(now, Math.min(-delay, s.buffer.duration - 0.01));
        this.sources.push(src);
      }
      while (pendingCuts.length && pendingCuts[0] - 0.08 <= t + 0.05 && vol > 0) {
        const c = pendingCuts.shift()!;
        const at = now + Math.max(0, c - 0.08 - t);
        const g = this.musicGain!.gain;
        g.cancelScheduledValues(at);
        g.setValueAtTime(vol, at);
        g.linearRampToValueAtTime(0, at + 0.06);
        g.setValueAtTime(0, at + 0.7);
        g.linearRampToValueAtTime(vol, at + 1.1);
      }
      if (!fadedOut && vol > 0 && t >= tl.duration - 1.2) {
        fadedOut = true;
        const g = this.musicGain!.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + Math.max(0.2, tl.duration - t));
      }
    };

    let freezeStart = 0;
    let hidden = false;
    const onVisibility = () => {
      if (document.hidden && opts.record) hidden = true;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const finish = async (): Promise<Blob | null> => {
      video.pause();
      for (const s of this.sources) {
        try {
          s.stop();
        } catch {
          // ya terminó
        }
      }
      this.sources = [];
      this.musicGain!.gain.cancelScheduledValues(audio.currentTime);
      this.musicGain!.gain.value = 0;
      document.removeEventListener("visibilitychange", onVisibility);
      let blob: Blob | null = null;
      if (recorder) {
        const rec = recorder;
        blob = await new Promise<Blob>((resolve) => {
          rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
          rec.stop();
        });
      }
      this.running = false;
      return blob;
    };

    /** Paso al siguiente tramo: continuo (sin buscar) o corte duro (pausa grabación y audio mientras busca) */
    const advance = async (): Promise<boolean> => {
      const next = tl.items[index + 1];
      if (!next) return false;
      index++;
      if (next.kind === "freeze") {
        video.pause();
        freezeStart = audio.currentTime;
        item = next;
        return true;
      }
      const contiguous = Math.abs(video.currentTime - next.srcStart) < 0.15;
      if (!contiguous) {
        recorder?.pause();
        video.pause();
        await audio.suspend();
        await this.seek(next.srcStart);
        await audio.resume();
        recorder?.resume();
      }
      this.voiceGain!.gain.setTargetAtTime(1, audio.currentTime, 0.008);
      item = next;
      await video.play();
      return true;
    };

    await video.play();

    return new Promise<Blob | null>((resolve, reject) => {
      const tick = async () => {
        if (this.stopRequested || hidden) {
          // Detenido a medias: no se entrega un archivo incompleto
          await finish();
          if (hidden) reject(new Error("Se detuvo porque cambiaste de pestaña. Deja esta pestaña visible mientras se renderiza."));
          else resolve(null);
          return;
        }
        let t: number;
        if (item.kind === "play") {
          const remaining = item.srcEnd - video.currentTime;
          const next = tl.items[index + 1];
          // Bajar la voz justo antes de un corte duro: no se cuela la primera sílaba del tramo siguiente
          if (remaining < 0.05 && next && next.kind === "play" && Math.abs(next.srcStart - item.srcEnd) > 0.15) {
            this.voiceGain!.gain.setTargetAtTime(0, audio.currentTime, 0.008);
          }
          if (remaining <= 0.017 || video.ended) {
            if (!(await advance())) {
              this.draw(tl.duration - 0.001, item);
              resolve(await finish());
              return;
            }
          }
          // advance() pudo cambiar el tramo actual (TypeScript no lo ve)
          const now = item as TimelineItem;
          t = now.kind === "play" ? now.outStart + Math.max(0, video.currentTime - now.srcStart) : now.outStart;
        } else {
          t = item.outStart + (audio.currentTime - freezeStart);
          if (t >= item.outEnd) {
            if (!(await advance())) {
              resolve(await finish());
              return;
            }
            t = item.outStart;
          }
        }
        fireAudio(t);
        this.draw(t, item);
        opts.onProgress?.(t, tl.duration);
        requestAnimationFrame(() => void tick().catch(reject));
      };
      requestAnimationFrame(() => void tick().catch(reject));
    });
  }

  // ---------- Dibujo ----------

  private look(t: number, item: TimelineItem): Look {
    const plan = this.plan!;
    const tl = this.timeline!;
    const look: Look = { zoom: 1, shakeX: 0, shakeY: 0, bw: 0, dark: 0, flash: 0, glitch: false };
    if (!plan.effectsOn) return look;
    // Cortes salteados: zoom alterno entre tramos (esconde el salto, como un editor)
    if (plan.segments.length > 1 && item.segment % 2 === 1) look.zoom *= 1.07;
    for (const e of tl.effects) {
      const p = t - e.outAt;
      if (p < 0 || p > e.duration + 0.15) continue;
      switch (e.type) {
        case "punch_in":
          look.zoom *= 1 + 0.2 * ramp(t, e.outAt, e.duration, 0.1, 0.15);
          break;
        case "slow_zoom":
          look.zoom *= 1 + 0.16 * clamp01(p / e.duration) * ramp(t, e.outAt, e.duration, 0.01, 0.3);
          break;
        case "shake": {
          const k = p <= e.duration ? 1 - p / e.duration : 0;
          const f = Math.floor(t * 30);
          look.shakeX += (hash(f) - 0.5) * 50 * k;
          look.shakeY += (hash(f + 99) - 0.5) * 50 * k;
          break;
        }
        case "bw":
          look.bw = Math.max(look.bw, ramp(t, e.outAt, e.duration, 0.15, 0.25));
          break;
        case "dark":
          look.dark = Math.max(look.dark, ramp(t, e.outAt, e.duration, 0.4, 0.4));
          break;
        case "flash":
          if (p <= e.duration) look.flash = Math.max(look.flash, 0.9 * (1 - p / e.duration));
          break;
        case "glitch":
          if (p <= e.duration) look.glitch = true;
          break;
        default:
          break;
      }
    }
    if (item.kind === "freeze") {
      const p = clamp01((t - item.outStart) / (item.outEnd - item.outStart));
      look.zoom *= 1.04 + 0.04 * p;
      look.bw = Math.max(look.bw, 0.35);
    }
    return look;
  }

  /** Recorte del cuadro original según el zoom y el foco */
  private sourceRect(aspect: number, zoom: number, t: number) {
    const plan = this.plan!;
    const vw = this.video.videoWidth || 1920;
    const vh = this.video.videoHeight || 1080;
    let w = Math.min(vw, vh * aspect);
    let h = w / aspect;
    w /= zoom;
    h /= zoom;
    // Pantalla completa: paneo lento (Ken Burns) alrededor del foco elegido
    const drift = plan.layout === "completo" ? Math.sin(t / 5) * vw * 0.025 : 0;
    const cx = (plan.layout === "completo" ? w / 2 + plan.focusX * (vw - w) : vw / 2 + (plan.focusX - 0.5) * (vw - w)) + drift;
    const x = Math.min(vw - w, Math.max(0, cx - w / 2));
    const y = Math.max(0, (vh - h) / 2);
    return { x, y, w, h };
  }

  private drawVideo(dx: number, dy: number, dw: number, dh: number, look: Look, t: number) {
    const c = this.ctx;
    const r = this.sourceRect(dw / dh, look.zoom, t);
    c.save();
    c.beginPath();
    c.rect(dx, dy, dw, dh);
    c.clip();
    c.drawImage(this.video, r.x, r.y, r.w, r.h, dx + look.shakeX, dy + look.shakeY, dw, dh);
    if (look.bw > 0) {
      // Blanco y negro con más contraste: la escena "especial"
      c.globalAlpha = look.bw;
      c.globalCompositeOperation = "saturation";
      c.fillStyle = "#808080";
      c.fillRect(dx, dy, dw, dh);
      c.globalCompositeOperation = "overlay";
      c.globalAlpha = look.bw * 0.35;
      c.fillStyle = "#000";
      c.fillRect(dx, dy, dw, dh);
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
    }
    const vignette = Math.max(look.dark, look.bw * 0.7);
    if (vignette > 0) {
      const g = c.createRadialGradient(dx + dw / 2, dy + dh / 2, Math.min(dw, dh) * 0.25, dx + dw / 2, dy + dh / 2, Math.max(dw, dh) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${0.85 * vignette})`);
      c.fillStyle = g;
      c.fillRect(dx, dy, dw, dh);
      c.fillStyle = `rgba(0,0,0,${0.25 * look.dark})`;
      c.fillRect(dx, dy, dw, dh);
    }
    if (look.glitch) {
      const f = Math.floor(t * 24);
      for (let i = 0; i < 6; i++) {
        const by = dy + hash(f * 7 + i) * dh;
        const bh = 10 + hash(f * 13 + i) * 60;
        const shift = (hash(f * 17 + i) - 0.5) * 120;
        c.drawImage(this.canvas, dx, by, dw, bh, dx + shift, by, dw, bh);
      }
      c.globalCompositeOperation = "screen";
      c.fillStyle = hash(f) > 0.5 ? "rgba(255,0,80,0.18)" : "rgba(0,220,255,0.18)";
      c.fillRect(dx, dy, dw, dh);
      c.globalCompositeOperation = "source-over";
    }
    c.restore();
  }

  private draw(t: number, item: TimelineItem) {
    const c = this.ctx;
    const plan = this.plan!;
    const look = this.look(t, item);
    c.fillStyle = "#000";
    c.fillRect(0, 0, OUT_W, OUT_H);

    let captionY: number;
    if (plan.layout === "completo") {
      this.drawVideo(0, 0, OUT_W, OUT_H, look, t);
      // Degradados para que los textos se lean sobre cualquier imagen
      const top = c.createLinearGradient(0, 0, 0, 560);
      top.addColorStop(0, "rgba(0,0,0,0.75)");
      top.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = top;
      c.fillRect(0, 0, OUT_W, 560);
      const bottom = c.createLinearGradient(0, 1050, 0, OUT_H);
      bottom.addColorStop(0, "rgba(0,0,0,0)");
      bottom.addColorStop(1, "rgba(0,0,0,0.6)");
      c.fillStyle = bottom;
      c.fillRect(0, 1050, OUT_W, OUT_H - 1050);
      this.drawTitle(t, 250, "top");
      captionY = 1290;
    } else {
      // Fondo: el mismo cuadro muy difuminado y oscuro (barato: se dibuja chico y se agranda)
      const vw = this.video.videoWidth || 1920;
      const vh = this.video.videoHeight || 1080;
      const sw = vh * (9 / 16);
      if (this.bgBlur) {
        // Se dibuja más grande que el lienzo para que el blur no deje bordes transparentes
        this.bgCtx.drawImage(this.video, (vw - sw) / 2, 0, sw, vh, -24, -24, this.bg.width + 48, this.bg.height + 48);
      } else {
        this.bgTinyCtx.drawImage(this.video, (vw - sw) / 2, 0, sw, vh, 0, 0, this.bgTiny.width, this.bgTiny.height);
        this.bgCtx.imageSmoothingQuality = "high";
        this.bgCtx.drawImage(this.bgTiny, 0, 0, this.bg.width, this.bg.height);
      }
      c.imageSmoothingQuality = "high";
      c.drawImage(this.bg, -40, -40, OUT_W + 80, OUT_H + 80);
      c.fillStyle = "rgba(6,6,10,0.72)";
      c.fillRect(0, 0, OUT_W, OUT_H);

      const aspect = 16 / 9 / plan.videoZoom;
      const boxH = Math.round(OUT_W / aspect);
      const boxY = Math.round(900 - boxH / 2);
      this.drawVideo(0, boxY, OUT_W, boxH, look, t);
      this.drawTitle(t, boxY - 60, "bottom");
      captionY = Math.min(1420, boxY + boxH + 170);
    }

    if (plan.captionsOn) this.drawCaption(t, captionY);
    this.drawPops(t);
    this.drawEnd(t);
    if (look.flash > 0) {
      c.fillStyle = `rgba(255,255,255,${look.flash})`;
      c.fillRect(0, 0, OUT_W, OUT_H);
    }
  }

  private isKey(word: string) {
    const w = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    return /\d/.test(w) || this.plan!.keywords.some((k) => k.toLowerCase().split(/\s+/).includes(w));
  }

  /** Título fijo (gancho en pantalla). anchor: dónde queda la línea de base del bloque */
  private drawTitle(t: number, y: number, anchor: "top" | "bottom") {
    const plan = this.plan!;
    const text = plan.hookText.trim();
    if (!text) return;
    const c = this.ctx;
    const size = 68;
    c.font = `900 ${size}px ${TITLE_FONT}`;
    const lines = wrap(c, text.toUpperCase(), 940);
    const lineH = size * 1.12;
    const blockH = lines.length * lineH;
    let top = anchor === "top" ? y : y - blockH;
    // Entrada con rebote en el primer medio segundo
    const pop = 0.85 + 0.15 * easeOut(clamp01(t / 0.35));
    c.save();
    c.translate(OUT_W / 2, top + blockH / 2);
    c.scale(pop, pop);
    c.translate(-OUT_W / 2, -(top + blockH / 2));
    c.textBaseline = "top";
    c.lineJoin = "round";
    for (const line of lines) {
      const words = line.split(" ");
      const widths = words.map((w) => c.measureText(w).width);
      const space = c.measureText(" ").width;
      let x = OUT_W / 2 - (widths.reduce((a, b) => a + b, 0) + space * (words.length - 1)) / 2;
      words.forEach((w, i) => {
        c.lineWidth = 14;
        c.strokeStyle = "rgba(0,0,0,0.9)";
        c.strokeText(w, x, top);
        c.fillStyle = this.isKey(w) ? YELLOW : "#FFFFFF";
        c.fillText(w, x, top);
        x += widths[i] + space;
      });
      top += lineH;
    }
    c.restore();
  }

  /** Subtítulos de 1-3 palabras: la palabra que suena se marca y las palabras clave van en amarillo */
  private drawCaption(t: number, y: number) {
    const chunk = this.timeline!.captions.find((ch: CaptionChunk) => t >= ch.start && t < ch.end);
    if (!chunk) return;
    const c = this.ctx;
    let size = 84;
    c.font = `900 ${size}px ${TITLE_FONT}`;
    const words = chunk.words.map((w) => w.text.toUpperCase());
    const space = size * 0.3;
    let widths = words.map((w) => c.measureText(w).width);
    let total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    if (total > 980) {
      size = Math.floor(size * (980 / total));
      c.font = `900 ${size}px ${TITLE_FONT}`;
      widths = words.map((w) => c.measureText(w).width);
      total = widths.reduce((a, b) => a + b, 0) + size * 0.3 * (words.length - 1);
    }
    const pop = 0.8 + 0.2 * easeOut(clamp01((t - chunk.start) / 0.09));
    c.save();
    c.translate(OUT_W / 2, y);
    c.scale(pop, pop);
    c.textBaseline = "middle";
    c.lineJoin = "round";
    let x = -total / 2;
    chunk.words.forEach((w, i) => {
      // Una sola palabra marcada; la última sigue marcada hasta que cambia el grupo
      const active = t >= w.start && (t < w.end || i === chunk.words.length - 1);
      if (active) {
        c.fillStyle = YELLOW;
        roundRect(c, x - 14, -size * 0.62, widths[i] + 28, size * 1.2, 18);
        c.fill();
        c.fillStyle = "#111";
        c.fillText(words[i], x, 2);
      } else {
        c.lineWidth = 16;
        c.strokeStyle = "#000";
        c.strokeText(words[i], x, 2);
        c.fillStyle = w.key ? YELLOW : "#FFFFFF";
        c.fillText(words[i], x, 2);
      }
      x += widths[i] + size * 0.3;
    });
    c.restore();
  }

  /** Textos gigantes ("300 AÑOS", "CULPABLE") con golpe de entrada */
  private drawPops(t: number) {
    const plan = this.plan!;
    if (!plan.effectsOn) return;
    const c = this.ctx;
    for (const e of this.timeline!.effects) {
      if (e.type !== "text_pop" || t < e.outAt || t > e.outAt + e.duration) continue;
      const p = t - e.outAt;
      const scale = p < 0.12 ? 1.6 - 0.6 * easeOut(p / 0.12) : 1 + 0.03 * Math.sin(p * 8);
      const alpha = clamp01((e.duration - p) / 0.15);
      let size = 190;
      c.font = `${size}px ${POP_FONT}`;
      const w = c.measureText(e.text).width;
      if (w > 960) {
        size = Math.floor(size * (960 / w));
        c.font = `${size}px ${POP_FONT}`;
      }
      c.save();
      c.globalAlpha = alpha;
      c.translate(OUT_W / 2, plan.layout === "completo" ? 860 : 900);
      c.rotate(-0.05);
      c.scale(scale, scale);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
      c.lineWidth = 22;
      c.strokeStyle = "#000";
      c.strokeText(e.text, 0, 0);
      c.fillStyle = YELLOW;
      c.fillText(e.text, 0, 0);
      c.restore();
    }
  }

  /** Llamado final al video completo */
  private drawEnd(t: number) {
    const plan = this.plan!;
    const text = plan.endText.trim();
    const total = this.timeline!.duration;
    if (!text || t < total - 2) return;
    const c = this.ctx;
    const alpha = easeOut(clamp01((t - (total - 2)) / 0.3));
    c.save();
    c.globalAlpha = alpha;
    c.font = `800 46px ${TITLE_FONT}`;
    const label = `${text} ↓`;
    const w = c.measureText(label).width + 64;
    const y = 1530;
    c.fillStyle = "rgba(0,0,0,0.75)";
    roundRect(c, OUT_W / 2 - w / 2, y - 42, w, 84, 42);
    c.fill();
    c.strokeStyle = YELLOW;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, OUT_W / 2, y + 2);
    c.restore();
  }
}

function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Extensión del archivo según lo que grabó el navegador */
export const renderExtension = (blob: Blob) => (blob.type.includes("mp4") ? "mp4" : "webm");
