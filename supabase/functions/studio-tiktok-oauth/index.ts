// ============================================
// VEXA Content Studio - Conexión de cuentas de TikTok (Login Kit v2)
// ============================================
// POST {action:"start", tenant_id, return_to}   (JWT del usuario) -> { ok, url }
// GET  ?code&state                              (redirect de TikTok) -> guarda la cuenta y vuelve al Studio
// POST {action:"disconnect", account_id}        (JWT del usuario) -> revoca y borra la cuenta
// POST {action:"token", account_id}             (header x-studio-key, para n8n) -> access_token vigente
//
// Secrets: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, STUDIO_N8N_KEY (opcional), STUDIO_APP_ORIGINS (opcional)
// Redirect URI a registrar en TikTok for Developers: {SUPABASE_URL}/functions/v1/studio-tiktok-oauth
// ============================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-studio-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ADMIN_EMAIL = "contacto@vexalatam.com";
const API = "https://open.tiktokapis.com/v2";
// Cada scope debe estar agregado en la app de TikTok (Login Kit, Content Posting API y Display API)
const SCOPES = [
  "user.info.basic",
  // Usuario (@handle)
  "user.info.profile",
  // Seguidores y likes
  "user.info.stats",
  // Listar videos publicados y sus métricas
  "video.list",
  // Subir videos como borrador a la bandeja de TikTok
  "video.upload",
  // Publicar videos directamente
  "video.publish",
];

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";
const redirectUri = `${supabaseUrl}/functions/v1/studio-tiktok-oauth`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const redirect = (url: string) => new Response(null, { status: 302, headers: { Location: url } });

