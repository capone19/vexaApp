// ============================================
// VEXA Content Studio - Tipos
// ============================================

export type PlatformId = "youtube" | "instagram" | "tiktok";

export type AccountStatus = "conectada" | "pendiente" | "error";

export interface SocialAccount {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  followers: number;
  status: AccountStatus;
  /** Si el usuario eligió gestionar esta cuenta desde el Studio */
  managed: boolean;
  connectedAt: string;
  /** Datos de ejemplo (se reemplazan al conectar cuentas reales vía OAuth) */
  demo?: boolean;
  /** Conectada por OAuth y guardada en Supabase (no en localStorage) */
  remote?: boolean;
  /** Perfil de estilo para "Rellenar con IA" (studio_accounts.ai_profile) */
  aiProfile?: Record<string, unknown>;
  /** Frecuencia de publicación (studio_accounts.publish_plan) */
  publishPlan?: Record<string, unknown>;
}

export type PostStatus = "borrador" | "programado" | "procesando" | "publicado" | "error";

export type PostFormat = "video" | "short" | "reel" | "carrusel" | "imagen" | "story";

export interface StudioPost {
  id: string;
  platform: PlatformId;
  accountId: string;
  format: PostFormat;
  title: string;
  description: string;
  tags: string[];
  status: PostStatus;
  /** ISO. Si existe y status = programado, se publica en esa fecha */
  scheduledAt?: string;
  createdAt: string;
  demo?: boolean;
  /** Id del contenido en la plataforma (p. ej. el id del video de YouTube) */
  externalId?: string;
  url?: string;
}

export type ActionAvailability = "disponible" | "proximamente";

export interface PlatformAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  /** Usa IA (se muestra con badge) */
  ai?: boolean;
  availability: ActionAvailability;
  /** Formato que crea la acción (si abre el compositor) */
  format?: PostFormat;
  /** Evento que se envía al webhook de n8n */
  n8nEvent: string;
  /** Si existe, la tarjeta lleva a esta página en vez de abrir el compositor */
  href?: string;
}

export interface StudioAutomation {
  id: string;
  title: string;
  description: string;
  platforms: PlatformId[];
  /** Descripción legible del disparador (cron o evento) */
  trigger: string;
  cron?: string;
  enabled: boolean;
  ai?: boolean;
}
