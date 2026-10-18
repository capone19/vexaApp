// ============================================
// VEXA Content Studio - Datos de ejemplo
// Se muestran hasta que se conecten cuentas reales (OAuth vía n8n/APIs).
// ============================================

import type { SocialAccount, StudioAutomation, StudioPost } from "./types";

const inDays = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const DEMO_ACCOUNTS: SocialAccount[] = [
  {
    id: "demo-yt-1",
    platform: "youtube",
    handle: "@vexa.oficial",
    displayName: "VEXA Oficial",
    followers: 12400,
    status: "conectada",
    managed: true,
    connectedAt: inDays(-30, 10),
    demo: true,
  },
  {
    id: "demo-yt-2",
    platform: "youtube",
    handle: "@vexa.tutoriales",
    displayName: "VEXA Tutoriales",
    followers: 3100,
    status: "conectada",
    managed: false,
    connectedAt: inDays(-12, 10),
    demo: true,
  },
  {
    id: "demo-ig-1",
    platform: "instagram",
    handle: "@vexa.app",
    displayName: "VEXA App",
    followers: 8900,
    status: "conectada",
    managed: true,
    connectedAt: inDays(-25, 10),
    demo: true,
  },
  {
    id: "demo-tt-1",
    platform: "tiktok",
    handle: "@vexa.ai",
    displayName: "VEXA AI",
    followers: 21500,
    status: "pendiente",
    managed: true,
    connectedAt: inDays(-2, 10),
    demo: true,
  },
];

export const DEMO_POSTS: StudioPost[] = [
  {
    id: "demo-post-1",
    platform: "youtube",
    accountId: "demo-yt-1",
    format: "video",
    title: "Cómo automatizar tu WhatsApp con IA en 10 minutos",
    description: "",
    tags: ["ia", "automatizacion"],
    status: "programado",
    scheduledAt: inDays(1, 18),
    createdAt: inDays(-1, 9),
    demo: true,
  },
  {
    id: "demo-post-2",
    platform: "youtube",
    accountId: "demo-yt-1",
    format: "short",
    title: "3 errores que matan tus ventas por chat",
    description: "",
    tags: ["ventas"],
    status: "procesando",
    createdAt: inDays(0, 9),
    demo: true,
  },
  {
    id: "demo-post-3",
    platform: "instagram",
    accountId: "demo-ig-1",
    format: "reel",
    title: "Detrás de cámaras: así trabaja un agente de IA",
    description: "",
    tags: ["reels"],
    status: "programado",
    scheduledAt: inDays(2, 13),
    createdAt: inDays(-1, 12),
    demo: true,
  },
  {
    id: "demo-post-4",
    platform: "tiktok",
    accountId: "demo-tt-1",
    format: "video",
    title: "POV: tu negocio responde solo a las 3 AM",
    description: "",
    tags: ["pov"],
    status: "borrador",
    createdAt: inDays(0, 11),
    demo: true,
  },
];

export const DEFAULT_AUTOMATIONS: StudioAutomation[] = [
  {
    id: "auto-shorts",
    title: "Video largo → 3 Shorts",
    description: "Cada vez que subes un video a YouTube, la IA corta los 3 mejores momentos y los deja como Shorts programados.",
    platforms: ["youtube"],
    trigger: "Al subir un video",
    enabled: false,
    ai: true,
  },
  {
    id: "auto-metadatos",
    title: "Metadatos automáticos",
    description: "Rellena título, descripción, tags y hashtags con IA antes de publicar en cualquier plataforma.",
    platforms: ["youtube", "instagram", "tiktok"],
    trigger: "Al crear una publicación",
    enabled: true,
    ai: true,
  },
  {
    id: "auto-crosspost",
    title: "Cross-post vertical",
    description: "Todo video vertical que publiques en TikTok se republica como Reel y como Short.",
    platforms: ["tiktok", "instagram", "youtube"],
    trigger: "Al publicar en TikTok",
    enabled: false,
  },
  {
    id: "auto-mejor-horario",
    title: "Publicar en el mejor horario",
    description: "Las publicaciones sin fecha se programan solas en la próxima franja de mayor alcance.",
    platforms: ["youtube", "instagram", "tiktok"],
    trigger: "Todos los días a las 08:00",
    cron: "0 8 * * *",
    enabled: false,
  },
  {
    id: "auto-reporte",
    title: "Reporte semanal",
    description: "Resumen de rendimiento de todas tus cuentas cada lunes.",
    platforms: ["youtube", "instagram", "tiktok"],
    trigger: "Lunes a las 09:00",
    cron: "0 9 * * 1",
    enabled: false,
  },
];
