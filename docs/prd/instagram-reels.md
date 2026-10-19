# PRD · Instagram en el Content Studio: Reels programados y replicados desde YouTube

> Para Cursor. El backend (tabla, seguridad y flujos de n8n) **ya está hecho y probado**. Tu trabajo es solo el **frontend y la conexión de la app** con ese backend. No crees tablas, Edge Functions ni flujos de n8n; si crees que falta algo del backend, anótalo en tu resumen final en vez de inventarlo.

## 1. Objetivo
Que los mismos Shorts que se generan en la Fábrica de Shorts y se programan en YouTube se puedan **replicar a Instagram como Reels** en pocos clics, con su propio texto, configuración y calendario, sin rehacer la programación a mano. Instagram debe tener secciones parecidas a las de YouTube.

## 2. Reglas del proyecto (obligatorias)
- Next.js 15 + TypeScript + Tailwind + shadcn/ui. Imita el estilo, la densidad de comentarios (en español) y los patrones de los archivos vecinos (`src/views/studio/YouTube*.tsx`, `src/lib/studio/*.ts`).
- **No gastar recursos de Supabase**: Supabase solo para tablas (lecturas y escrituras chicas con RLS). Nada de Storage de Supabase ni Edge Functions nuevas. Los archivos pesados van a n8n (y n8n los deja en R2).
- **Nunca** pongas claves, tokens ni secretos en el código. El único dato de sesión que se manda a n8n es el `access_token` de la sesión de Supabase del usuario (igual que `src/lib/studio/ai.ts → accessToken()`).
- No toques la lógica de YouTube salvo el pequeño enganche de la sección 6.4.
- Textos de la interfaz en español chileno neutro, claros, sin tecnicismos.
- Al terminar: `npx tsc --noEmit`, `npm run lint` y los tests existentes (`npx vitest run` si aplica) deben pasar.

## 3. Cómo funciona el backend (ya hecho)
```
App (navegador)                         n8n                                   Instagram
──────────────                          ───                                   ─────────
1. insert en studio_publications  ─┐
   (borrador o programado)         │
2. POST multipart del MP4  ───────────► "Instagram: subir video"
                                         valida sesión, sube a R2 (transitorio),
                                         guarda media_url en la fila
                                         └► si ya está programada: arma la ALARMA
3. Cambios de hora sin video nuevo ───► "Instagram: programar" (POST JSON)
   (reprogramar, reintentar,             valida sesión └► arma la ALARMA
    publicar ahora, borrador→programado)
                                         "Instagram: alarma": duerme hasta scheduled_at
                                         └► "Instagram: publicar Reel"
                                              toma la fila SOLO si sigue programada para esa hora
                                              crea contenedor ───────────────►  procesa
                                              revisa cada 30 s / publica ────►  Reel publicado
                                              primer comentario, BORRA el video de R2,
                                              marca publicado + permalink, aviso Telegram
                                         "Instagram: reloj" (cada hora, red de seguridad)
                                         publica las vencidas que no tuvieron alarma
```
- **No hay reloj revisando cada minuto.** Cada Reel tiene su propia alarma en n8n que despierta a la hora exacta. Mientras duerme no gasta nada, y aguanta que la app esté cerrada.
- La app **avisa a n8n** (contrato 4.4) cada vez que la hora o el estado cambian sin subir video nuevo. Si sube video, no hace falta: la subida arma la alarma sola.
- **Mover o cancelar no necesita "borrar alarmas"**: la alarma vieja despierta, ve que la fila ya no está programada para esa hora y se apaga sola.
- **Avisar de más no hace daño**: n8n toma la fila de forma atómica, así que un Reel nunca sale dos veces.
- Si el aviso falla (sin internet, etc.), el **repaso de cada hora** lo publica igual, con hasta 1 hora de atraso. Por eso un fallo del aviso no bloquea a la usuaria: solo se muestra un aviso suave.
- **"Publicar ahora"** = guardar la fila con `status = 'programado'` y `scheduled_at = new Date()`, y luego avisar a n8n (4.4). Sale en 1 a 3 minutos.
- **Los videos en R2 son transitorios**: se borran apenas se publica. Una limpieza diaria borra los huérfanos y suelta los de publicaciones en error (más de 3 días) o borradores abandonados (más de 14 días).
- Reintentos: si Instagram falla, n8n reintenta hasta 3 veces cada 5 minutos. Después queda `status = 'error'` con `last_error` legible y llega un aviso por Telegram.

## 4. Contratos

