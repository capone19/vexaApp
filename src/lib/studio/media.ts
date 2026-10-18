// ============================================
// VEXA Content Studio - Lectura local del video (en el navegador)
// ============================================
// Nada de esto sube el video a ningún servidor: se leen la duración, unos cuadros de muestra y,
// solo si el creador lo pide, el audio comprimido a 16 kHz mono para transcribirlo.

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const release = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    video.onloadeddata = () => resolve({ video, release });
    video.onerror = () => {
      release();
      reject(new Error("El navegador no pudo leer este video."));
    };
  });
}

export async function getVideoInfo(file: File): Promise<VideoInfo> {
  const { video, release } = await loadVideo(file);
  const info = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
  release();
  return info;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}

/** Cuadros JPEG (data URL) repartidos a lo largo del video, para dar contexto visual a la IA */
export async function captureFrames(file: File, count = 4, width = 512): Promise<string[]> {
  const { video, release } = await loadVideo(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * width) || width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      await seek(video, (video.duration * (i + 0.5)) / count);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return frames;
  } finally {
    release();
  }
}

export interface AudioChunk {
  blob: Blob;
  /** segundo del video donde empieza el trozo */
  offset: number;
}

const SAMPLE_RATE = 16000;
/** 10 min de WAV 16 kHz mono ≈ 19 MB, bajo el límite de 25 MB de Whisper */
const CHUNK_SECONDS = 600;
const MAX_FILE_BYTES = 1.5 * 1024 ** 3;

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Saca el audio del video, lo pasa a 16 kHz mono y lo corta en trozos de hasta 10 minutos */
export async function extractAudioChunks(file: File): Promise<AudioChunk[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("El video es demasiado pesado para transcribirlo en el navegador. Sube su archivo de subtítulos (.srt).");
  }
  // decodeAudioData remuestrea a la frecuencia del contexto
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  const mono = new Float32Array(decoded.length);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
  }
  const chunkLength = CHUNK_SECONDS * SAMPLE_RATE;
  const chunks: AudioChunk[] = [];
  for (let start = 0; start < mono.length; start += chunkLength) {
    chunks.push({ blob: encodeWav(mono.subarray(start, start + chunkLength)), offset: start / SAMPLE_RATE });
  }
  return chunks;
}
