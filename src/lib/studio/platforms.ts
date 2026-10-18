// ============================================
// VEXA Content Studio - Plataformas y acciones
// ============================================

import {
  CalendarClock,
  Captions,
  ChartLine,
  Clapperboard,
  Layers,
  MessageCircle,
  Repeat2,
  Scissors,
  Upload,
  WandSparkles,
} from "lucide-react";
import type { PlatformAction, PlatformId, PostFormat } from "./types";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  tagline: string;
  /** Clases Tailwind para el chip/ícono de la plataforma */
  chipClassName: string;
  /** Gradiente para tarjetas destacadas */
  gradientClassName: string;
  formats: PostFormat[];
  actions: PlatformAction[];
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    tagline: "Videos largos, Shorts y metadatos optimizados",
    chipClassName: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
    gradientClassName: "from-red-500/25 via-fuchsia-500/10 to-transparent",
    formats: ["video", "short"],
    actions: [
      {
        id: "subir-video",
        title: "Subir video",
        description: "Sube un video o Short con título, descripción, tags, subtítulos y miniatura. La IA los rellena por ti.",
        icon: Upload,
        ai: true,
        availability: "disponible",
        format: "video",
        n8nEvent: "youtube.video.upload",
      },
      {
        id: "programar",
        title: "Programar publicación",
        description: "Arma la semana completa en el calendario: frecuencia, horarios y cada video listo para salir solo.",
        icon: CalendarClock,
        availability: "disponible",
        n8nEvent: "youtube.video.schedule",
        href: "/studio/youtube/programar",
      },
      {
        id: "analisis",
        title: "Análisis del canal",
        description: "Si vas en alza o en baja, qué videos están ganando y qué hacer para crecer.",
        icon: ChartLine,
        availability: "disponible",
        n8nEvent: "youtube.analytics",
        href: "/studio/youtube/analisis",
      },
      {
        id: "video-a-shorts",
        title: "Convertir en Shorts",
        description: "La IA detecta los mejores momentos del video y genera Shorts verticales.",
        icon: Scissors,
        ai: true,
        availability: "proximamente",
        format: "short",
        n8nEvent: "youtube.video.to_shorts",
      },
      {
        id: "responder-comentarios",
        title: "Responder comentarios",
        description: "Respuestas sugeridas por IA con el tono de tu canal.",
        icon: MessageCircle,
        ai: true,
        availability: "proximamente",
        n8nEvent: "youtube.comments.reply",
      },
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    tagline: "Reels, carruseles y stories",
    chipClassName: "bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30",
    gradientClassName: "from-pink-500/25 via-orange-400/10 to-transparent",
    formats: ["reel", "carrusel", "imagen", "story"],
    actions: [
      {
        id: "publicar-reel",
        title: "Publicar Reel",
        description: "Sube un video vertical con caption, hashtags y portada.",
        icon: Clapperboard,
        availability: "disponible",
        format: "reel",
        n8nEvent: "instagram.reel.publish",
      },
      {
        id: "carrusel",
        title: "Crear carrusel",
        description: "Hasta 10 imágenes o videos en una sola publicación.",
        icon: Layers,
        availability: "disponible",
        format: "carrusel",
        n8nEvent: "instagram.carousel.publish",
      },
      {
        id: "caption-ia",
        title: "Caption con IA",
        description: "Copy, CTA y hashtags adaptados a tu audiencia.",
        icon: WandSparkles,
        ai: true,
        availability: "disponible",
        format: "reel",
        n8nEvent: "instagram.caption.generate",
      },
      {
        id: "programar",
        title: "Programar publicación",
        description: "Agenda Reels y carruseles para publicarse solos.",
        icon: CalendarClock,
        availability: "disponible",
        format: "reel",
        n8nEvent: "instagram.post.schedule",
      },
      {
        id: "repost",
        title: "Repost desde TikTok / Shorts",
        description: "Reutiliza un video de otra plataforma sin marca de agua.",
        icon: Repeat2,
        availability: "proximamente",
        n8nEvent: "instagram.crosspost",
      },
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    tagline: "Videos verticales y tendencias",
    chipClassName: "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30",
    gradientClassName: "from-cyan-400/25 via-fuchsia-500/10 to-transparent",
    formats: ["video"],
    actions: [
      {
        id: "subir-video",
        title: "Subir video",
        description: "Publica directo en tu cuenta o déjalo como borrador en TikTok.",
        icon: Upload,
        availability: "disponible",
        format: "video",
        n8nEvent: "tiktok.video.upload",
      },
      {
        id: "caption-ia",
        title: "Caption con IA",
        description: "Texto corto, hook y hashtags en tendencia.",
        icon: WandSparkles,
        ai: true,
        availability: "disponible",
        format: "video",
        n8nEvent: "tiktok.caption.generate",
      },
      {
        id: "subtitulos",
        title: "Subtítulos automáticos",
        description: "Transcribe y quema subtítulos animados en el video.",
        icon: Captions,
        ai: true,
        availability: "proximamente",
        n8nEvent: "tiktok.video.captions",
      },
      {
        id: "programar",
        title: "Programar publicación",
        description: "Agenda tus videos en los horarios de mayor alcance.",
        icon: CalendarClock,
        availability: "disponible",
        format: "video",
        n8nEvent: "tiktok.video.schedule",
      },
      {
        id: "crosspost",
        title: "Publicar en todas",
        description: "Envía el mismo video a TikTok, Reels y Shorts a la vez.",
        icon: Repeat2,
        availability: "proximamente",
        n8nEvent: "tiktok.crosspost",
      },
    ],
  },
};

export const PLATFORM_IDS: PlatformId[] = ["youtube", "instagram", "tiktok"];

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && (PLATFORM_IDS as string[]).includes(value);
}

export const FORMAT_LABELS: Record<PostFormat, string> = {
  video: "Video",
  short: "Short",
  reel: "Reel",
  carrusel: "Carrusel",
  imagen: "Imagen",
  story: "Story",
};

export function formatFollowers(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}
