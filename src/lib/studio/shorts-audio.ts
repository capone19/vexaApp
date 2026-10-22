// ============================================
// VEXA Content Studio - Sonidos de los Shorts
// ============================================
// Por defecto suenan la música y los efectos de la biblioteca incluida (shorts-library.ts). Si el creador sube
// sus propios archivos en "Sonidos", se usan esos. Los sintetizados en el navegador (Web Audio) quedan para
// los efectos que la biblioteca no trae y por si un archivo no carga.

import { hasMusicBed, listAudio, type AudioAsset, type BedMood, type MusicMood, type SfxKind } from "./shorts";
import { musicUrl, SFX_LIBRARY, sfxUrl, trackFor } from "./shorts-library";

export const SAMPLE_RATE = 48000;

/** Azar con semilla: el mismo Short suena igual cada vez que se renderiza */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

async function render(seconds: number, build: (ctx: OfflineAudioContext, out: AudioNode) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  build(ctx, comp);
  return ctx.startRendering();
}

function noise(ctx: BaseAudioContext, seconds: number, seed = 7): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = rng(seed);
  for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function gainNode(ctx: BaseAudioContext, value = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

/** Envolvente: sube en `attack` y cae exponencialmente hasta `t + dur` */
function envelope(param: AudioParam, t: number, peak: number, attack: number, dur: number) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
}

function softClip(ctx: BaseAudioContext, amount = 2.5): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  shaper.curve = curve;
  return shaper;
}

// ---------- Efectos de sonido ----------

