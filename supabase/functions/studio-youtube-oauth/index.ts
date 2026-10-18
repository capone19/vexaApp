// ============================================
// VEXA Content Studio - Conexión de canales de YouTube (OAuth de Google)
// ============================================
// POST {action:"start", tenant_id, return_to}   (JWT del usuario) -> { ok, url }
// GET  ?code&state                              (redirect de Google) -> guarda el canal y vuelve al Studio
// POST {action:"disconnect", account_id}        (JWT del usuario) -> revoca y borra la cuenta
// POST {action:"token", account_id}             (header x-studio-key, para n8n) -> access_token vigente
// POST {action:"videos", account_id, page_token?} (JWT del usuario) -> videos publicados del canal
// POST {action:"upload_token", account_id}       (JWT del usuario) -> access_token para subir directo a YouTube
// POST {action:"post_comments", task_ids?}       (JWT con task_ids, o x-studio-key para n8n) -> publica los comentarios para fijar
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STUDIO_N8N_KEY (opcional), STUDIO_APP_ORIGINS (opcional)
// La clave de n8n también puede vivir en la tabla studio_secrets (name = 'n8n_key'): n8n la lee con su conexión Postgres.
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

// ---------- Token vigente (refresca con el refresh_token si está por vencer) ----------
type TokenResult = { ok: true; accessToken: string; expiresAt: string } | { ok: false; code: string; message?: string };

