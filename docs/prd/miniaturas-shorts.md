# PRD · Miniatura con IA para Shorts (YouTube) y portada de Reels (Instagram)

> Para Cursor. El backend (columnas en la base y flujos de n8n) **ya está hecho, publicado y probado**. Tu trabajo es solo el **frontend**. No crees tablas, Edge Functions ni flujos de n8n. Si crees que falta algo del backend, anótalo en tu resumen final en vez de inventarlo.

## 1. Objetivo
En la Fábrica de Shorts, cada Short tiene un botón **"Generar miniatura"**:

1. n8n lee lo que dice el Short y propone **3 frases cortas y provocadoras** (arriba en blanco + remate en caja amarilla) y la **escena** a dibujar.
2. gpt-image-2 dibuja el **fondo vertical** (1088×1920) en el mismo estilo de monitos de palo de los videos. Usa **fotogramas del episodio** para que salgan los mismos personajes.
3. La app pone la frase encima (canvas, tipografía Anton como los Shorts) y arma un **JPG 1080×1920**.
4. El JPG se guarda **solo en la carpeta del PC** (la misma de los Shorts, que el usuario tiene en el disco D). **No se guarda en la nube.**
5. **YouTube:** los Shorts no aceptan miniatura por API; queda como pendiente para subirla en Studio con un clic.
6. **Instagram:** al replicar el Short como Reel, la misma imagen va como **portada** (`cover_url`). Sube a R2 junto con el video y n8n la borra al publicar.

Decisión del canal: la miniatura del Short **no lleva número de episodio**. El vínculo con el episodio ya lo dan el video relacionado y el comentario fijado.

## 2. Reglas del proyecto (obligatorias)
- Next.js 15 + TypeScript + Tailwind + shadcn/ui. Imita el estilo, la densidad de comentarios (en español) y los patrones de los archivos vecinos (`src/lib/studio/shorts.ts`, `shorts-render.ts`, `youtube-draft.ts`, `instagram.ts`, `src/views/studio/YouTubeShorts.tsx`, `src/components/studio/ShortPlanCard.tsx`).
- **No gastar recursos de Supabase:** nada de Storage, Realtime, polling ni Edge Functions nuevas. Solo agregar `cover_url` al `select` que ya existe de `studio_publications`, y a lo más una consulta chica a `studio_video_tasks` (ver 5.5).
- **Las imágenes no se suben a ningún lado** salvo a YouTube (directo desde el navegador, como hoy) y a R2 vía el webhook de Instagram (transitorio: n8n la borra al publicar).
- **No guardar imágenes en IndexedDB.** En IndexedDB solo va la ficha (frases, escena, ruta del archivo). Los archivos van a la carpeta elegida del PC.
- **Nunca** pongas claves ni secretos en el código. A n8n solo va el `access_token` de la sesión (`accessToken()` de `ai.ts`).
- Textos de la interfaz en español chileno neutro, claros, sin tecnicismos.
- Al terminar deben pasar `npx tsc --noEmit`, `npm run lint` y `npx vitest run`.

## 3. Cómo funciona el backend (ya hecho)
```
App (Fábrica de Shorts)                       n8n "VEXA Studio · Miniaturas" (webhook vexa-studio/thumbnail)
───────────────────────                       ──────────────────────────────────────────────────────────────
Generar miniatura ──POST JSON──────────────▶  valida sesión → gpt-5.5 escribe 3 frases + escena
  (texto del Short + 2-3 fotogramas)          → gpt-image-2 dibuja el fondo 9:16 con esos personajes
◀── { image: data:image/jpeg;base64, … } ───  (no guarda nada: ni R2 ni historial de ejecuciones)
canvas: fondo + frase → JPG 1080×1920
guarda en <carpeta>/<proyecto>/ (PC, disco D)

Programación YouTube (subida desde el navegador, como hoy)
  uploadVideo → setThumbnail(JPG)  ← solo videos largos; en Shorts queda thumbnail_pending para subirla en Studio

Instagram "subir video" (mismo webhook de hoy, multipart)
  video + cover(JPG) → R2 vexa-studio/ig-temp/ → studio_publications.cover_url
Instagram "publicar Reel": manda cover_url a Instagram (el 3.er intento sale sin portada), luego borra video y portada de R2.
Reloj diario: borra de R2 las portadas huérfanas.
```
Base de datos: `studio_publications` tiene dos columnas nuevas: `cover_key text`, `cover_url text`. **Las escribe n8n.** La app solo lee `cover_url`.