### 4.1 Tabla `public.studio_publications` (ya existe, con RLS por tenant)
| Columna | Tipo | La escribe | Notas |
|---|---|---|---|
| id | uuid | default | |
| tenant_id | uuid | app | tenant actual |
| account_id | uuid | app | cuenta de Instagram (`studio_accounts.platform = 'instagram'`) |
| platform | text | app | `'instagram'` (más adelante `'tiktok'`) |
| format | text | app | `'reel'` |
| title | text | app | nombre interno para el calendario (no se publica) |
| caption | text | app | **texto final tal cual sale en Instagram, hashtags incluidos** (máx. 2.200) |
| settings | jsonb | app | `{ share_to_feed?: boolean (default true), thumb_offset_ms?: number, collaborators?: string[] (máx 3, sin @), location_id?: string, first_comment?: string, audio_name?: string }` |
| source_ref | text | app | origen del video: `'shorts:<projectId>:<planId>'`, `'youtube:<videoId>'` o `'upload'` |
| youtube_video_id | text | app | id del Short gemelo en YouTube (si existe) |
| status | text | app / n8n | app: solo `'borrador'` o `'programado'`. n8n: `'publicando'`, `'publicado'`, `'error'` |
| scheduled_at | timestamptz | app | obligatorio si `status = 'programado'` |
| media_key, media_url, media_size, media_uploaded_at | | **n8n** | la app solo los lee (`media_url` no nulo = video listo) |
| container_id, container_created_at, external_id, permalink, published_at, attempts, retry_after, last_error | | **n8n** | solo lectura para la app |
| created_by, created_at, updated_at | | default | |

Reglas que impone la base (trigger `studio_publications_guard`); muéstralas bien en la UI:
- Desde la app, una fila solo puede quedar en `borrador` o `programado`. Los campos de n8n se ignoran si la app los manda.
- No se puede editar una fila `publicando` o `publicado` (se lanza un error con mensaje en español). Tampoco se puede borrar una `publicando`.
- Pasar de `error` a `programado`, o cambiar `scheduled_at`, reinicia los intentos y limpia el error. Así se reintenta.
- La cuenta tiene que ser del mismo tenant y de la misma plataforma.

También existe `studio_video_tasks.source_ref` (text, nueva) para vincular un Short de YouTube con su archivo de la Fábrica (ver 6.4).

### 4.2 Subir el video: `POST {N8N_BASE_URL}/webhook/vexa-studio/instagram/upload`
- `multipart/form-data` **sin headers personalizados** (así no hay preflight de CORS): campos `video` (File), `publication_id`, `access_token`, `size` (opcional).
- Antes de subir, la fila **ya debe existir** (insertada por la app) en `borrador`, `programado` o `error`.
- Solo MP4 o MOV, hasta 300 MB. **Instagram no acepta WebM.**
- Respuestas: `200 {ok:true, publication_id, media_url, media_size}` · `400 {ok:false, error}` (mensaje listo para mostrar) · `401 {ok:false, error:'unauthorized'}`.
- Si la fila ya tenía video, n8n reemplaza y borra el anterior.
- Usa `XMLHttpRequest` para mostrar el progreso de subida (los Shorts pesan entre 20 y 90 MB).

### 4.3 Textos con IA: `POST {N8N_BASE_URL}/webhook/vexa-studio/instagram/captions`
```jsonc
// request (JSON)
{
  "access_token": "<sesión supabase>",
  "language": "es",                    // idioma del Short
  "profile": { "description": "", "audience": "", "tone": "", "cta": "" }, // perfil del canal (ai_profile), puede ir vacío
  "items": [                            // máx 10 por llamada (si son más, divide en lotes)
    { "ref": "<id propio para cruzar>", "title": "", "description": "", "transcript": "texto o SRT con tiempos", "duration_seconds": 42, "notes": "" }
  ]
}
// response 200
{
  "ok": true,
  "items": [
    { "ref": "...", "ok": true, "hook": "", "body": "", "cta": "", "hashtags": ["#..."],
      "caption": "texto final listo (gancho + cuerpo + CTA + hashtags)",
      "first_comment": "", "thumb_offset_ms": 3000, "notes_es": "por qué este ángulo" }
  ]
}
```
Errores: `401` para sesión inválida y `400` para el resto, con `{ok:false, error}`. Tarda de 10 a 40 s; muestra un estado de carga.

