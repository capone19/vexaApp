// ============================================
// VEXA Content Studio - Cuentas conectadas por OAuth (Supabase)
// ============================================
// La Edge Function `studio-youtube-oauth` hace el login con Google y guarda el canal
// en `studio_accounts`; los tokens quedan en una tabla que solo lee el servidor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus, PlatformId, SocialAccount } from "./types";

const OAUTH_FUNCTION = "studio-youtube-oauth";

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

/** Pide a la Edge Function la URL de consentimiento de Google */
export async function startYouTubeConnect(tenantId: string, returnTo: string): Promise<OAuthStartResult> {
  const { data, error } = await supabase.functions.invoke(OAUTH_FUNCTION, {
    body: { action: "start", tenant_id: tenantId, return_to: returnTo },
  });
  if (error) {
    // Respuestas 4xx/5xx traen { ok:false, code } en el cuerpo
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, code: body?.code ?? "network" };
  }
  return data as OAuthStartResult;
}

export async function disconnectAccount(id: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke(OAUTH_FUNCTION, {
    body: { action: "disconnect", account_id: id },
  });
  return !error && Boolean(data?.ok);
}

/** Plataformas que ya tienen login real (el resto sigue en modo manual/pendiente) */
export const OAUTH_PLATFORMS: PlatformId[] = ["youtube"];

export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Falta configurar las credenciales de Google en Supabase (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET).",
  unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden: "No tienes permiso para conectar cuentas en este negocio.",
  bad_request: "No se pudo iniciar la conexión desde este dominio.",
  network: "No se pudo contactar al servidor.",
  cancelado: "Cancelaste el inicio de sesión con Google.",
  expirado: "La conexión tardó demasiado. Vuelve a intentarlo.",
  sin_canal: "Esa cuenta de Google no tiene un canal de YouTube.",
  google: "Google rechazó la conexión. Vuelve a intentarlo.",
};