## 4. Contratos

### 4.1 Generar miniatura: `POST {N8N_BASE_URL}{THUMBNAIL_PATH}`
- `THUMBNAIL_PATH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_STUDIO_THUMBNAIL || "/webhook/vexa-studio/thumbnail"`
- `Content-Type: application/json`, mismo patrón que `generateMetadata` en `ai.ts`, y la respuesta se lee con `readResponse` de `ai.ts`.
- Tarda **30 a 90 s**. No pongas un timeout menor a 3 minutos.

Cuerpo:
```jsonc
{
  "access_token": "<sesión>",
  "stage": "propose",              // "propose" = frases + escena + imagen · "image" = solo otra imagen con `scene`
  "language": "en",                // project.language (idioma del Short)
  "profile": { "niche": "", "tone": "", "audience": "" },   // del ChannelProfile del canal de YouTube
  "episode": { "title": "nombre del proyecto" },            // opcional
  "short": {
    "title": "plan.title",
    "hook_line": "plan.hookLine",
    "description": "plan.description",
    "transcript": "[0.00-2.40] texto…\n[2.40-5.10] texto…"  // lo que dice el Short, con tiempos del Short (ver 5.2)
  },
  "frames": ["data:image/jpeg;base64,…"],   // 2-3 fotogramas del video ORIGINAL (ver 5.2). Máx. 3.
  "frame_urls": ["https://i.ytimg.com/vi/<id>/oar2.jpg"],  // solo si no hay video local y el Short ya está en YouTube
  "guidance": "",                  // indicación opcional del creador, en español ("que salga el león más grande")
  "avoid": ["SAME CRIME LIONS"],   // frases ya usadas en otras miniaturas del proyecto (top + highlight)
  "scene": ""                      // obligatorio solo con stage "image" (la escena a volver a dibujar, en inglés)
}
```

Respuesta OK:
```jsonc
{
  "ok": true,
  "image": "data:image/jpeg;base64,…",     // fondo SIN texto, 1088×1920
  "width": 1088, "height": 1920,
  "phrases": [                              // vacío si stage = "image"
    { "top": "SAME CRIME", "highlight": "LIONS", "trigger": "polemica", "why_es": "Marca la desigualdad…" },
    { "top": "RICH WALKED", "highlight": "POOR DUG", "trigger": "injusticia", "why_es": "…" },
    { "top": "NO DAYLIGHT", "highlight": "AGAIN", "trigger": "morbo", "why_es": "…" }
  ],
  "recommended": 0,
  "scene": "Medium-close shot in a Roman arena tunnel…",   // guárdala: sirve para "Otra imagen"
  "concept_es": "La miniatura muestra que…",
  "usage": { "text": {…} | null, "image": {…} }
}
```
- `top` puede venir vacío (solo va la caja amarilla).
- Error: `{ "ok": false, "error": "mensaje en español" }` (HTTP 200). Si el error es de la imagen, igual vienen `phrases` y `scene`: muéstralas y deja el botón "Otra imagen".
- `401` → sesión expirada (ya lo maneja `readResponse`).

### 4.2 Instagram: subir video y/o portada (webhook de hoy, `UPLOAD_PATH` en `instagram.ts`)
Multipart, igual que `uploadReelVideo`. Campos:
- `publication_id`, `access_token` (como hoy)
- `video` (MP4/MOV), **opcional ahora**
- `cover` (**JPG**, máx. 8 MB), **nuevo y opcional**. Nómbralo `portada.jpg` con `type: "image/jpeg"`.
- `remove_cover = "1"` quita la portada guardada (si no viene `cover`).

