// ============================================
// VEXA Content Studio - Cuentas conectadas por OAuth (Supabase)
// ============================================
// Cada plataforma tiene su Edge Function (`studio-youtube-oauth`, `studio-instagram-oauth`) que hace el
// login y guarda la cuenta en `studio_accounts`; los tokens quedan en una tabla que solo lee el servidor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus, PlatformId, SocialAccount } from "./types";

const OAUTH_FUNCTIONS: Partial<Record<PlatformId, string>> = {
  youtube: "studio-youtube-oauth",
  instagram: "studio-instagram-oauth",
};

// Las tablas del Studio aún no están en los tipos generados de Supabase
const db = supabase as unknown as SupabaseClient;

interface StudioAccountRow {
  id: string;
  platform: PlatformId;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  followers: number;
  status: AccountStatus;
  managed: boolean;
  created_at: string;
}

const toAccount = (row: StudioAccountRow): SocialAccount => ({
  id: row.id,
  platform: row.platform,
  handle: row.handle,
  displayName: row.display_name,
  avatarUrl: row.avatar_url ?? undefined,
  followers: Number(row.followers ?? 0),
  status: row.status,
  managed: row.managed,
  connectedAt: row.created_at,
  remote: true,
});

export async function fetchConnectedAccounts(tenantId: string): Promise<SocialAccount[]> {
  const { data, error } = await db
    .from("studio_accounts")
    .select("id, platform, handle, display_name, avatar_url, followers, status, managed, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as StudioAccountRow[]).map(toAccount);
}

export async function setAccountManaged(id: string, managed: boolean) {
  const { error } = await db.from("studio_accounts").update({ managed }).eq("id", id);
  if (error) throw error;
}

export type OAuthStartResult = { ok: boolean; url?: string; code?: string };

/** Pide a la Edge Function de la plataforma la URL de inicio de sesión */
export async function startOAuthConnect(
  platform: PlatformId,
  tenantId: string,
  returnTo: string
): Promise<OAuthStartResult> {
  const fn = OAUTH_FUNCTIONS[platform];
  if (!fn) return { ok: false, code: "bad_request" };
  const { data, error } = await supabase.functions.invoke(fn, {
    body: { action: "start", tenant_id: tenantId, return_to: returnTo },
  });
  if (error) {
    // Respuestas 4xx/5xx traen { ok:false, code } en el cuerpo
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, code: body?.code ?? "network" };
  }
  return data as OAuthStartResult;
}

export async function disconnectAccount(account: Pick<SocialAccount, "id" | "platform">): Promise<boolean> {
  const fn = OAUTH_FUNCTIONS[account.platform];
  if (!fn) return false;
  const { data, error } = await supabase.functions.invoke(fn, {
    body: { action: "disconnect", account_id: account.id },
  });
  return !error && Boolean(data?.ok);
}

/** Plataformas que ya tienen login real (el resto sigue en modo manual/pendiente) */
export const OAUTH_PLATFORMS = Object.keys(OAUTH_FUNCTIONS) as PlatformId[];

/** Proveedor del inicio de sesión y secrets que necesita cada Edge Function */
export const OAUTH_PROVIDERS: Partial<Record<PlatformId, { name: string; secrets: string }>> = {
  youtube: { name: "Google", secrets: "GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET" },
  instagram: { name: "Instagram", secrets: "INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET" },
};

export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Falta configurar las credenciales de la plataforma en Supabase.",
  unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden: "No tienes permiso para conectar cuentas en este negocio.",
  bad_request: "No se pudo iniciar la conexión desde este dominio.",
  network: "No se pudo contactar al servidor.",
  cancelado: "Cancelaste el inicio de sesión con Google.",
  expirado: "La conexión tardó demasiado. Vuelve a intentarlo.",
  sin_canal: "Esa cuenta de Google no tiene un canal de YouTube.",
  google: "Google rechazó la conexión. Vuelve a intentarlo.",
  instagram: "Instagram rechazó la conexión. Vuelve a intentarlo.",
  cuenta_personal: "Esa cuenta de Instagram es personal. Cámbiala a cuenta profesional (Empresa o Creador) y vuelve a intentarlo.",
};

export function oauthErrorMessage(code: string | undefined, platform?: PlatformId): string {
  if (code === "not_configured" && platform && OAUTH_PROVIDERS[platform]) {
    return `Falta configurar las credenciales en Supabase (${OAUTH_PROVIDERS[platform]!.secrets}).`;
  }
  return OAUTH_ERROR_MESSAGES[code ?? ""] ?? code ?? "Error desconocido.";
}