const SFX_BUILDERS: Record<SfxKind, { seconds: number; build: (ctx: OfflineAudioContext, out: AudioNode) => void }> = {
  whoosh: {
    seconds: 0.8,
    build(ctx, out) {
      const src = noise(ctx, 0.8, 11);
      const bp = filter(ctx, "bandpass", 300, 1.4);
      bp.frequency.setValueAtTime(250, 0);
      bp.frequency.exponentialRampToValueAtTime(3800, 0.36);
      bp.frequency.exponentialRampToValueAtTime(450, 0.78);
      const g = gainNode(ctx, 0);
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.linearRampToValueAtTime(1.1, 0.34);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.78);
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.8, 0);
      pan.pan.linearRampToValueAtTime(0.8, 0.78);
      src.connect(bp).connect(g).connect(pan).connect(out);
      src.start(0);
    },
  },
  impact: {
    seconds: 1.8,
    build(ctx, out) {
      const clip = softClip(ctx, 3);
      clip.connect(out);
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(130, 0);
      osc.frequency.exponentialRampToValueAtTime(42, 0.28);
      const og = gainNode(ctx, 0);
      envelope(og.gain, 0, 1, 0.005, 1.6);
      osc.connect(og).connect(clip);
      osc.start(0);
      osc.stop(1.8);
      const n = noise(ctx, 0.4, 3);
      const lp = filter(ctx, "lowpass", 2200);
      const ng = gainNode(ctx, 0);
      envelope(ng.gain, 0, 0.9, 0.002, 0.3);
      n.connect(lp).connect(ng).connect(clip);
      n.start(0);
    },
  },
  boom: {
    seconds: 3.2,
    build(ctx, out) {
      const clip = softClip(ctx, 2);
      clip.connect(out);
      for (const [from, to, peak] of [
        [80, 32, 1],
        [45, 28, 0.7],
      ]) {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(from, 0);
        osc.frequency.exponentialRampToValueAtTime(to, 0.7);
        const g = gainNode(ctx, 0);
        envelope(g.gain, 0, peak, 0.01, 3);
        osc.connect(g).connect(clip);
        osc.start(0);
        osc.stop(3.2);
      }
      const n = noise(ctx, 3, 5);
      const lp = filter(ctx, "lowpass", 500);
      const ng = gainNode(ctx, 0);
      envelope(ng.gain, 0, 0.7, 0.01, 2.6);
      n.connect(lp).connect(ng).connect(clip);
      n.start(0);
    },
  },
  hit: {
    seconds: 0.5,
    build(ctx, out) {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(190, 0);
      osc.frequency.exponentialRampToValueAtTime(60, 0.09);
      const g = gainNode(ctx, 0);
      envelope(g.gain, 0, 0.9, 0.003, 0.32);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.5);
      const n = noise(ctx, 0.1, 9);
      const hp = filter(ctx, "highpass", 2500);
      const ng = gainNode(ctx, 0);
      envelope(ng.gain, 0, 0.5, 0.001, 0.05);
      n.connect(hp).connect(ng).connect(out);
      n.start(0);
    },
  },
  riser: {
    seconds: 2.4,
    build(ctx, out) {
      const end = 2.35;
      const n = noise(ctx, 2.4, 13);
      const bp = filter(ctx, "bandpass", 300, 5);
      bp.frequency.setValueAtTime(300, 0);
      bp.frequency.exponentialRampToValueAtTime(7500, end);
      const ng = gainNode(ctx, 0);
      ng.gain.setValueAtTime(0.02, 0);
      ng.gain.exponentialRampToValueAtTime(1.2, end);
      ng.gain.linearRampToValueAtTime(0, 2.4);
      n.connect(bp).connect(ng).connect(out);
      n.start(0);
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, 0);
      osc.frequency.exponentialRampToValueAtTime(880, end);
      const lp = filter(ctx, "lowpass", 1800);
      const og = gainNode(ctx, 0);
      og.gain.setValueAtTime(0.001, 0);
      og.gain.exponentialRampToValueAtTime(0.18, end);
      og.gain.linearRampToValueAtTime(0, 2.4);
      osc.connect(lp).connect(og).connect(out);
      osc.start(0);
      osc.stop(2.4);
    },
  },
  reverse: {
    seconds: 1.8,
    build(ctx, out) {
      const n = noise(ctx, 1.8, 17);
      const hp = filter(ctx, "highpass", 3200);
      const g = gainNode(ctx, 0);
      g.gain.setValueAtTime(0.001, 0);
      g.gain.exponentialRampToValueAtTime(1, 1.74);
      g.gain.linearRampToValueAtTime(0, 1.8);
      n.connect(hp).connect(g).connect(out);
      n.start(0);
    },
  },
  ticking: {
    seconds: 2.1,
    build(ctx, out) {
      const hp = filter(ctx, "highpass", 1200);
      hp.connect(out);
      [0, 0.5, 1, 1.5].forEach((t, i) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = i % 2 ? 1700 : 2300;
        const g = gainNode(ctx, 0);
        envelope(g.gain, t, 0.5, 0.001, 0.045);
        osc.connect(g).connect(hp);
        osc.start(t);
        osc.stop(t + 0.06);
      });
    },
  },
  heartbeat: {
    seconds: 1.8,
    build(ctx, out) {
      const lp = filter(ctx, "lowpass", 160);
      lp.connect(out);
      [
        [0, 1],
        [0.26, 0.75],
        [0.88, 1],
        [1.14, 0.75],
      ].forEach(([t, peak]) => {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(75, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.15);
        const g = gainNode(ctx, 0);
        envelope(g.gain, t, peak * 1.4, 0.008, 0.2);
        osc.connect(g).connect(lp);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    },
  },
  glitch: {
    seconds: 0.5,
    build(ctx, out) {
      const rand = rng(23);
      const osc = ctx.createOscillator();
      osc.type = "square";
      const g = gainNode(ctx, 0);
      for (let t = 0; t < 0.45; t += 0.03) {
        osc.frequency.setValueAtTime(150 + rand() * 1800, t);
        g.gain.setValueAtTime(rand() > 0.35 ? 0.22 : 0, t);
      }
      g.gain.setValueAtTime(0, 0.45);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.5);
      const n = noise(ctx, 0.5, 29);
      const ng = gainNode(ctx, 0);
      for (let t = 0; t < 0.45; t += 0.025) ng.gain.setValueAtTime(rand() > 0.5 ? 0.25 : 0, t);
      ng.gain.setValueAtTime(0, 0.45);
      n.connect(ng).connect(out);
      n.start(0);
    },
  },
  camera: {
    seconds: 0.4,
    build(ctx, out) {
      [
        [0, 3800],
        [0.11, 1600],
      ].forEach(([t, freq], i) => {
        const n = noise(ctx, 0.1, 31 + i);
        const bp = filter(ctx, "bandpass", freq, 2);
        const g = gainNode(ctx, 0);
        envelope(g.gain, t, 1.2, 0.001, 0.06);
        n.connect(bp).connect(g).connect(out);
        n.start(t);
      });
    },
  },
  pop: {
    seconds: 0.25,
    build(ctx, out) {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(900, 0);
      osc.frequency.exponentialRampToValueAtTime(220, 0.07);
      const g = gainNode(ctx, 0);
      envelope(g.gain, 0, 0.7, 0.002, 0.12);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.25);
    },
  },
  ding: {
    seconds: 1.4,
    build(ctx, out) {
      [
        [1318.5, 0.35],
        [2637, 0.12],
      ].forEach(([freq, peak]) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = gainNode(ctx, 0);
        envelope(g.gain, 0, peak, 0.003, 1.3);
        osc.connect(g).connect(out);
        osc.start(0);
        osc.stop(1.4);
      });
    },
  },
};