Se puede mandar video + portada, solo portada o solo `remove_cover`. Respuesta:
```json
{ "ok": true, "publication_id": "…", "media_url": "…", "media_size": 123, "cover_url": "https://…/…-cover.jpg" }
```
- `cover_url` es `null` si la publicación no tiene portada.
- Solo se acepta en publicaciones `borrador`, `programado` o `error`. Si no, responde `{ ok:false, error }`.
- La alarma solo se rearma cuando llega **video**. Subir solo la portada no cambia la hora.

### 4.3 `studio_publications.cover_url`
Agrégala a `COLUMNS`, `PublicationRow` (`cover_url: string | null`) y `InstagramPublication` (`coverUrl: string | null`). La app **no la escribe** (la escribe n8n).

## 5. Lo que hay que construir

### 5.1 Nuevo `src/lib/studio/thumbnails.ts`
- Tipos `ThumbnailPhrase { top; highlight; trigger; why_es }` y `ThumbnailResult` (respuesta de 4.1).
- `generateThumbnail(input)` → POST de 4.1 (`stage` `"propose"` o `"image"`).
- `composeThumbnail(background: Blob | string, phrase: { top: string; highlight: string }): Promise<File>` → canvas **1080×1920**:
  - Fondo escalado a "cover": 1088 → 1080, centrado.
  - Espera `loadShortFonts()` de `shorts-render.ts`. Usa la tipografía **Anton**, igual que los Shorts.
  - `top` en blanco con borde negro grueso (~10 px).
  - `highlight` en negro dentro de una caja **#FFE14D** con bordes redondeados (el mismo amarillo de los Shorts; expórtalo desde `shorts-render.ts` en vez de repetirlo).
  - Centrado horizontal. Ancho máximo del texto: 900 px (achica la letra hasta que quepa). Si el remate es largo, pártelo en 2 líneas como máximo.
  - Bloque de texto entre **y = 280 y y = 860**: dentro del recorte central 3:4 que muestra la cuadrícula de Instagram (y 240–1680) y lejos de los botones de YouTube abajo.
  - Exporta `image/jpeg` con calidad 0.9. Si pesa más de 2 MB, baja a 0.8 (YouTube acepta hasta 2 MB).
  - Archivo: `${baseName}-miniatura.jpg`.
- `thumbnailTranscript(plan, cues)` → usa `buildTimeline(plan, cues).captions` para armar líneas `[inicio-fin] palabras` con los tiempos **del Short**.
- `captureFrames(video: File, plan, max = 3)` → `<video>` oculto + canvas:
  - Toma fotogramas en la **mitad de cada segmento** de `plan.segments` (segundos del video original; si hay un solo segmento, al 30 % y al 70 % de él).
  - JPEG de 768 px de ancho, calidad 0.8, como data URL.
  - Sin video local, devuelve `[]`.
  - Libera el object URL al terminar.
- Ficha local (IndexedDB, almacén `FILES` que ya existe, clave `${projectId}:thumb:${planId}`). Guarda solo `{ planId, phrases, recommended, phrase: {top, highlight}, scene, conceptEs, path?: [sub, file], bgPath?: [sub, file], createdAt }`, **nunca el archivo**.
  - `saveThumbnail(project, planId, data, files: { final: File; background: Blob }, folder)`: escribe en `<carpeta>/<proyecto>/` el JPG final y el fondo sin texto (`${baseName}-miniatura-fondo.jpg`, para cambiar la frase sin volver a pagar) con `writeFile` de `shorts.ts`, y guarda la ficha.
  - `loadThumbnails(project, folder)`: lee las fichas y los archivos desde la carpeta (mismo patrón que `loadRenders`). Si el archivo ya no está, la ficha queda sin archivo.
  - `deleteProject` (en `shorts.ts`) también borra las fichas `:thumb:` del proyecto. Los archivos del PC se quedan, igual que los renders.
- `baseName`: el del archivo del render si existe; si no, un nombre seguro del título del plan (`safeName`).
- `writeFile` y `safeName` hoy son privados en `shorts.ts`: **expórtalos** (no los dupliques).

