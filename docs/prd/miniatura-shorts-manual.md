# PRD · Miniatura de Shorts: pendiente para subir a mano en YouTube Studio

> Para Cursor. El backend **ya está hecho** (columna `thumbnail_pending` en `studio_video_tasks`). Tu trabajo es solo el **frontend**. No crees tablas, Edge Functions ni flujos de n8n.

## 1. Por qué
YouTube responde **OK** a `thumbnails.set` en los Shorts, pero **no aplica la imagen**. Studio queda en estado "miniatura propia" y muestra un cuadro del video. Esto está probado: se reintentó con "Subir a YouTube ahora" en un Short ya procesado y el resultado fue el mismo. Cuando la misma imagen se sube a mano en YouTube Studio, sí funciona.

Como YouTube no devuelve error, la app nunca muestra el aviso de hoy (`ThumbnailRejectedNotice`). Además, ese aviso vive solo en memoria.

**Decisión:** en los **Shorts**, la app deja de subir la miniatura por la API. Al programar un Short que tiene miniatura, queda un **pendiente "Subir miniatura"**. Ese botón baja el JPG ya generado y abre la página del video en YouTube Studio para que el usuario lo suba ahí. En los **videos largos** no cambia nada, porque ahí la API sí funciona.

## 2. Reglas del proyecto (obligatorias)
- Next.js 15 + TypeScript + Tailwind + shadcn/ui. Imita el estilo, los comentarios en español y los patrones de los archivos vecinos (`youtube-draft.ts`, `video-tasks.ts`, `VideoTasks.tsx`, `YouTubeProgramacion.tsx`, `ShortThumbnailEditor.tsx`).
- **No gastar recursos de Supabase.** Nada de polling, Realtime, Storage ni Edge Functions. Solo lee y escribe `thumbnail_pending` en las mismas consultas a `studio_video_tasks` que ya existen.
- La imagen **no se sube a ningún lado**. Se baja al PC con `downloadFile` (de `thumbnails.ts`).
- Textos en español chileno neutro, sin tecnicismos.
- Al terminar deben pasar `npx tsc --noEmit`, `npm run lint` y `npx vitest run`.

## 3. Backend (ya hecho)
```sql
alter table public.studio_video_tasks
  add column thumbnail_pending boolean not null default false;
```
Los Shorts `uPzm3fvWVdI` y `uwiodyxXMBI` ya quedaron con `thumbnail_pending = true`, así que sirven para probar.

## 4. Cambios

### 4.1 `src/lib/studio/video-tasks.ts`
- Agrega `thumbnailPending: boolean` a `VideoTask` y `thumbnail_pending` a `TaskRow`, `COLUMNS` y `toTask`.
- **`SaveTaskInput`:** agrega `thumbnailPending?: boolean`. En el `upsert`, inclúyelo **solo si viene**, igual que `source_ref` (`...(input.thumbnailPending !== undefined ? { thumbnail_pending: input.thumbnailPending } : {})`). Así, volver a guardar las tareas de un video no borra el pendiente.
- **`updateVideoTask`:** acepta `thumbnailPending?: boolean` en el `patch`.
- **Nueva `markThumbnailPending(accountId, videoId, pending)`:** hace un `update` por `account_id` + `video_id`. La usa la Fábrica (4.4).
- **`needsAction`:** también es `true` si `t.thumbnailPending`.

### 4.2 `src/lib/studio/youtube-draft.ts` (`publishDraft`)
- **Short con `thumbnailFile`:**
  - **No** llames a `setThumbnail`.
  - Guarda una copia del JPG en IndexedDB con la clave `yt-thumb:<videoId>`. Usa el store de archivos de borradores (`FILES`) o un helper nuevo `saveShortThumbnail(videoId, file)` / `getShortThumbnail(videoId)` / `deleteShortThumbnail(videoId)`. Es la **única excepción** a "no guardar imágenes en IndexedDB": es temporal y se borra al marcarla como subida.
  - Crea o actualiza la tarea con `thumbnailPending: true`. Para eso, la condición `if (comment || related || draft.sourceRef)` pasa a incluir también "Short con miniatura".
  - Devuelve `thumbnailPending: { videoId, file } | null` en lugar de `thumbnailRejected`.
- **Video largo:** queda igual (`setThumbnail` y, si falla, el aviso en `warnings`).
- **`quotaUnits`:** suma 50 solo si `format !== "short"` (cambia la firma a `Pick<YouTubeDraft, "subtitleFile" | "thumbnailFile" | "format">`).
- Borra `SHORT_THUMBNAIL_REJECTED`, o cambia su texto si la sigue usando el aviso de la Fábrica (4.4).