function isAllowedReturn(url: string): boolean {
  try {
    const u = new URL(url);
    const extra = (Deno.env.get("STUDIO_APP_ORIGINS") ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (extra.includes(u.origin)) return true;
    if (u.protocol === "https:" && u.hostname.endsWith(".vercel.app")) return true;
    const appDomains = ["whatsai.cl", "vexalatam.com"];
    if (u.protocol === "https:" && appDomains.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))) return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

function withParams(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function getUser(admin: SupabaseClient, req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

async function canUseTenant(admin: SupabaseClient, userId: string, email: string | undefined, tenantId: string) {
  if (email?.toLowerCase() === ADMIN_EMAIL) return true;
  const { data: role } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (role) return true;
  const { data: appAdmin } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(appAdmin);
}

async function tiktokToken(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error || !body.access_token) throw new Error(body.error_description ?? body.error ?? `token_${res.status}`);
  return body as {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
  };
}

// ---------- GET: callback de TikTok ----------
async function handleCallback(admin: SupabaseClient, url: URL) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const ttError = url.searchParams.get("error");
  if (!state) return json({ error: "missing_state" }, 400);

  const { data: pending } = await admin.from("studio_oauth_states").delete().eq("state", state).select().maybeSingle();
  if (!pending) return json({ error: "invalid_state" }, 400);

  const back = (params: Record<string, string>) => redirect(withParams(pending.return_to, params));
  if (new Date(pending.expires_at).getTime() < Date.now()) return back({ studio_error: "expirado" });
  if (ttError || !code) return back({ studio_error: ttError === "access_denied" ? "cancelado" : "tiktok" });

  try {
    const tokens = await tiktokToken({ code, grant_type: "authorization_code", redirect_uri: redirectUri });

    const infoRes = await fetch(
      `${API}/user/info/?fields=open_id,avatar_url,display_name,username,follower_count`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const infoBody = await infoRes.json().catch(() => ({}));
    const user = infoBody.data?.user ?? {};
    if (!infoRes.ok || (infoBody.error?.code && infoBody.error.code !== "ok")) {
      console.error("[studio-tiktok-oauth] user info error:", infoBody.error);
    }

    const handle = user.username ? `@${user.username}` : user.display_name || "TikTok";
    const { data: account, error: accountError } = await admin
      .from("studio_accounts")
      .upsert(
        {
          tenant_id: pending.tenant_id,
          platform: "tiktok",
          external_id: tokens.open_id,
          handle,
          display_name: user.display_name || user.username || "TikTok",
          avatar_url: user.avatar_url ?? null,
          followers: Number(user.follower_count ?? 0),
          status: "conectada",
          connected_by: pending.user_id,
        },
        { onConflict: "tenant_id,platform,external_id" }
      )
      .select("id")
      .single();
    if (accountError || !account) throw new Error(accountError?.message ?? "upsert_account");

    const { error: tokenError } = await admin.from("studio_account_tokens").upsert(
      {
        account_id: account.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );
    if (tokenError) throw new Error(tokenError.message);

    return back({ studio_connected: "tiktok", studio_account: handle });
  } catch (err) {
    console.error("[studio-tiktok-oauth] callback error:", err);
    return back({ studio_error: "tiktok" });
  }
}

// ---------- POST: start ----------
async function handleStart(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  if (!clientKey || !clientSecret) return json({ ok: false, code: "not_configured" });

  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { tenant_id: tenantId, return_to: returnTo } = body;
  if (!tenantId || !returnTo || !isAllowedReturn(returnTo)) return json({ ok: false, code: "bad_request" }, 400);
  if (!(await canUseTenant(admin, user.id, user.email, tenantId))) return json({ ok: false, code: "forbidden" }, 403);

  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  await admin.from("studio_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin
    .from("studio_oauth_states")
    .insert({ state, tenant_id: tenantId, user_id: user.id, platform: "tiktok", return_to: returnTo });
  if (error) return json({ ok: false, code: "db_error", message: error.message }, 500);

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.search = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(","),
    // Siempre muestra la autorización para poder sumar otra cuenta distinta
    disable_auto_auth: "1",
    state,
  }).toString();

  return json({ ok: true, url: authUrl.toString() });
}

// ---------- POST: disconnect ----------
async function handleDisconnect(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { data: account } = await admin
    .from("studio_accounts")
    .select("id, tenant_id")
    .eq("id", body.account_id ?? "")
    .eq("platform", "tiktok")
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);
  if (!(await canUseTenant(admin, user.id, user.email, account.tenant_id))) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token")
    .eq("account_id", account.id)
    .maybeSingle();
  if (tokens?.access_token) {
    await fetch(`${API}/oauth/revoke/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token: tokens.access_token }),
    }).catch(() => undefined);
  }

  await admin.from("studio_accounts").delete().eq("id", account.id);
  return json({ ok: true });
}

// ---------- POST: token (n8n) ----------
async function handleToken(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  const key = Deno.env.get("STUDIO_N8N_KEY");
  if (!key || req.headers.get("x-studio-key") !== key) return json({ ok: false, code: "unauthorized" }, 401);

  const { data: account } = await admin
    .from("studio_accounts")
    .select("id, external_id, tenant_id, handle")
    .eq("id", body.account_id ?? "")
    .eq("platform", "tiktok")
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);

  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("account_id", account.id)
    .maybeSingle();
  if (!tokens) return json({ ok: false, code: "no_tokens" }, 404);

  const base = { ok: true, account_id: account.id, open_id: account.external_id, tenant_id: account.tenant_id };
  if (new Date(tokens.expires_at).getTime() - Date.now() > 60_000) {
    return json({ ...base, access_token: tokens.access_token, expires_at: tokens.expires_at });
  }
  if (!tokens.refresh_token) return json({ ok: false, code: "no_refresh_token" }, 409);

  try {
    const fresh = await tiktokToken({ refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
    const expiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    // TikTok puede rotar el refresh_token: se guarda siempre el último
    await admin
      .from("studio_account_tokens")
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token ?? tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", account.id);
    return json({ ...base, access_token: fresh.access_token, expires_at: expiresAt });
  } catch (err) {
    // El usuario revocó el acceso o el refresh_token (365 días) caducó
    await admin.from("studio_accounts").update({ status: "error" }).eq("id", account.id);
    return json({ ok: false, code: "refresh_failed", message: String(err) }, 409);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);

  try {
    if (req.method === "GET") return await handleCallback(admin, url);
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case "start":
        return await handleStart(admin, req, body);
      case "disconnect":
        return await handleDisconnect(admin, req, body);
      case "token":
        return await handleToken(admin, req, body);
      default:
        return json({ ok: false, code: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[studio-tiktok-oauth] error:", err);
    return json({ ok: false, code: "internal_error", message: String(err) }, 500);
  }
});