### 5.2 `ShortPlanCard.tsx`: sección "Miniatura"
- Botón **"Generar miniatura"** (icono `ImagePlus`). Se puede usar antes o después de renderizar.
- Antes de generar, pide la carpeta igual que `beforeRender` en `YouTubeShorts.tsx` (dentro del clic). En el selector muestra: "Elige tu carpeta de Shorts en el disco D (por ejemplo D:\VEXA\Shorts). Ahí se guardan los videos y las miniaturas." Si cancela, la miniatura queda solo en pantalla con el botón **Bajar** y el aviso "No quedó guardada: elige la carpeta para guardarla".
- Mientras genera: "Pensando la frase y dibujando… (30-90 s)". Bloquea la tarjeta igual que el render (`onActive`).
- Al terminar, muestra un **editor chico**:
  - Vista previa 9:16 (canvas o `<img>` del `composeThumbnail`).
  - Las 3 frases como opciones (la recomendada marcada "Recomendada", con su `why_es` debajo). Al elegir una se recompone al instante, sin llamar a n8n.
  - Dos campos editables: "Arriba (blanco)" y "Remate (amarillo)". Mayúsculas automáticas. Recompone al escribir (con debounce).
  - Interruptor **"Ver recorte de Instagram"**: oscurece lo que queda fuera del 3:4 central.
  - **"Otra imagen"**: `stage: "image"` con la misma `scene`. **"Cambiar escena"**: textarea con la escena (en inglés) + "Dibujar". **"Nuevas frases"**: `stage: "propose"` de nuevo.
  - Campo opcional **"Indicaciones para la IA"** (`guidance`).
  - **"Guardar miniatura"**: guarda el final + el fondo en la carpeta (5.1).
  - **"Bajar"**: descarga el JPG.
- Texto chico fijo: "Cada imagen gasta unos centavos de OpenAI."
- Si ya hay miniatura guardada, la tarjeta muestra la miniatura chica con "Editar" y "Generar otra".
- `frames`: `captureFrames(video, plan)`. Si no hay video local y el Short ya está en YouTube (ver 5.5), manda `frame_urls: ["https://i.ytimg.com/vi/<videoId>/oar2.jpg"]`. Si no hay ninguno, genera igual con el aviso: "Sin fotogramas del episodio los personajes pueden salir distintos".
- `avoid`: frases (`top + " " + highlight`) de las otras miniaturas del mismo proyecto.

### 5.3 Enviar a Programación (`sendShortToSchedule` en `shorts.ts`)
- Recibe la miniatura guardada (si hay) y la pone en `thumbnailFile` del borrador.
- Si el Short **ya se envió** y el borrador sigue sin subir, "Guardar miniatura" también actualiza `thumbnailFile` de ese borrador (`sentToSchedule[plan.id]` = id del borrador; usa las funciones de borradores de `youtube-draft.ts`).

### 5.4 Subida a YouTube (`youtube-draft.ts`)
- **Actualizado:** YouTube responde OK a `thumbnails.set` en los Shorts pero no aplica la imagen. En los Shorts ya no se llama a `setThumbnail`: la tarea queda con `thumbnail_pending = true` y una copia temporal del JPG en IndexedDB (`yt-thumb:<videoId>`). En "Pendientes en YouTube", **"Subir miniatura"** baja el JPG y abre YouTube Studio; **"Ya la subí"** quita el pendiente y borra la copia. `quotaUnits` suma 50 solo en videos largos.
- En `YouTubeDraftEditor.tsx`, el campo "Miniatura" ahora se ve también en Shorts, con el texto "Miniatura (JPG vertical 1080×1920, máx. 2 MB)" y la vista previa vertical.

### 5.5 Miniatura de un Short que ya está en YouTube
- Busca su `video_id`: `studio_video_tasks` con `source_ref = shortsSourceRef(project.id, plan.id)` (una consulta chica, `select("video_id")`, al abrir el editor de miniatura).
- Si existe, muestra **"Subir en YouTube Studio"**: baja el JPG, abre YouTube Studio y deja la tarea con `thumbnail_pending = true`. Guardar una miniatura nueva también la deja pendiente.