### 4.3 Programación: `PendingTasksPanel` (`src/components/studio/VideoTasks.tsx`) y `YouTubeProgramacion.tsx`
- En **"Pendientes en YouTube"**, cada tarea con `thumbnailPending` muestra:
  - Una línea ámbar: **"Falta subir la miniatura en YouTube Studio (YouTube no la acepta por API en los Shorts)."**
  - Si el video aún no sale, la hora de salida: "Sale hoy 19:00".
  - Botón principal **"Subir miniatura"**, que hace en el mismo clic:
    1. Busca el JPG (ver orden abajo).
    2. `downloadFile(file, file.name)`.
    3. `window.open(studioEditUrl(videoId), "_blank", "noopener")`.
    4. Toast: "Miniatura descargada. En Studio: Miniatura → Subir archivo y elige el JPG que se acaba de bajar. Luego toca «Ya la subí»."
  - Botón **"Ya la subí"**: `updateVideoTask(id, { thumbnailPending: false })` y `deleteShortThumbnail(videoId)`.
- **Orden para encontrar el JPG:**
  1. `getShortThumbnail(videoId)` (IndexedDB).
  2. Si no está, la miniatura de la Fábrica por `source_ref`. Reusa `listSourceRefs` + `loadFactoryShorts` de `instagram.ts`, que ya devuelven `thumbnail` por `sourceRef`, igual que `ReplicateFromYouTubeSheet`. Si la carpeta está bloqueada (`folderLocked`), pide el permiso dentro del mismo clic (`hasAccess(folder, "readwrite", true)`) y reintenta.
  3. Si tampoco está, igual abre Studio y avisa: "No encontré la miniatura en este PC. Bájala desde la Fábrica de Shorts (Miniatura → Bajar)."
- **Calendario y lista de Programación:** en la tarjeta de un Short con tarea `thumbnailPending`, agrega un badge ámbar **"Miniatura pendiente"**. Al tocarlo hace lo mismo que "Subir miniatura".
- Borra el estado `thumbRejected` y el render de `ThumbnailRejectedNotice` en Programación. Lo reemplaza el pendiente, que sí queda guardado.
- **Toast al terminar de programar:** si se programaron Shorts con miniatura, agrega: "N Shorts quedaron con la miniatura pendiente: súbela desde «Pendientes en YouTube»."

### 4.4 Fábrica de Shorts (`ShortThumbnailEditor.tsx` y `YouTubeShorts.tsx`)
- Cambia el botón **"Subir a YouTube ahora"** (cuando el Short ya está en YouTube) por **"Subir en YouTube Studio"**. Hace lo mismo que "Subir miniatura": baja el JPG actual (`current`), abre `studioEditUrl(videoId)` y deja la tarea con `markThumbnailPending(accountId, videoId, true)`. Ya **no** llama a `setThumbnail`.
- Al **guardar** una miniatura de un Short que ya está en YouTube (`lookupVideoId()` devuelve id), llama a `markThumbnailPending(…, true)`. Así aparece en Programación aunque no se toque el botón.
- En `ShortThumbnailEditor` ya no hace falta el estado `rejected` ni `ThumbnailRejectedNotice`.

### 4.5 Textos que hoy prometen la subida automática
- En `docs/prd/miniaturas-shorts.md`, punto 5: "YouTube: los Shorts no aceptan miniatura por API; queda como pendiente para subirla en Studio con un clic."
- En el `label` de `SmallFilePicker` para los Shorts (`YouTubeDraftEditor.tsx`): agrega "(se sube a mano en Studio)".

## 5. Pruebas
1. Programar un Short de la Fábrica que tenga miniatura:
   - No se llama a `thumbnails.set` (revisa la pestaña Red del navegador).
   - Aparece en "Pendientes en YouTube" y con el badge en el calendario.
2. "Subir miniatura":
   - Baja `…-miniatura.jpg` y abre `studio.youtube.com/video/<id>/edit` en otra pestaña.
   - Recarga Programación: el pendiente sigue ahí.
   - "Ya la subí": desaparece.
3. Con `uPzm3fvWVdI` (pendiente sin copia en IndexedDB):
   - "Subir miniatura" la encuentra en la carpeta de la Fábrica.
   - Con la carpeta bloqueada, pide el permiso y luego la baja.
4. Video largo con miniatura: se sigue subiendo por API como hoy y no queda pendiente.
5. Fábrica, Short ya subido, "Subir en YouTube Studio": baja la imagen, abre Studio y el pendiente aparece en Programación.
6. Tests unitarios:
   - `quotaUnits`: un Short con miniatura no suma 50.
   - `needsAction` con `thumbnailPending`.