### 4.4 Avisar la hora a n8n: `POST {N8N_BASE_URL}/webhook/vexa-studio/instagram/programar`
- JSON `{ "access_token": "<sesión supabase>", "publication_id": "<uuid>" }`. Se manda igual que 4.3.
- **Cuándo llamarlo:** justo después de guardar en la base cualquier cambio que deje la fila en `programado` **sin subir video nuevo**:
  - programar un borrador que ya tiene video
  - cambiar `scheduled_at` (reprogramar o arrastrar en el calendario)
  - **Publicar ahora**
  - **Reintentar** un Reel en error que conserva su video
- **Cuándo no hace falta:** después de `uploadReelVideo`, porque la subida arma la alarma sola. Tampoco al pasar a borrador o al borrar: la alarma vieja se apaga sola.
- Respuestas:
  - `200 {ok:true, armed:true, publication_id, scheduled_at}`: alarma puesta.
  - `200 {ok:true, armed:false, publication_id, reason}`: no hacía falta. `reason` es `'no_programada'` o `'sin_video'`; en este último caso la alarma se arma cuando termine la subida.
  - `404 {ok:false, error}`: la publicación no es de esta cuenta.
  - `401 {ok:false, error:'unauthorized'}`.
- Es rápido (< 1 s). **Si falla, no deshagas el cambio**: la fila ya quedó programada y el repaso de cada hora la publica igual. Muestra un aviso suave: "No pudimos avisar la hora exacta a Instagram; saldrá igual, con hasta 1 hora de atraso." Puedes reintentar el aviso una vez.

## 5. Constantes
- En `src/lib/studio/instagram.ts` (nuevo), usa el mismo patrón de `ai.ts`:
  - `NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_UPLOAD || "/webhook/vexa-studio/instagram/upload"`
  - `NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_CAPTIONS || "/webhook/vexa-studio/instagram/captions"`
  - `NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_IG_SCHEDULE || "/webhook/vexa-studio/instagram/programar"`
- Reutiliza `accessToken()` y `readResponse()` de `ai.ts`: expórtalos en vez de duplicarlos.

## 6. Lo que hay que construir

### 6.1 Capa de datos: `src/lib/studio/instagram.ts`
- Tipos `InstagramPublication` y `PublicationSettings` (camelCase en la app y snake_case en la base, con un mapeo explícito).
- `listPublications(accountId, from, to)` y `getPublication(id)`.
- `createPublication(input)`: inserta la fila y devuelve el id.
- `updatePublication(id, patch)`: solo campos editables.
- `deletePublication(id)`.
- `notifySchedule(id)`: llama al contrato 4.4 y devuelve `{ armed, reason? }`. Nunca lanza un error hacia arriba: si falla, devuelve `{ armed: false, reason: 'aviso_fallido' }` para que la UI muestre el aviso suave.
- `schedulePublication(id, date)`, `publishNow(id)` (que es `programado` con `scheduled_at = new Date()`) y `retryPublication(id, date?)`: guardan en la base y **luego llaman a `notifySchedule(id)`**. Lo mismo vale para `updatePublication` cuando cambia `scheduled_at` o pasa a `programado`. Centraliza esto en un solo lugar para que ningún camino se olvide del aviso.
- `unschedule(id)`: vuelve a borrador. No avisa a n8n.
- `uploadReelVideo(publicationId, file, onProgress)`, contra el contrato 4.2. Antes de subir valida en el navegador que el archivo sea MP4/MOV y que pese menos de 300 MB; si es WebM, muestra el mensaje de la sección 7.
- `generateCaptions(items, profile, language)`, contra el contrato 4.3, con lotes de 10.
- `subscribePublications(accountId, cb)`: **no uses Realtime** (gasta recursos). Usa polling liviano cada 20 s, y solo mientras haya filas `programado`/`publicando` a menos de 15 min o la pestaña esté visible.

### 6.2 Navegación y rutas
- En `StudioLayout.tsx` → `platformSubNav.instagram`: **Inicio** (`/studio/instagram`), **Programación** (`/studio/instagram/programar`), **Análisis** (`/studio/instagram/analisis`) y **Rendimiento** (`/studio/instagram/rendimiento`). Las dos últimas por ahora muestran un estado "Próximamente" bien diseñado: el backend de métricas llega en la fase 3.
- Las rutas `src/app/(protegido)/studio/[plataforma]/{programar,analisis,rendimiento}/page.tsx` hoy cargan vistas de YouTube. Haz que elijan la vista según `plataforma`: `youtube` usa las actuales, `instagram` usa las nuevas `src/views/studio/Instagram*.tsx` y cualquier otra muestra la vista genérica.
- En `platforms.ts`:
  - Instagram: la acción "Programar publicación" lleva a `/studio/instagram/programar`.
  - "Publicar Reel" abre el compositor nuevo (6.3).
  - "Repost desde TikTok / Shorts" pasa a `disponible`, se llama **"Replicar Shorts de YouTube"** y lleva a Programación con el panel de replicar abierto (`?replicar=1`).
  - Las acciones "carrusel" y "caption-ia" quedan como están.