### 5.6 Instagram
- `FactoryShort` (`instagram.ts`) suma `thumbnail?: File`. `loadFactoryShorts` y `factoryShortFrom` la leen con `loadThumbnails`.
- `uploadReelVideo(publicationId, file, onProgress, cover?: File | null)`: si viene `cover`, agrega `form.append("cover", cover, "portada.jpg")` y devuelve también `coverUrl`.
- Nuevas: `uploadReelCover(publicationId, cover: File)` (solo portada) y `removeReelCover(publicationId)` (`remove_cover=1`). Ambas usan el mismo endpoint y devuelven `coverUrl`.
- Valida la portada: JPG y menos de 8 MB. Si no cumple: "La portada tiene que ser JPG de hasta 8 MB."
- En `ReplicateFromYouTubeSheet.tsx` y en el envío a Instagram desde la Fábrica (`onSendInstagram`):
  - Si el Short tiene miniatura, muestra la portada y un check **"Usar la miniatura como portada"** (marcado por defecto). Marcado: oculta el selector de segundo de portada (`thumb_offset`) y sube el JPG junto al video.
  - Desmarcado: queda el selector de segundo como hoy.
- En el editor de una publicación de Instagram (Programación):
  - Si tiene `coverUrl`, muestra la portada con "Cambiar portada (JPG)" y "Quitar portada".
  - Si no tiene, ofrece "Subir portada (JPG)" junto al selector de segundo.
  - Solo en `borrador`, `programado` o `error`.
- Nota para el usuario en la ficha: "Si Instagram rechaza la portada, el último reintento sale sin ella (con el segundo elegido)."

## 6. Mensajes clave (úsalos tal cual o muy parecidos)
- Botón: **Generar miniatura** · Cargando: **Pensando la frase y dibujando… (30-90 s)**
- Sin carpeta: **Elige tu carpeta de Shorts en el disco D (por ejemplo D:\VEXA\Shorts). Ahí se guardan los videos y las miniaturas.**
- Guardada: **Miniatura guardada en tu carpeta: {proyecto}/{archivo}**
- Pendiente: **Falta subir la miniatura en YouTube Studio (YouTube no la acepta por API en los Shorts).**
- Costo: **Cada imagen gasta unos centavos de OpenAI.**

## 7. Fuera de alcance (no hacer)
- Miniaturas de videos largos (con "Episodio N"): será otra fase.
- Generar portadas desde la vista de Instagram para Reels que no vienen de la Fábrica.
- Guardar imágenes en Supabase, IndexedDB o cualquier nube.
- Cambiar los flujos de n8n o la base.

## 8. Criterios de aceptación
1. En un Short de la Fábrica, "Generar miniatura" devuelve fondo + 3 frases en menos de 2 minutos. La vista previa muestra la frase recomendada con el estilo de los Shorts.
2. Cambiar de frase o editar el texto recompone sin llamar a n8n. "Otra imagen" llama con `stage: "image"` y la misma escena.
3. "Guardar" deja `…-miniatura.jpg` (1080×1920, ≤ 2 MB) y `…-miniatura-fondo.jpg` en `<carpeta>/<proyecto>/`. En IndexedDB no queda ningún Blob de imagen.
4. Enviar el Short a Programación lleva la miniatura. Al subirlo no se llama a `thumbnails.set`: queda en "Pendientes en YouTube" con "Subir miniatura".
5. En un Short ya subido, "Subir en YouTube Studio" baja la imagen, abre Studio y deja el pendiente en Programación.
6. Al replicar a Instagram con "Usar la miniatura como portada", el multipart lleva `cover` y la publicación queda con `cover_url`. Al publicar, Instagram muestra esa portada.
7. Cambiar o quitar la portada de un Reel programado funciona sin cambiar su hora.
8. `tsc`, `lint` y `vitest` pasan. Agrega tests a `composeThumbnail` (tamaño de salida y achique de letra con un mock de canvas, si el patrón de tests lo permite) y a `thumbnailTranscript`.

## 9. Entrega
- Antes de empezar: `git pull origin main`.
- Commit con mensaje en español. **No hagas push**: el usuario lo hace y luego Claude valida.
- En tu resumen final, lista los archivos tocados y cualquier duda sobre el backend.
