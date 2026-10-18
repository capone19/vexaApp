// ============================================
// VEXA Content Studio - Conexión de canales de YouTube (OAuth de Google)
// ============================================
// POST {action:"start", tenant_id, return_to}   (JWT del usuario) -> { ok, url }
// GET  ?code&state                              (redirect de Google) -> guarda el canal y vuelve al Studio
// POST {action:"disconnect", account_id}        (JWT del usuario) -> revoca y borra la cuenta
// POST {action:"token", account_id}             (header x-studio-key, para n8n) -> access_token vigente
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STUDIO_N8N_KEY (opcional), STUDIO_APP_ORIGINS (opcional)
// Redirect URI a registrar en Google Cloud: {SUPABASE_URL}/functions/v1/studio-youtube-oauth
// ============================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-studio-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ADMIN_EMAIL = "contacto@vexalatam.com";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  // Editar videos ya subidos y responder comentarios
  "https://www.googleapis.com/auth/youtube.force-ssl",
  // Estadísticas para "mejor horario" y reporte semanal
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const redirectUri = `${supabaseUrl}/functions/v1/studio-youtube-oauth`;

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
    if (u.protocol === "https:" && (u.hostname === "vexalatam.com" || u.hostname.endsWith(".vexalatam.com"))) return true;
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

async function googleToken(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: googleClientId, client_secret: googleClientSecret, ...params }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `token_${res.status}`);
  return body as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

// ---------- GET: callback de Google ----------
async function handleCallback(admin: SupabaseClient, url: URL) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const googleError = url.searchParams.get("error");
  if (!state) return json({ error: "missing_state" }, 400);

  const { data: pending } = await admin.from("studio_oauth_states").delete().eq("state", state).select().maybeSingle();
  if (!pending) return json({ error: "invalid_state" }, 400);

  const back = (params: Record<string, string>) => redirect(withParams(pending.return_to, params));
  if (new Date(pending.expires_at).getTime() < Date.now()) return back({ studio_error: "expirado" });
  if (googleError || !code) return back({ studio_error: googleError === "access_denied" ? "cancelado" : "google" });

  try {
    const tokens = await googleToken({ code, grant_type: "authorization_code", redirect_uri: redirectUri });

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const channelBody = await channelRes.json();
    const channel = channelBody.items?.[0];
    if (!channel) return back({ studio_error: "sin_canal" });

    const handle = channel.snippet.customUrl
      ? channel.snippet.customUrl.startsWith("@")
        ? channel.snippet.customUrl
        : `@${channel.snippet.customUrl}`
      : channel.snippet.title;

    const { data: account, error: accountError } = await admin
      .from("studio_accounts")
      .upsert(
        {
          tenant_id: pending.tenant_id,
          platform: "youtube",
          external_id: channel.id,
          handle,
          display_name: channel.snippet.title,
          avatar_url: channel.snippet.thumbnails?.default?.url ?? null,
          followers: channel.statistics?.hiddenSubscriberCount ? 0 : Number(channel.statistics?.subscriberCount ?? 0),
          status: "conectada",
          connected_by: pending.user_id,
        },
        { onConflict: "tenant_id,platform,external_id" }
      )
      .select("id")
      .single();
    if (accountError || !account) throw new Error(accountError?.message ?? "upsert_account");

    const tokenRow: Record<string, unknown> = {
      account_id: account.id,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    };
    // Google solo entrega refresh_token en el primer consentimiento: no pisar el existente
    if (tokens.refresh_token) tokenRow.refresh_token = tokens.refresh_token;
    const { error: tokenError } = await admin.from("studio_account_tokens").upsert(tokenRow, { onConflict: "account_id" });
    if (tokenError) throw new Error(tokenError.message);

    return back({ studio_connected: "youtube", studio_account: handle });
  } catch (err) {
    console.error("[studio-youtube-oauth] callback error:", err);
    return back({ studio_error: "google" });
  }
}

// ---------- POST: start ----------
async function handleStart(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  if (!googleClientId || !googleClientSecret) return json({ ok: false, code: "not_configured" });

  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { tenant_id: tenantId, return_to: returnTo } = body;
  if (!tenantId || !returnTo || !isAllowedReturn(returnTo)) return json({ ok: false, code: "bad_request" }, 400);
  if (!(await canUseTenant(admin, user.id, user.email, tenantId))) return json({ ok: false, code: "forbidden" }, 403);

  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  await admin.from("studio_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin
    .from("studio_oauth_states")
    .insert({ state, tenant_id: tenantId, user_id: user.id, platform: "youtube", return_to: returnTo });
  if (error) return json({ ok: false, code: "db_error", message: error.message }, 500);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    // select_account deja elegir canal/cuenta de marca; consent asegura el refresh_token
    prompt: "consent select_account",
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
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);
  if (!(await canUseTenant(admin, user.id, user.email, account.tenant_id))) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token, refresh_token")
    .eq("account_id", account.id)
    .maybeSingle();
  const revokeToken = tokens?.refresh_token ?? tokens?.access_token;
  if (revokeToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(revokeToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);

  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("account_id", account.id)
    .maybeSingle();
  if (!tokens) return json({ ok: false, code: "no_tokens" }, 404);

  const base = { ok: true, account_id: account.id, channel_id: account.external_id, tenant_id: account.tenant_id };
  if (new Date(tokens.expires_at).getTime() - Date.now() > 60_000) {
    return json({ ...base, access_token: tokens.access_token, expires_at: tokens.expires_at });
  }
  if (!tokens.refresh_token) return json({ ok: false, code: "no_refresh_token" }, 409);

  try {
    const fresh = await googleToken({ refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
    const expiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    await admin
      .from("studio_account_tokens")
      .update({ access_token: fresh.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("account_id", account.id);
    return json({ ...base, access_token: fresh.access_token, expires_at: expiresAt });
  } catch (err) {
    // invalid_grant: el usuario revocó el acceso o el token caducó
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
    console.error("[studio-youtube-oauth] error:", err);
    return json({ ok: false, code: "internal_error", message: String(err) }, 500);
  }
});