- Quita para Instagram el `PostComposerDialog` simulado: hoy solo manda un evento a n8n y no publica nada.

### 6.3 Vista **Programación de Instagram** (`src/views/studio/InstagramProgramacion.tsx`), la pieza central
Toma como referencia visual y de interacción `YouTubeProgramacion.tsx`: misma navegación por semana y el mismo lenguaje visual.

**Calendario semanal con dos carriles por día:**
- **Carril YouTube** (arriba, atenuado, solo lectura): los Shorts del canal de YouTube gestionado en esa semana, tanto los programados (privados con `publishAt`) como los publicados.
  - Reutiliza `fetchYouTubeVideos` y el mismo criterio que `YouTubeProgramacion` para ubicar cada video por fecha.
  - Cada Short sin gemelo en Instagram (no hay publicación con ese `youtube_video_id`) muestra el botón **"Replicar →"**.
  - Si ya tiene gemelo, muestra un ícono de vínculo con el estado del Reel.
- **Carril Instagram**: las publicaciones de la semana, con chip de estado:
  - Borrador (gris)
  - Programado (azul, con hora)
  - Subiendo video (con %)
  - Video listo / falta video (si está programado y `media_url` es null, muestra una advertencia)
  - Publicando… (spinner)
  - Publicado (verde, con link al `permalink`)
  - Error (rojo, con `last_error` y botón **Reintentar**, que vuelve a `programado` con la misma hora o la próxima libre si ya pasó)
- Barra superior:
  - **"Replicar semana desde YouTube"**
  - **"Nuevo Reel"**
  - Selector de cuenta de Instagram, si hay más de una gestionada
- Lista "Sin fecha" con los borradores.
- Arrastrar un Reel a otro día u hora para reprogramarlo es deseable, pero no obligatorio en esta fase.

**Panel "Replicar desde YouTube"** (Sheet/Dialog), lo más importante:
1. Lista los Shorts de YouTube de la semana visible (y de la siguiente, con un toggle) que aún no tienen gemelo. Todos vienen marcados.
2. Por cada uno resuelve el **archivo** en este orden:
   - (a) `studio_video_tasks.source_ref` → `shorts:<projectId>:<planId>` → `loadRenders(project, folder)` de `shorts.ts`, para obtener el `StoredRender.file` y su `srt`.
   - (b) Si no hay vínculo, busca en los proyectos de la Fábrica (`listProjects`) un plan cuyo `sentToSchedule` y título coincidan con el título del Short.
   - (c) Si no aparece, muestra **"Elegir archivo"**, que abre un selector local.
   - Si el archivo es WebM, avisa con el mensaje de la sección 7 y no deja continuar con ese ítem.
3. **Horario**, con un modo para todos y ajuste individual:
   - **Misma hora que YouTube** (por defecto)
   - **Con desfase**: +N horas, con un selector de 1 a 48 h (por defecto +3 h)
   - **Huecos de mi plan de Instagram**: usa `studio_accounts.publish_plan` de la cuenta de Instagram con la misma estructura y helpers de `publish-plan.ts` (`PlanRule`, presets…). Si la cuenta no tiene plan, ofrece crearlo con los mismos presets que YouTube, adaptados a "Reel".
   - Nunca se programa en el pasado: si la hora calculada ya pasó, toma el próximo hueco y avísalo.
4. Botón **"Escribir textos con IA"**: llama a `generateCaptions` con:
   - título, descripción y transcripción (el `srt` del render, o `timelineToSrt`) de cada Short
   - `profile` = `ai_profile` de la cuenta de Instagram o, si está vacío, el de la cuenta de YouTube (dilo en la UI: "usando el perfil de tu canal de YouTube")
   - El resultado se muestra en tarjetas editables por Reel: textarea del caption con contador de 2.200, hashtags como chips (máx. 5), primer comentario, segundo de portada y `notes_es` como ayuda.
5. **Confirmar**: por cada ítem, en serie y con progreso visible:
   - `createPublication` en `programado`, con `source_ref`, `youtube_video_id`, `title` (el título del Short) y `settings` (`thumb_offset_ms`, `first_comment`, `share_to_feed: true`)
   - `uploadReelVideo`
   - Si falla la subida, la fila queda programada pero sin video. Muestra un aviso y deja "Reintentar subida" en el calendario.
   - Al final, un toast con el resumen.

