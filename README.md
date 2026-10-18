# VEXA App

Panel de VEXA (Chatbot AI y automatización) construido con Next.js 15 (App Router), React, TypeScript, Tailwind CSS 3, shadcn/ui, TanStack Query y Supabase.

## Secciones

| Ruta | Sección |
|---|---|
| `/auth` | Inicio de sesión y registro |
| `/ajustes-agente` | Ajustes del Agente |
| `/ajustes-agente/analisis` | Análisis del agente |
| `/chats` | Chats en tiempo real |
| `/marketing/plantillas` | Plantillas de WhatsApp (oculta en el menú; se abre desde Chats) |
| `/studio` | Content Studio: panel central de YouTube, Instagram y TikTok (tema lila) |
| `/studio/cuentas` | Cuentas conectadas (varias por plataforma, elegir cuáles gestionar) |
| `/studio/youtube`, `/studio/instagram`, `/studio/tiktok` | Acciones por plataforma: subir, IA, programar |
| `/studio/automatizaciones` | Automatizaciones (cronos y reglas en n8n) |

El botón con degradado lila (barra superior y sidebar) cambia entre VEXA Chat y Content Studio.

`/` redirige a `/chats`. Las rutas protegidas redirigen a `/auth` si no hay sesión.

## Desarrollo local

Requisitos: Node.js 20 o superior.

```sh
npm install
cp .env.example .env   # completar los valores
npm run dev            # http://localhost:3000
```

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: build de producción.
- `npm run start`: sirve el build de producción.
- `npm run lint`: ESLint con la configuración de Next.
- `npm test`: tests con Vitest.

`next build` no hace type-check (igual que el build anterior de Vite). Para revisar tipos: `npx tsc --noEmit`.

## Variables de entorno

Ver [.env.example](.env.example). Todas usan el prefijo `NEXT_PUBLIC_` porque se leen en el navegador. Las de n8n son opcionales.

`NEXT_PUBLIC_N8N_WEBHOOK_STUDIO` es la ruta del webhook de n8n que recibe todos los eventos del Content Studio (`youtube.video.upload`, `youtube.metadata.generate`, `studio.automation.toggle`, etc.; ver `src/lib/studio/`). Si está vacía, el Studio funciona en modo local y no publica nada.

### Conexión de canales de YouTube

La Edge Function `studio-youtube-oauth` (Supabase) hace el login con Google, guarda el canal en `studio_accounts` y los tokens en `studio_account_tokens` (solo accesible con service role). Secrets en Supabase → Edge Functions:

- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: cliente OAuth "Aplicación web" de Google Cloud con YouTube Data API v3 habilitada. URI de redirección autorizada: `https://<proyecto>.supabase.co/functions/v1/studio-youtube-oauth`.
- `STUDIO_N8N_KEY`: clave que n8n envía en el header `x-studio-key` para pedir un access token vigente (`POST {action:"token", account_id}`).
- `STUDIO_APP_ORIGINS` (opcional): orígenes extra permitidos para volver al Studio, separados por coma (ya se aceptan `*.vercel.app`, `whatsai.cl`, `vexalatam.com` y sus subdominios, y localhost).

### Conexión de cuentas de Instagram

La Edge Function `studio-instagram-oauth` usa la API de Instagram con inicio de sesión de Instagram (sin página de Facebook). Solo acepta cuentas profesionales (Empresa o Creador). Guarda un token de 60 días que se renueva solo cuando n8n lo pide (`POST {action:"token", account_id}`). Secrets en Supabase → Edge Functions:

- `INSTAGRAM_APP_ID` y `INSTAGRAM_APP_SECRET`: el "ID de la app de Instagram" y su clave secreta. Están en Meta for Developers → tu app → Instagram → Configuración de la API con inicio de sesión de Instagram. No son el ID de la app de Facebook. URL de redireccionamiento OAuth: `https://<proyecto>.supabase.co/functions/v1/studio-instagram-oauth`.
- Mientras la app esté en modo desarrollo, cada cuenta debe agregarse como "Evaluador de Instagram" en Roles de la app y aceptar la invitación desde Instagram.

### Conexión de cuentas de TikTok

La Edge Function `studio-tiktok-oauth` usa Login Kit v2. El access token dura 24 h y se renueva con el refresh token (365 días) cuando n8n lo pide (`POST {action:"token", account_id}`). Secrets en Supabase → Edge Functions:

- `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET`: de la app en developers.tiktok.com (en modo Sandbox la app tiene sus propias claves). Productos: Login Kit, Content Posting API y Display API, con los scopes `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload` y `video.publish`. Redirect URI: `https://<proyecto>.supabase.co/functions/v1/studio-tiktok-oauth`.
- En Sandbox solo pueden conectarse las cuentas agregadas como "Target users". Hasta que TikTok apruebe la app, lo que se publique por API queda privado (`SELF_ONLY`).

## Estructura

- `src/app/`: rutas de Next (wrappers delgados que cargan las vistas).
- `src/views/`: componentes de página.
- `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`: UI, hooks, contextos y lógica.
- `src/integrations/supabase/`: clientes de Supabase.
- `supabase/`: migraciones y edge functions.

## Despliegue

En Vercel, con el Framework Preset **Next.js** y las variables de entorno de `.env.example` configuradas.