const sfxCache = new Map<SfxKind, Promise<AudioBuffer>>();

function synthSfx(kind: SfxKind): Promise<AudioBuffer> {
  let cached = sfxCache.get(kind);
  if (!cached) {
    const { seconds, build } = SFX_BUILDERS[kind];
    cached = render(seconds, build);
    sfxCache.set(kind, cached);
  }
  return cached;
}

// ---------- Música de fondo ----------

const NOTE = (n: number) => 440 * 2 ** ((n - 69) / 12);

function tone(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  midi: number,
  dur: number,
  opts: { type?: OscillatorType; peak?: number; attack?: number; detune?: number; cutoff?: number } = {}
) {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "triangle";
  osc.frequency.value = NOTE(midi);
  osc.detune.value = opts.detune ?? 0;
  const g = gainNode(ctx, 0);
  envelope(g.gain, t, opts.peak ?? 0.3, opts.attack ?? 0.005, dur);
  if (opts.cutoff) {
    osc.connect(filter(ctx, "lowpass", opts.cutoff)).connect(g).connect(out);
  } else {
    osc.connect(g).connect(out);
  }
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function echo(ctx: BaseAudioContext, out: AudioNode, time: number, feedback: number): AudioNode {
  const input = gainNode(ctx, 1);
  const delay = ctx.createDelay(2);
  delay.delayTime.value = time;
  const fb = gainNode(ctx, feedback);
  const wet = gainNode(ctx, 0.5);
  input.connect(out);
  input.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
  return input;
}

function drum(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, seed: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(95, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  const g = gainNode(ctx, 0);
  envelope(g.gain, t, peak, 0.004, 0.55);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.6);
  const n = noise(ctx, 0.25, seed);
  const lp = filter(ctx, "lowpass", 900);
  const ng = gainNode(ctx, 0);
  envelope(ng.gain, t, peak * 0.5, 0.002, 0.18);
  n.connect(lp).connect(ng).connect(out);
  n.start(t);
}

function hat(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, seed: number) {
  const n = noise(ctx, 0.06, seed);
  const hp = filter(ctx, "highpass", 7000);
  const g = gainNode(ctx, 0);
  envelope(g.gain, t, peak, 0.001, 0.04);
  n.connect(hp).connect(g).connect(out);
  n.start(t);
}

type SynthMood = "curiosidad" | "misterio" | "tension" | "epica";

/** Si una canción de la biblioteca no carga, suena la sintetizada más parecida */
const SYNTH_FALLBACK: Record<BedMood, SynthMood> = {
  curiosidad: "curiosidad",
  explicacion: "curiosidad",
  misterio: "misterio",
  suspenso: "misterio",
  morbo: "misterio",
  tragedia: "misterio",
  tension: "tension",
  polemica: "tension",
  epica: "epica",
};

const MOODS: Record<SynthMood, (ctx: OfflineAudioContext, out: AudioNode, seconds: number) => void> = {
  // Pizzicato juguetón en re menor: datos curiosos y absurdos
  curiosidad(ctx, out, seconds) {
    const beat = 60 / 112;
    const wet = echo(ctx, out, beat * 0.75, 0.3);
    const bars = [
      [62, 65, 69, 65, 64, 67, 70, 67],
      [62, 65, 69, 65, 61, 64, 69, 64],
      [58, 62, 65, 62, 57, 60, 64, 60],
      [57, 61, 64, 61, 57, 61, 64, 67],
    ];
    const bass = [38, 38, 34, 33];
    for (let bar = 0, t = 0; t < seconds; bar++, t += beat * 4) {
      const notes = bars[bar % bars.length];
      notes.forEach((n, i) => tone(ctx, wet, t + (i * beat) / 2, n + 12, 0.18, { peak: 0.16 }));
      tone(ctx, out, t, bass[bar % bass.length], beat * 1.5, { type: "sine", peak: 0.35 });
      tone(ctx, out, t + beat * 2, bass[bar % bass.length] + 7, beat * 1.5, { type: "sine", peak: 0.3 });
      for (let i = 0; i < 8; i++) hat(ctx, out, t + (i * beat) / 2, i % 2 ? 0.04 : 0.07, bar * 8 + i);
    }
  },
  // Colchón oscuro y lento con campanas: secretos, lo desconocido
  misterio(ctx, out, seconds) {
    const chord = 4;
    const chords = [
      [45, 57, 60, 64],
      [41, 53, 57, 60],
      [38, 50, 53, 57],
      [40, 52, 56, 59],
    ];
    const wet = echo(ctx, out, 0.42, 0.45);
    const rand = rng(41);
    for (let i = 0, t = 0; t < seconds; i++, t += chord) {
      for (const n of chords[i % chords.length]) {
        for (const detune of [-7, 7]) {
          tone(ctx, out, t, n, chord + 0.6, { type: "sawtooth", peak: n < 48 ? 0.08 : 0.035, attack: 1.2, detune, cutoff: 650 });
        }
      }
      const pent = [69, 72, 74, 76, 79, 81];
      for (let k = 0; k < 2; k++) {
        tone(ctx, wet, t + 0.5 + rand() * (chord - 1), pent[Math.floor(rand() * pent.length)], 2.2, { type: "sine", peak: 0.1, attack: 0.003 });
      }
    }
  },
  // Pulso grave, disonancia aguda que crece: peligro, castigos, cuenta regresiva
  tension(ctx, out, seconds) {
    const beat = 60 / 120;
    for (const [n, peak] of [
      [33, 0.14],
      [45, 0.08],
    ]) {
      tone(ctx, out, 0, n, seconds, { type: "sawtooth", peak, attack: 1.5, cutoff: 320 });
    }
    for (let t = 0, i = 0; t < seconds; t += beat, i++) {
      const grow = Math.min(1, t / seconds + 0.3);
      drum(ctx, out, t, 0.45 * grow, 100 + i);
      for (let k = 0; k < 4; k++) hat(ctx, out, t + (k * beat) / 4, 0.025 * grow, 300 + i * 4 + k);
    }
    // Trémolo de cuerdas (segunda menor) que sube de volumen
    for (const n of [81, 82]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = NOTE(n);
      const trem = gainNode(ctx, 0);
      for (let t = 0; t < seconds; t += 1 / 16) {
        const level = 0.012 + 0.04 * (t / seconds);
        trem.gain.setValueAtTime(level, t);
        trem.gain.setValueAtTime(level * 0.2, t + 1 / 32);
      }
      osc.connect(trem).connect(out);
      osc.start(0);
      osc.stop(seconds);
    }
  },
  // Tambores y bronces: batallas, imperios, triunfo
  epica(ctx, out, seconds) {
    const beat = 60 / 90;
    const bar = beat * 4;
    const chords = [
      [50, 57, 62, 65],
      [46, 53, 58, 62],
      [53, 57, 60, 65],
      [48, 55, 60, 64],
    ];
    for (let i = 0, t = 0; t < seconds; i++, t += bar) {
      for (const n of chords[i % chords.length]) {
        for (const detune of [-9, 0, 9]) {
          tone(ctx, out, t, n, bar + 0.3, { type: "sawtooth", peak: 0.03, attack: 0.9, detune, cutoff: 1400 });
        }
      }
      tone(ctx, out, t, chords[i % chords.length][0] - 12, bar, { type: "sine", peak: 0.3, attack: 0.05 });
      [0, 1.5, 2, 3, 3.5].forEach((b, k) => drum(ctx, out, t + b * beat, k === 0 ? 0.9 : 0.6, 500 + i * 8 + k));
    }
  },
};

async function synthMusic(mood: BedMood, seconds: number): Promise<AudioBuffer> {
  const length = seconds + 1.5;
  return render(length, (ctx, out) => {
    const master = gainNode(ctx, 0);
    master.gain.setValueAtTime(0, 0);
    master.gain.linearRampToValueAtTime(0.9, 0.6);
    master.gain.setValueAtTime(0.9, length - 1.6);
    master.gain.linearRampToValueAtTime(0, length);
    master.connect(out);
    MOODS[SYNTH_FALLBACK[mood]](ctx, master, length);
  });
}

// ---------- Biblioteca incluida ----------

// Se baja y decodifica una vez por sesión: el AudioBuffer sirve en cualquier contexto de audio
const libraryCache = new Map<string, Promise<AudioBuffer>>();

function loadLibrary(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  let cached = libraryCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo bajar ${url}`);
        return res.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data));
    // Si falló (sin conexión) se vuelve a intentar la próxima vez
    cached.catch(() => libraryCache.delete(url));
    libraryCache.set(url, cached);
  }
  return cached;
}

// ---------- Archivos propios del creador ----------

async function decodeFile(ctx: BaseAudioContext, file: File): Promise<AudioBuffer> {
  return ctx.decodeAudioData(await file.arrayBuffer());
}

export interface ShortSounds {
  music: { buffer: AudioBuffer; loop: boolean } | null;
  sfx: Partial<Record<SfxKind, AudioBuffer>>;
}

/** Junta la música y los efectos que usa un Short: los del creador si los subió, si no los de la biblioteca incluida */
export async function loadSounds(
  ctx: BaseAudioContext,
  opts: { mood: MusicMood; track?: string; seconds: number; sfx: SfxKind[]; seed: number }
): Promise<ShortSounds> {
  const own = await listAudio().catch(() => [] as AudioAsset[]);
  // Los primeros valores casi no cambian entre semillas cercanas: se descartan
  const next = rng(opts.seed);
  next();
  next();
  const random = next();
  const pick = (kind: AudioAsset["kind"], tag: string) => {
    const options = own.filter((a) => a.kind === kind && a.tag === tag);
    return options.length ? options[Math.floor(random * options.length)] : null;
  };

  let music: ShortSounds["music"] = null;
  const mood = opts.mood;
  if (hasMusicBed(mood)) {
    const file = pick("music", mood);
    // Una canción elegida a mano en el plan gana a los archivos propios
    music = file && !opts.track
      ? { buffer: await decodeFile(ctx, file.file), loop: true }
      : await loadLibrary(ctx, musicUrl(trackFor(mood, opts.track, random).file))
          .then((buffer) => ({ buffer, loop: true }))
          .catch(async () => ({ buffer: await synthMusic(mood, opts.seconds), loop: false }));
  }

  const sfx: ShortSounds["sfx"] = {};
  for (const kind of [...new Set(opts.sfx)]) {
    const file = pick("sfx", kind);
    const variants = SFX_LIBRARY[kind] ?? 0;
    const included = () => (variants ? loadLibrary(ctx, sfxUrl(kind, 1 + (Math.floor(random * variants) % variants))) : synthSfx(kind));
    sfx[kind] = await (file ? decodeFile(ctx, file.file) : included()).catch(() => synthSfx(kind));
  }
  return { music, sfx };
}

/** Escuchar un sonido en la biblioteca */
export async function previewSound(
  target: { kind: "music"; mood: BedMood; track: string } | { kind: "sfx"; type: SfxKind; variant?: number } | { file: File }
) {
  const ctx = new AudioContext();
  const variants = "type" in target ? (SFX_LIBRARY[target.type] ?? 0) : 0;
  const buffer =
    "file" in target
      ? await decodeFile(ctx, target.file)
      : target.kind === "music"
        ? await loadLibrary(ctx, musicUrl(target.track))
        : variants
          ? await loadLibrary(ctx, sfxUrl(target.type, Math.min(target.variant ?? 1, variants)))
          : await synthSfx(target.type);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  const stop = () => {
    try {
      src.stop();
    } catch {
      // ya terminó
    }
    void ctx.close();
  };
  src.onended = stop;
  return stop;
}
