// ============================================
// VEXA Content Studio - Biblioteca de sonidos incluida en los Shorts
// ============================================
// Selección de la Biblioteca de audio de YouTube (licencia YouTube: sin atribución, también monetizado).
// Vive en public/audio/shorts: la música recortada a 62 s (un Short dura hasta 59) y nivelada a -16 LUFS,
// y los efectos nivelados por tipo para que peguen como los sintetizados.
// Fuera de YouTube la licencia no los cubre: en Instagram el riesgo es bajo; no usar en anuncios pagados de Meta.

import type { BedMood, SfxKind } from "./shorts";

export interface LibraryTrack {
  /** Nombre del archivo sin extensión (también es el id que guarda el plan) */
  file: string;
  title: string;
  artist: string;
}

const AUDIO_BASE = "/audio/shorts";

export const MUSIC_LIBRARY: Record<BedMood, LibraryTrack[]> = {
  // Brillante y juguetona: ¿sabías que…?, datos absurdos
  curiosidad: [
    { file: "curiosidad-why-oh-why", title: "Why Oh Why", artist: "The Soundlings" },
    { file: "curiosidad-classic-1985-movie-soundtrac", title: "Classic 1985 Movie Soundtrack", artist: "Freedom Trail Studio" },
    { file: "curiosidad-drifting-sands", title: "Drifting Sands", artist: "JAde Wii" },
    { file: "curiosidad-a-single-step", title: "A Single Step", artist: "Density & Time" },
  ],
  // Ambiente calmo y enigmático: secretos, lo desconocido
  misterio: [
    { file: "misterio-underwater-exploration", title: "Underwater Exploration", artist: "Godmode" },
    { file: "misterio-there-s-life-out-there", title: "There's Life Out There", artist: "Cooper Cannell" },
    { file: "misterio-interplanetary-alignment", title: "Interplanetary Alignment", artist: "NoMBe" },
    { file: "misterio-cold-blue", title: "Cold Blue", artist: "Astron" },
  ],
  // Oscura y sin batería: algo malo está por pasar
  suspenso: [
    { file: "suspenso-lurking-shadows", title: "Lurking Shadows", artist: "Myuu" },
    { file: "suspenso-time-stops", title: "Time Stops", artist: "Silent Partner" },
    { file: "suspenso-anxious", title: "Anxious", artist: "Sextile" },
    { file: "suspenso-a-great-darkness-approaches", title: "A Great Darkness Approaches, Can You Feel It?", artist: "ELPHNT" },
  ],
  // Dramática con pulso: peligro, castigos, cuenta regresiva
  tension: [
    { file: "tension-time-is-running-out", title: "Time Is Running Out", artist: "Jeremy Korpas" },
    { file: "tension-fall-of-the-dynasty", title: "Fall Of The Dynasty", artist: "Asher Fulero" },
    { file: "tension-look-can-you-hear-me", title: "Look, Can You Hear Me", artist: "Text Me Records / Leviathe" },
    { file: "tension-percolate", title: "Percolate", artist: "Loopop" },
  ],
  // Neutra y constante para hablar encima: explicar cómo funcionaba algo
  explicacion: [
    { file: "explicacion-view-of-the-valley", title: "View of the Valley", artist: "Trevor Garrod" },
    { file: "explicacion-first-dream", title: "First Dream", artist: "Brian Bolger" },
    { file: "explicacion-colony", title: "Colony", artist: "TrackTribe" },
    { file: "explicacion-nebular-focus", title: "Nebular Focus", artist: "Dan Henig" },
  ],
  // Picante e irónica: escándalos, injusticias, "¿quién tenía razón?"
  polemica: [
    { file: "polemica-the-attraction-of-evil", title: "The Attraction Of Evil", artist: "Hainbach" },
    { file: "polemica-slow-tango", title: "Slow Tango", artist: "Andrew Huang" },
    { file: "polemica-burlesque", title: "Burlesque", artist: "National Sweetheart" },
    { file: "polemica-sui-generis", title: "Sui Generis", artist: "Alex Hamlin" },
  ],
  // Inquietante y macabra: muertes raras, torturas, lo morboso
  morbo: [
    { file: "morbo-doll-dancing", title: "Doll Dancing", artist: "Puddle of Infinity" },
    { file: "morbo-spirit-of-the-dead", title: "Spirit of the Dead", artist: "Aakash Gandhi" },
    { file: "morbo-black-mass", title: "Black Mass", artist: "Brian Bolger" },
    { file: "morbo-zombie-march", title: "Zombie March", artist: "Sir Cubworth" },
  ],
  // Grande: batallas, imperios, triunfo
  epica: [
    { file: "epica-deified", title: "Deified", artist: "The Grey Room / Density & Time" },
    { file: "epica-end-of-valor", title: "End Of Valor", artist: "Density & Time" },
    { file: "epica-temple-of-treasures", title: "Temple of treasures", artist: "Patrick Patrikios" },
    { file: "epica-lyra-mortis", title: "Lyra Mortis", artist: "Loopop" },
  ],
  // Triste: finales trágicos, pérdidas
  tragedia: [
    { file: "tragedia-melancholia", title: "Melancholia", artist: "Godmode" },
    { file: "tragedia-ponderous-days", title: "Ponderous Days", artist: "Joel Cummins" },
    { file: "tragedia-pretty-filmscore", title: "Pretty Filmscore", artist: "Freedom Trail Studio" },
    { file: "tragedia-rain-fuse", title: "Rain Fuse", artist: "French Fuse" },
  ],
};

/** Cuántas variantes trae cada efecto (sfx/<tipo>-<n>.mp3). Latido, glitch y cámara siguen sintetizados. */
export const SFX_LIBRARY: Partial<Record<SfxKind, number>> = {
  whoosh: 2,
  impact: 3,
  boom: 2,
  hit: 3,
  riser: 2,
  reverse: 1,
  ticking: 1,
  pop: 1,
  ding: 3,
};

export const musicUrl = (file: string) => `${AUDIO_BASE}/musica/${file}.mp3`;
export const sfxUrl = (kind: SfxKind, n: number) => `${AUDIO_BASE}/sfx/${kind}-${n}.mp3`;

export function findTrack(mood: BedMood, file: string | undefined): LibraryTrack | null {
  return MUSIC_LIBRARY[mood].find((t) => t.file === file) ?? null;
}

/** La canción del Short: la elegida o una del ánimo según la semilla (el mismo Short suena siempre igual) */
export function trackFor(mood: BedMood, file: string | undefined, random: number): LibraryTrack {
  const list = MUSIC_LIBRARY[mood];
  return findTrack(mood, file) ?? list[Math.floor(random * list.length) % list.length];
}