async function getAccessToken(admin: SupabaseClient, accountId: string): Promise<TokenResult> {
  const { data: tokens } = await admin
    .from("studio_account_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!tokens) return { ok: false, code: "no_tokens" };
  if (new Date(tokens.expires_at).getTime() - Date.now() > 60_000) {
    return { ok: true, accessToken: tokens.access_token, expiresAt: tokens.expires_at };
  }
  if (!tokens.refresh_token) return { ok: false, code: "no_refresh_token" };

  try {
    const fresh = await googleToken({ refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
    const expiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    await admin
      .from("studio_account_tokens")
      .update({ access_token: fresh.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("account_id", accountId);
    return { ok: true, accessToken: fresh.access_token, expiresAt };
  } catch (err) {
    // invalid_grant: el usuario revocó el acceso o el token caducó
    await admin.from("studio_accounts").update({ status: "error" }).eq("id", accountId);
    return { ok: false, code: "refresh_failed", message: String(err) };
  }
}

// ---------- POST: token (n8n) ----------
/** La clave de n8n: el secret STUDIO_N8N_KEY o la fila 'n8n_key' de studio_secrets */
async function isN8n(admin: SupabaseClient, req: Request) {
  const given = req.headers.get("x-studio-key");
  if (!given) return false;
  const envKey = Deno.env.get("STUDIO_N8N_KEY");
  if (envKey && given === envKey) return true;
  const { data } = await admin.from("studio_secrets").select("value").eq("name", "n8n_key").maybeSingle();
  return Boolean(data?.value) && given === data!.value;
}

async function handleToken(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  if (!(await isN8n(admin, req))) return json({ ok: false, code: "unauthorized" }, 401);

  const { data: account } = await admin
    .from("studio_accounts")
    .select("id, external_id, tenant_id, handle")
    .eq("id", body.account_id ?? "")
    .maybeSingle();
  if (!account) return json({ ok: false, code: "not_found" }, 404);

  const token = await getAccessToken(admin, account.id);
  if (!token.ok) return json(token, token.code === "no_tokens" ? 404 : 409);
  return json({
    ok: true,
    account_id: account.id,
    channel_id: account.external_id,
    tenant_id: account.tenant_id,
    access_token: token.accessToken,
    expires_at: token.expiresAt,
  });
}

// ---------- POST: upload_token (el navegador sube el archivo directo a YouTube) ----------
// El video nunca pasa por Supabase: solo se entrega un token de corta duración al usuario del negocio.
async function handleUploadToken(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { data: account } = await admin
    .from("studio_accounts")
    .select("id, tenant_id, platform")
    .eq("id", body.account_id ?? "")
    .maybeSingle();
  if (!account || account.platform !== "youtube") return json({ ok: false, code: "not_found" }, 404);
  if (!(await canUseTenant(admin, user.id, user.email, account.tenant_id))) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const token = await getAccessToken(admin, account.id);
  if (!token.ok) return json(token, 409);
  return json({ ok: true, access_token: token.accessToken, expires_at: token.expiresAt });
}

// ---------- POST: post_comments (comentario para fijar) ----------
// El navegador lo intenta apenas programa el video (task_ids); n8n, cada 15 minutos, publica los que ya
// llegaron a su hora. La API no permite fijar: eso lo hace el creador con el link que llega por Telegram.
interface VideoTask {
  id: string;
  account_id: string;
  video_id: string;
  video_title: string;
  is_short: boolean;
  comment_text: string | null;
  attempts: number;
  related_video_id: string | null;
  related_done: boolean;
}

// n8n reintenta cada 15 min: después de ~2 horas sin lograrlo se da por perdido y se avisa
const MAX_ATTEMPTS = 8;

async function handlePostComments(admin: SupabaseClient, req: Request, body: Record<string, unknown>) {
  const byN8n = await isN8n(admin, req);
  let query = admin
    .from("studio_video_tasks")
    .select("id, account_id, video_id, video_title, is_short, comment_text, attempts, related_video_id, related_done")
    .eq("comment_status", "pendiente")
    .limit(25);
  let user: Awaited<ReturnType<typeof getUser>> = null;
  if (byN8n) {
    query = query.lte("post_after", new Date().toISOString());
  } else {
    user = await getUser(admin, req);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const ids = Array.isArray(body.task_ids) ? body.task_ids.filter((x): x is string => typeof x === "string").slice(0, 25) : [];
    if (!ids.length) return json({ ok: true, posted: [], failed: [] });
    query = query.in("id", ids);
  }
  const { data: rows } = await query;
  const tasks = (rows ?? []) as VideoTask[];

  const posted: Record<string, unknown>[] = [];
  const failed: Record<string, unknown>[] = [];
  const accountIds = [...new Set(tasks.map((t) => t.account_id))];
  for (const accountId of accountIds) {
    const { data: account } = await admin
      .from("studio_accounts")
      .select("id, external_id, tenant_id, handle")
      .eq("id", accountId)
      .maybeSingle();
    const own = tasks.filter((t) => t.account_id === accountId);
    if (!account) continue;
    if (user && !(await canUseTenant(admin, user.id, user.email, account.tenant_id))) continue;
    const token = await getAccessToken(admin, account.id);
    if (!token.ok) {
      own.forEach((t) => failed.push({ id: t.id, video_id: t.video_id, video_title: t.video_title, error: token.code, final: false }));
      continue;
    }

    // n8n: solo los que YouTube ya publicó (si cambiaron la fecha en YouTube Studio, se corre la espera)
    let ready = own;
    if (byN8n) {
      const list = await youtubeGet("videos", { part: "status", id: own.map((t) => t.video_id).join(",") }, token.accessToken).catch(() => null);
      const status = new Map<string, { privacyStatus?: string; publishAt?: string }>(
        (list?.items ?? []).map((v: { id: string; status?: { privacyStatus?: string; publishAt?: string } }) => [v.id, v.status ?? {}])
      );
      ready = [];
      for (const t of own) {
        const st = status.get(t.video_id);
        if (list && !st) {
          await admin.from("studio_video_tasks").update({ comment_status: "error", last_error: "El video ya no existe en YouTube" }).eq("id", t.id);
          failed.push({ id: t.id, video_id: t.video_id, video_title: t.video_title, error: "El video ya no existe en YouTube", final: true });
        } else if (st?.privacyStatus === "private" && st.publishAt && new Date(st.publishAt).getTime() > Date.now()) {
          await admin.from("studio_video_tasks").update({ post_after: st.publishAt }).eq("id", t.id);
        } else {
          ready.push(t);
        }
      }
    }

    for (const t of ready) {
      const res = await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: {
            channelId: account.external_id,
            videoId: t.video_id,
            topLevelComment: { snippet: { textOriginal: (t.comment_text ?? "").slice(0, 10000) } },
          },
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.id) {
        const commentId = out.snippet?.topLevelComment?.id ?? out.id;
        await admin
          .from("studio_video_tasks")
          .update({ comment_status: "publicado", comment_id: commentId, posted_at: new Date().toISOString(), last_error: null })
          .eq("id", t.id);
        posted.push({
          id: t.id,
          video_id: t.video_id,
          video_title: t.video_title,
          is_short: t.is_short,
          comment_id: commentId,
          comment_text: t.comment_text,
          related_pending: Boolean(t.related_video_id && !t.related_done),
        });
      } else {
        const error = String(out.error?.errors?.[0]?.reason ?? out.error?.message ?? `youtube_${res.status}`).slice(0, 300);
        // El intento del navegador (video aún privado) no cuenta: n8n lo vuelve a intentar a la hora de publicación
        const attempts = byN8n ? t.attempts + 1 : t.attempts;
        const final = attempts >= MAX_ATTEMPTS;
        await admin
          .from("studio_video_tasks")
          .update({ attempts, last_error: error, ...(final ? { comment_status: "error" } : {}) })
          .eq("id", t.id);
        failed.push({ id: t.id, video_id: t.video_id, video_title: t.video_title, error, final });
      }
    }
  }
  return json({ ok: true, posted, failed });
}

// ---------- POST: videos (contenido del canal) ----------
/** "PT1H2M3S" -> 3723 */
function isoDurationToSeconds(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, sec] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + sec;
}

async function youtubeGet(path: string, params: Record<string, string>, accessToken: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams(params).toString();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message ?? `youtube_${res.status}`);
  return body;
}

async function handleVideos(admin: SupabaseClient, req: Request, body: Record<string, string>) {
  const user = await getUser(admin, req);
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  const { data: account } = await admin
    .from("studio_accounts")
    .select("id, tenant_id, external_id, platform")
    .eq("id", body.account_id ?? "")
    .maybeSingle();
  if (!account || account.platform !== "youtube") return json({ ok: false, code: "not_found" }, 404);
  if (!(await canUseTenant(admin, user.id, user.email, account.tenant_id))) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const token = await getAccessToken(admin, account.id);
  if (!token.ok) return json(token, 409);

  const channelBody = await youtubeGet(
    "channels",
    { part: "snippet,statistics,contentDetails", id: account.external_id },
    token.accessToken
  );
  const channel = channelBody.items?.[0];
  if (!channel) return json({ ok: false, code: "sin_canal" }, 404);

  // Aprovechar para mantener al día suscriptores y foto del canal
  const subscribers = channel.statistics?.hiddenSubscriberCount ? 0 : Number(channel.statistics?.subscriberCount ?? 0);
  await admin
    .from("studio_accounts")
    .update({
      followers: subscribers,
      avatar_url: channel.snippet?.thumbnails?.default?.url ?? null,
      display_name: channel.snippet?.title,
      status: "conectada",
    })
    .eq("id", account.id);

  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  const stats = {
    subscribers,
    views: Number(channel.statistics?.viewCount ?? 0),
    videos: Number(channel.statistics?.videoCount ?? 0),
  };
  if (!uploads) return json({ ok: true, channel: stats, videos: [], next_page_token: null });

  const page = await youtubeGet(
    "playlistItems",
    { part: "contentDetails", playlistId: uploads, maxResults: "24", ...(body.page_token ? { pageToken: body.page_token } : {}) },
    token.accessToken
  );
  const ids: string[] = (page.items ?? []).map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId);
  if (ids.length === 0) return json({ ok: true, channel: stats, videos: [], next_page_token: null });

  const details = await youtubeGet(
    "videos",
    { part: "snippet,contentDetails,statistics,status", id: ids.join(",") },
    token.accessToken
  );
  // deno-lint-ignore no-explicit-any
  const byId = new Map<string, any>((details.items ?? []).map((v: { id: string }) => [v.id, v]));
  const videos = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((v) => {
      const duration = isoDurationToSeconds(v.contentDetails?.duration);
      const thumbs = v.snippet?.thumbnails ?? {};
      return {
        id: v.id,
        title: v.snippet?.title ?? "",
        description: v.snippet?.description ?? "",
        published_at: v.snippet?.publishedAt ?? v.status?.publishAt ?? null,
        thumbnail: (thumbs.maxres ?? thumbs.standard ?? thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? null,
        duration_seconds: duration,
        // La API no marca los Shorts: se infieren por duración (hasta 3 min)
        is_short: duration > 0 && duration <= 180,
        privacy: v.status?.privacyStatus ?? "public",
        // Programado: privado hasta esta fecha, luego YouTube lo publica solo
        publish_at: v.status?.publishAt ?? null,
        upload_status: v.status?.uploadStatus ?? null,
        live: v.snippet?.liveBroadcastContent ?? "none",
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
      };
    });

  return json({ ok: true, channel: stats, videos, next_page_token: page.nextPageToken ?? null });
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
      case "videos":
        return await handleVideos(admin, req, body);
      case "upload_token":
        return await handleUploadToken(admin, req, body);
      case "post_comments":
        return await handlePostComments(admin, req, body);
      default:
        return json({ ok: false, code: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[studio-youtube-oauth] error:", err);
    return json({ ok: false, code: "internal_error", message: String(err) }, 500);
  }
});
