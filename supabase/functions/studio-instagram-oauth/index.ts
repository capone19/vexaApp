// ============================================
// VEXA Content Studio - Conexión de cuentas de Instagram (Instagram API con inicio de sesión de Instagram)
// ============================================
// POST {action:"start", tenant_id, return_to}   (JWT del usuario) -> { ok, url }
// GET  ?code&state                              (redirect de Instagram) -> guarda la cuenta y vuelve al Studio
// POST {action:"disconnect", account_id}        (JWT del usuario) -> borra la cuenta y sus tokens
// POST {action:"token", account_id}             (header x-studio-key, para n8n) -> access_token vigente
//
// Solo cuentas profesionales (Empresa o Creador). No hace falta página de Facebook.
// Secrets: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, STUDIO_N8N_KEY (opcional), STUDIO_APP_ORIGINS (opcional)
// Redirect URI a registrar en Meta: {SUPABASE_URL}/functions/v1/studio-instagram-oauth
// ============================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-studio-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ADMIN_EMAIL = "contacto@vexalatam.com";
const GRAPH = "https://graph.instagram.com/v23.0";
const SCOPES = [
  "instagram_business_basic",
  // Publicar fotos, carruseles y reels
  "instagram_business_content_publish",
  // Leer y responder comentarios
  "instagram_business_manage_comments",
  // Estadísticas para "mejor horario" y reporte semanal
  "instagram_business_manage_insights",
];
// Los tokens de larga duración duran 60 días; se renuevan cuando les queda menos que esto
const REFRESH_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appId = Deno.env.get("INSTAGRAM_APP_ID") ?? "";
const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") ?? "";
const redirectUri = `${supabaseUrl}/functions/v1/studio-instagram-oauth`;

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

async function getJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error_message ?? body.error?.message ?? `http_${res.status}`);
  return body;
}

/** code -> token corto (1 h) -> token largo (60 días) */
async function exchangeCode(code: string) {
  const short = await getJson(
    await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    })
  );
  // Según la versión, la respuesta viene plana o dentro de data[0]
  const shortData = short.data?.[0] ?? short;

  const long = await getJson(
    await fetch(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortData.access_token,
      })}`
    )
  );
  const permissions = Array.isArray(shortData.permissions) ? shortData.permissions.join(",") : shortData.permissions;
  return { access_token: long.access_token as string, expires_in: Number(long.expires_in), scope: permissions ?? null };
}

async function refreshLongToken(accessToken: string) {
  const body = await getJson(
    await fetch(
      `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: accessToken,
      })}`
    )
  );
  return { access_token: body.access_token as string, expires_in: Number(body.expires_in) };
}

// ---------- GET: callback de Instagram ----------
async function handleCallback(admin: SupabaseClient, url: URL) {
  const state = url.searchParams.get("state");
  // Instagram agrega "#_" al final del code
  const code = url.searchParams.get("code")?.replace(/#_$/, "");
  const igError = url.searchParams.get("error");
  if (!state) return json({ error: "missing_state" }, 400);

  const { data: pending } = await admin.from("studio_oauth_states").delete().eq("state", state).select().maybeSingle();
  if (!pending) return json({ error: "invalid_state" }, 400);

  const back = (params: Record<string, string>) => redirect(withParams(pending.return_to, params));
  if (new Date(pending.expires_at).getTime() < Date.now()) return back({ studio_error: "expirado" });
  if (igError || !code) return back({ studio_error: igError === "access_denied" ? "cancelado" : "instagram" });

  try {
    const tokens = await exchangeCode(code);

    const profile = await getJson(
      await fetch(
        `${GRAPH}/me?${new URLSearchParams({
          fields: "user_id,username,name,profile_picture_url,followers_count,account_type",
          access_token: tokens.access_token,
        })}`
      )
    );
    if (profile.account_type && !["BUSINESS", "MEDIA_CREATOR"].includes(profile.account_type)) {
      return back({ studio_error: "cuenta_personal" });
    }

    const handle = `@${profile.username}`;
    const { data: account, error: accountError } = await admin
      .from("studio_accounts")
      .upsert(
        {
          tenant_id: pending.tenant_id,
          platform: "instagram",
          // user_id es el ID de la cuenta profesional (el que usa la API para publicar)
          external_id: String(profile.user_id ?? profile.id),
          handle,
          display_name: profile.name || profile.username,
          avatar_url: profile.profile_picture_url ?? null,
          followers: Number(profile.followers_count ?? 0),
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
        // Instagram no usa refresh_token: el propio token largo se renueva
        refresh_token: null,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );
    if (tokenError) throw new Error(tokenError.message);

    return back({ studio_connected: "instagram", studio_account: handle });
  } catch (err) {
    console.error("[studio-instagram-oauth] callback error:", err);
    return back({ studio_error: "instagram" });
  }
}

// ---------- POST: start ----------
async function handleStart(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  if (!appId || !appSecret) return json({ ok: false, code: "not_configured" });

  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { tenant_id: tenantId, return_to: returnTo } = body;
  if (!tenantId || !returnTo || !isAllowedReturn(returnTo)) return json({ ok: false, code: "bad_request" }, 400);
  if (!(await canUseTenant(admin, user.id, user.email, tenantId))) return json({ ok: false, code: "forbidden" }, 403);

  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  await admin.from("studio_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin
    .from("studio_oauth_states")
    .insert({ state, tenant_id: tenantId, user_id: user.id, platform: "instagram", return_to: returnTo });
  if (error) return json({ ok: false, code: "db_error", message: error.message }, 500);

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.search = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(","),
    // Siempre muestra el login para poder sumar otra cuenta distinta
    force_reauth: "true",
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
    .eq("platform", "instagram")
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);
  if (!(await canUseTenant(admin, user.id, user.email, account.tenant_id))) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  // Instagram no tiene endpoint para revocar: el usuario puede quitar la app desde su configuración.
  // Al borrar la cuenta se borran también sus tokens (ON DELETE CASCADE).
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
    .eq("platform", "instagram")
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);

  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token, expires_at, updated_at")
    .eq("account_id", account.id)
    .maybeSingle();
  if (!tokens) return json({ ok: false, code: "no_tokens" }, 404);

  const base = { ok: true, account_id: account.id, ig_user_id: account.external_id, tenant_id: account.tenant_id };
  const expiresIn = new Date(tokens.expires_at).getTime() - Date.now();
  if (expiresIn <= 0) {
    await admin.from("studio_accounts").update({ status: "error" }).eq("id", account.id);
    return json({ ok: false, code: "token_expired" }, 409);
  }
  // Instagram solo deja renovar tokens con más de 24 h de antigüedad
  const tokenAge = Date.now() - new Date(tokens.updated_at).getTime();
  if (expiresIn > REFRESH_BEFORE_MS || tokenAge < 24 * 60 * 60 * 1000) {
    return json({ ...base, access_token: tokens.access_token, expires_at: tokens.expires_at });
  }

  try {
    const fresh = await refreshLongToken(tokens.access_token);
    const expiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    await admin
      .from("studio_account_tokens")
      .update({ access_token: fresh.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("account_id", account.id);
    return json({ ...base, access_token: fresh.access_token, expires_at: expiresAt });
  } catch (err) {
    // El token actual sigue vigente: se entrega igual y se reintenta la renovación la próxima vez
    console.error("[studio-instagram-oauth] refresh error:", err);
    return json({ ...base, access_token: tokens.access_token, expires_at: tokens.expires_at });
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
    console.error("[studio-instagram-oauth] error:", err);
    return json({ ok: false, code: "internal_error", message: String(err) }, 500);
  }
});
