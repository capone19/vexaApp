# PRD · Video de origen de cada Reel (Instagram)

> Para Cursor. El backend (columnas en la base y flujos de n8n) **ya está hecho, publicado y probado**. Tu trabajo es solo el **frontend**. No crees tablas, Edge Functions ni flujos de n8n. Si crees que falta algo del backend, anótalo en tu resumen final en vez de inventarlo.

## 1. Objetivo
Cada Reel sale de un **video largo de YouTube** (el "video de origen"). El chatbot de Instagram usa ese dato para mandar a quien comenta o escribe por DM al video largo correcto.

Hoy n8n ya lo encuentra solo cuando el Reel viene de la Fábrica de Shorts (por la idea del Short o por el Short de YouTube gemelo). Falla en estos dos casos:
- **Reel subido como archivo** (`source_ref = 'upload'`): nadie sabe de qué video salió.
- **Short de la Fábrica sin idea registrada ni Short de YouTube gemelo.** El proyecto tiene `relatedVideo`, pero ese dato vive en el navegador (IndexedDB) y n8n no lo ve.

La app debe guardar el video de origen en la publicación, y el usuario debe poder verlo y cambiarlo.

## 2. Reglas del proyecto (obligatorias)
- **Estilo del código.** Next.js 15 + TypeScript + Tailwind + shadcn/ui. Imita el estilo, la densidad de comentarios (en español) y los patrones de los archivos vecinos: `src/lib/studio/instagram.ts`, `src/components/studio/instagram/ReelComposerDialog.tsx` y `src/components/studio/YouTubeUploadDialog.tsx`.
- **No gastar recursos de Supabase.** Solo agrega las 2 columnas nuevas al `select` y al guardado que ya existen de `studio_publications`. No agregues consultas nuevas, ni Realtime, ni Edge Functions.
- **Textos de la interfaz** en español chileno neutro, claros, sin tecnicismos.
- **Al terminar** deben pasar `npx tsc --noEmit`, `npm run lint` y `npx vitest run`.

## 3. Backend (ya hecho)
Hay dos columnas nuevas en `studio_publications`, las dos opcionales:

| columna | qué es |
|---|---|
| `source_video_id` | id del video largo de YouTube del que salió el Reel |
| `source_video_title` | su título, tal como se ve en YouTube |

Las publicaciones que ya existen se completaron con lo que se sabía.

Al publicar, n8n ("Instagram: publicar Reel") usa estas columnas. Si están vacías, busca el video igual por la idea del Short o por su tarea de YouTube. Después guarda todo en `vexa_ig_publicaciones.video_origen_*`, que es lo que lee el chatbot. Esa tabla no la toca la app.

## 4. Qué hacer
### 4.1 `src/lib/studio/instagram.ts`
- Agrega `sourceVideo: RelatedVideo | null` a `InstagramPublication`. Usa el tipo `RelatedVideo` de `video-tasks.ts`. Se arma con `source_video_id` y `source_video_title`, y es `null` si no hay id.
- Agrega `sourceVideo?: RelatedVideo | null` a `PublicationPatch`. En `patchToRow` debe escribir las dos columnas, o `null` y `null`.
- Agrega las dos columnas a la constante del `select`.
- En `FactoryShort` agrega `relatedVideo: RelatedVideo | null`. Lo llena `factoryShortFrom` desde `project.relatedVideo`.

### 4.2 `ReelComposerDialog.tsx`
- **Campo nuevo.** Va bajo el video elegido: **"Video de origen"**, un `Select` con los videos largos del canal de YouTube vinculado y la opción **"Sin video de origen"**.
  - Lee la lista igual que `YouTubeUploadDialog.tsx` (líneas 80-96): `fetchYouTubeVideos`, filtrando `!isShort` y públicos o programados.
  - Pídela solo cuando el diálogo esté abierto, y una vez por canal.
  - Si no hay canal de YouTube vinculado, no muestres el campo.
- **Valor inicial:**
  - Al editar una publicación, el `sourceVideo` guardado.
  - Al elegir un Short de la Fábrica, su `relatedVideo`.
  - Al elegir un archivo, vacío, con el texto de ayuda "Elige de qué video largo salió, así el bot de Instagram manda a la gente al video correcto".
- **Si el video guardado no está en la lista** (por ejemplo, ya no es público), agrégalo igual como opción, como hace `YouTubeDraftEditor.tsx` en la línea 148.
- **Al guardar,** manda `sourceVideo` en `fields`, junto a `sourceRef`.
- **No es obligatorio:** se puede programar sin video de origen.

### 4.3 Vista de la publicación (calendario o detalle del Reel)
Si la publicación tiene `sourceVideo`, muestra una línea chica: "De: *título*", con link a `https://www.youtube.com/watch?v=<id>`.

### 4.4 Tests
En `src/lib/studio/instagram.test.ts`:
- El mapeo de fila a objeto con y sin `source_video_id`.
- Que `patchToRow` escriba las dos columnas y las limpie con `null`.
- Que `factoryShortFrom` copie `relatedVideo`.

## 5. Cómo probar
1. **Short de la Fábrica:** abre "Programar Reel" y elige un Short de la Fábrica. Debe aparecer su video de origen ya elegido. Programa y revisa en Supabase que `studio_publications.source_video_id` quedó lleno.
2. **Archivo:** sube un archivo y elige un video de origen. Guarda, vuelve a abrir y debe seguir elegido.
3. **Sin video:** cambia a "Sin video de origen" y guarda. Las dos columnas deben quedar en `null`.