**Compositor "Nuevo Reel / Editar Reel"** (Dialog):
- Origen del video: un Short de la Fábrica (lista de renders listos de los proyectos de la cuenta de YouTube gestionada) o un archivo del PC (MP4/MOV).
- Vista previa del video con selector de portada: un slider que fija `thumb_offset_ms` mostrando el frame.
- Caption con contador, botón "Escribir con IA" (una sola llamada a 4.3), hashtags (máx. 5), primer comentario, colaboradores (hasta 3 @usuarios) y switch "Mostrar también en el feed".
- Acciones: **Guardar borrador**, **Programar** (fecha y hora, por defecto el próximo hueco del plan) y **Publicar ahora**, que pide confirmación.
- Editar solo se permite en `borrador`, `programado` o `error`; en `publicando` y `publicado` el diálogo es de solo lectura, con link al Reel.

### 6.4 Enganche mínimo en YouTube (lo único que se toca de YouTube)
- Cuando un borrador nacido de la Fábrica (`sendShortToSchedule`) se sube a YouTube, guarda en `studio_video_tasks.source_ref` el valor `shorts:<projectId>:<planId>`.
  - Para eso, `sendShortToSchedule` debe guardar `sourceRef` en el `YouTubeDraft` (campo opcional nuevo).
  - Donde se llama a `saveVideoTask` tras la subida, pásalo como `sourceRef` (campo opcional nuevo en `SaveTaskInput`, que se mapea a `source_ref`).
- **Opcional, recomendado:** en la Fábrica de Shorts, junto a "Enviar a Programación", agrega **"También a Instagram"**: crea el Reel en borrador con ese render y abre el compositor.

### 6.5 Inicio de Instagram (`/studio/instagram`)
- Tarjeta de la cuenta: avatar, @, seguidores y estado del permiso.
- Próximos 5 Reels programados.
- Últimos 5 publicados, con link.
- Errores pendientes.
- Accesos a "Replicar semana desde YouTube" y "Nuevo Reel".
- Mantén las tarjetas de acciones de `platforms.ts` debajo, como en YouTube.

## 7. Mensajes clave (úsalos tal cual o muy parecidos)
- **WebM:** "Instagram solo acepta MP4. Este Short se grabó en WebM: vuelve a exportarlo desde la Fábrica en Chrome o Edge actualizado (graban MP4) o conviértelo a MP4 antes de subirlo."
- **Programado sin video:** "Falta subir el video. Si llega la hora sin video, este Reel no saldrá."
- **Publicando:** "Instagram está procesando el video. Suele tardar 1 a 3 minutos."
- **Error final:** muestra `last_error` y "Puedes reintentarlo: se vuelve a programar con el mismo video si todavía está guardado, o te pediremos subirlo de nuevo." Si `media_url` es null, el reintento debe pedir el archivo otra vez.

## 8. Fuera de alcance (no hacer)
- Carruseles, historias, métricas o insights de Instagram (fase 3), TikTok y calendario unificado.
- Cualquier cambio de backend, tabla, Edge Function o n8n.
- Supabase Realtime o Storage.

## 9. Criterios de aceptación
1. Desde Programación de Instagram, "Replicar semana desde YouTube":
   - lista los Shorts de la semana
   - encuentra sus archivos de la Fábrica (o los pide)
   - genera textos con IA
   - programa todo en un clic, con progreso de subida
2. Un Reel programado aparece en el carril con su estado. Al llegar la hora pasa solo a "Publicando…" y luego a "Publicado" con link, sin recargar la página (polling).
3. "Publicar ahora" publica en menos de unos 3 minutos.
3b. Programar, reprogramar, reintentar y "Publicar ahora" llaman al aviso 4.4 (se ve en la pestaña Network). Si el aviso falla, el cambio queda guardado igual y aparece el aviso suave.
4. Un WebM se rechaza antes de subirse, con el mensaje de la sección 7.
5. Los Reels en error muestran el motivo y se pueden reintentar.
6. YouTube sigue funcionando igual (Programación, Shorts, subida).
7. `tsc`, lint y tests pasan.
8. No hay secretos en el código.

## 10. Entrega
Al terminar, responde con:
- la lista de archivos creados o modificados
- las decisiones que tomaste donde este PRD no era explícito
- lo que quedó pendiente o lo que crees que falta del backend
