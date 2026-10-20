# PRD · Fábrica de Shorts: registro de ideas y anti-repetición

> Para Cursor. El backend (tabla, vista y flujo de n8n) **ya está hecho, publicado y probado**. Tu trabajo es solo el **frontend**: mandar los datos nuevos al webhook, mostrar lo que devuelve y leer/actualizar el registro. No crees tablas, Edge Functions ni flujos de n8n; si crees que falta algo del backend, anótalo en tu resumen final en vez de inventarlo.

## 1. Objetivo
YouTube puede quitar la monetización de **todo el canal** si ve contenido hecho en masa o repetitivo. Las series están permitidas **si cada pieza tiene su propia idea**. Hoy la Fábrica solo le pasa a la IA los títulos de Shorts guardados en este navegador. Desde ahora:

1. Cada Short que propone la IA queda en un **registro de ideas** en la base, ligado a su **episodio (video origen)** y a su tramo exacto del video.
2. La IA recibe ese historial y **no puede usar tramos ya usados** del mismo episodio, ni repetir tesis, gancho, cierre, fórmula de título o formato de los últimos Shorts.
3. Cada Short nuevo trae un **% de parecido** con lo ya hecho (embeddings) y una **lista de control** con las reglas del canal.
4. Cada episodio tiene un **cupo recomendado** de Shorts. Cuando se agota (o ya se usó la mayor parte del video) la app **sugiere pasar al siguiente episodio**.
5. Al programar, la app **avisa si dos Shorts del mismo tema quedan a menos de 3 días**.

## 2. Reglas del proyecto (obligatorias)
- Next.js 15 + TypeScript + Tailwind + shadcn/ui. Imita el estilo, la densidad de comentarios (en español) y los patrones de los archivos vecinos (`src/lib/studio/shorts.ts`, `src/views/studio/YouTubeShorts.tsx`, `src/components/studio/ShortPlanCard.tsx`).
- **No gastar recursos de Supabase**:
  - Solo lecturas y escrituras chicas a la vista o tabla del registro.
  - Lee el registro una vez al abrir la Fábrica y después de cada acción. **Nada de polling ni Realtime.**
  - Nada de Storage ni de Edge Functions nuevas.
  - Selecciona columnas explícitas.
- La comparación con embeddings **la hace n8n**. La app nunca pide ni maneja embeddings.
- **Nunca** pongas claves, tokens ni secretos en el código. A n8n solo va el `access_token` de la sesión, como ya hace `callShortsAi`.
- La app **no inserta** filas en `studio_short_ideas` (no tiene permiso): las crea n8n.
- Textos de la interfaz en español chileno neutro, claros, sin tecnicismos.
- Al terminar deben pasar `npx tsc --noEmit`, `npm run lint` y `npx vitest run`.

## 3. Cómo funciona el backend (ya hecho)
```
App                                     n8n  (webhook vexa-studio/shorts, mismo de siempre)
───                                     ───
scout / edit / revise ────────────────► valida sesión
  + account_id, project_id, source        └► lee el HISTORIAL (solo si el usuario pertenece a la cuenta):
                                             · ideas del mismo episodio (tramos usados, tesis)
                                             · últimos 5 Shorts usados del canal (gancho, título, cierre, formato)
                                             · rendimiento por formato a las 48 h (cuando hay ≥ 10 publicados)
                                          └► si el episodio está AGOTADO → responde ok:false, saturated:true (sin gastar IA)
                                          └► IA con las reglas del canal + el historial
                                          └► scout: borra los candidatos que pisan tramos usados
                                          └► edit: embeddings → % de parecido + lista de control
                                               descarta solos los que pisan tramos usados o son ≥ 80 % iguales
                                               a un Short ya usado/programado/publicado
                                          └► GUARDA cada idea en studio_short_ideas y devuelve su id
register (proyectos viejos) ──────────► guarda los Shorts que ya existen (sin IA), con su % de parecido
```
- **Compatibilidad:** si la app no manda `account_id`, `project_id` y `source.key`, el flujo funciona igual que antes, sin registro. Las reglas nuevas del prompt aplican igual: gancho de 12 palabras o menos, 25 a 50 s, título en pantalla de 6 palabras o menos y formatos rotados.
- **Estado de cada idea.** Lo calcula la **vista** `studio_short_ideas_v`, cruzando `source_ref` con YouTube (`studio_video_tasks`) e Instagram (`studio_publications`). El `source_ref` es el mismo `shorts:<projectId>:<planId>` que ya usa la app. Valores de `stage`:
  - `propuesta`: la sugirió la IA.
  - `usada`: la app la marcó al mandarla a Programación o a Instagram.
  - `programada` / `publicada`: sale sola del cruce.
  - `descartada`: la marcó la app.
- **Las ideas nuevas usan su propio id como `plan_id`.** La app debe adoptar `idea.plan_id` como `plan.id` (ver 5.2). Así `source_ref` enlaza solo.

## 4. Contratos

### 4.1 Vista `public.studio_short_ideas_v` (solo lectura, RLS por tenant de la cuenta)
Columnas que puedes leer. **No hay embedding.**

| Columna | Notas |
|---|---|
| id | uuid de la idea |
| account_id | cuenta de YouTube (`studio_accounts.id`) |
| source_key, source_title, source_video_id, source_duration | episodio |
| project_id, plan_id, source_ref | `source_ref = 'shorts:' \|\| project_id \|\| ':' \|\| plan_id` |
| status | `propuesta` \| `usada` \| `descartada` (lo que guarda la tabla) |
| stage | `propuesta` \| `usada` \| `programada` \| `publicada` \| `descartada` (**usa esta para mostrar**) |
| segments | `[{start, end}]` en segundos del video origen |
| range_start, range_end | envoltura de los tramos |
| topic, thesis, angle, format | `format` ∈ `pregunta_directa`, `dato_contraste`, `imagina_que`, `mito_realidad`, `numero_raro`, `caso_concreto` (o null en las registradas) |
| hook_line, hook_text, title, end_line, first_line, duration, score | |
| similarity | 0-100, parecido máximo con una idea anterior (null = sin dato) |
| similar_to, similarity_reason | id de esa idea y frase lista para mostrar |
| neighbors | `[{id, similarity}]` ideas del mismo tema (≥ 50 %); sirven para la regla de 3 días |
| checks | `[{key, label, ok, detail}]` (ver 4.4) |
| open_frame_hash | huella del cuadro de apertura (la escribe la app, ver 5.6) |
| youtube_video_id, youtube_at | Short de YouTube y su hora de publicación |
| ig_publication_id, ig_status, ig_at, ig_permalink | Reel de Instagram |
| planned_at | la hora más temprana entre YouTube e Instagram |
| used_at, created_at, updated_at | |

**Escrituras permitidas** (tabla `studio_short_ideas`, solo estas columnas; cualquier otra da error de permiso):
- `status`: solo `'usada'` o `'descartada'`.
- `used_at`.
- `open_frame_hash`.
- `youtube_video_id`.

### 4.2 Webhook `POST {N8N_BASE_URL}{SHORTS_PATH}` (el mismo de hoy): campos **nuevos** del cuerpo
Todos se agregan a lo que ya manda `callShortsAi`:

```ts
{
  account_id: string;          // project.accountId (id de studio_accounts del canal)
  project_id: string;          // project.id
  source: {
    key: string;               // ver 4.3
    title: string;             // relatedVideo?.title ?? project.name
    video_id: string | null;   // relatedVideo?.id ?? null → con esto n8n agrega al comentario fijado "▶ … desde el 3:20"
    duration: number;          // project.duration
  };
  manual?: boolean;            // true en editCandidate (momento elegido a mano): no se descarta solo, solo avisa
  override_budget?: boolean;   // true cuando el usuario elige "Sacar igual" en un episodio agotado
  current_plan?: { …lo de hoy…, plan_id: string };   // en reviseShort agrega plan_id = plan.id
}
```

### 4.3 Clave del episodio (`source.key`)
- Si el proyecto tiene video relacionado: `yt:<relatedVideo.id>`.
- Si no tiene: `file:<hash>`. El hash son los primeros 16 caracteres hex del SHA-256 (`crypto.subtle`) de `` `${Math.round(project.duration * 10)}|${project.width}x${project.height}` ``.
- Guárdala en el proyecto (`project.sourceKey`) al crearlo, para no recalcularla. Para proyectos viejos, calcúlala al abrirlos.
- Como el registro va mejor con el episodio de YouTube, el formulario de "Nuevo proyecto" debe **recomendar** elegir el video relacionado. Usa una línea suave, sin bloquear: "Elige el episodio de YouTube: así el registro sabe de qué episodio sale cada Short y el Short lleva al episodio correcto."

### 4.4 Respuestas nuevas
Todo lo de hoy sigue igual. Se agregan estos campos:

**`scout`** (`ok: true`):
```ts
{ candidates: [{ …lo de hoy…, topic: string }], source_status: SourceStatus | null, removed_overlap: number }
```
**`edit`** (también la revisión):
```ts
{
  shorts: [{ …lo de hoy…, end_line, topic, thesis, format, addresses_viewer, plain_language, first_line,
    idea: {
      id: string | null; plan_id: string | null;   // null solo si falló el guardado (registry_error)
      similarity: number | null;                    // 0-100
      level: "ok" | "cercana" | "repetida" | "sin_dato";   // <50 | 50-74 | >=75 | sin embeddings
      reason: string;                               // "Mismo tema que «X» (mismo video)"
      similar_to: { id: string | null; title: string; source_title: string; stage: string; same_source: boolean } | null;
      neighbors: { id: string; similarity: number }[];
      checks: { key: string; label: string; ok: boolean; detail: string }[];
      passed: number; total: number;
    } }],
  discarded: [...],          // incluye los que n8n descartó solo, con reason_es en español
  source_status: SourceStatus | null,
  budget_notice: string,     // "Pediste 3, pero a este video le quedan 2…" (vacío si nada)
  registry_error: string     // vacío si todo bien; si no, los Shorts igual sirven (sin registro)
}
```
**Episodio agotado** (scout o edit, sin `override_budget`): `{ ok: false, saturated: true, error: string, source_status }`. `callShortsAi` hoy lanza `Error(body.error)`; tiene que lanzar un error tipado (ver 5.2) para que la vista muestre el aviso con botones.

```ts
interface SourceStatus {
  used: number;            // Shorts usados/programados/publicados de este episodio
  proposed: number;        // propuestas sin usar
  budget: number;          // cupo recomendado = clamp(round(duración_min × 1,1), 2, 10)  (6,5 min → 7)
  remaining: number;
  coverage_pct: number;    // % del video ya usado por esos Shorts
  free_seconds: number;    // segundos libres en tramos de ≥ 25 s
  level: "ok" | "casi" | "agotado";   // agotado: remaining 0 · ≥70 % usado · <25 s libres; casi: remaining ≤1 · ≥50 %
  message: string;         // frase lista para mostrar
  used_ranges: { start: number; end: number }[];
}
```

**Claves de `checks`** (las arma n8n; la app agrega 2 más, ver 5.4):
| key | Qué revisa |
|---|---|
| `tramo_unico` | No pisa segundos de otro Short del mismo episodio |
| `idea_nueva` | Parecido < 60 % |
| `gancho_distinto` | Gancho, título en pantalla y cierre distintos a los 5 últimos |
| `formato_rotado` | Formato distinto al del Short anterior |
| `titulo_formula` | El título no empieza igual que los 2 anteriores |
| `primera_frase` | Primera frase de 12 palabras o menos |
| `habla_al_espectador` | Le habla al espectador ("you") con una consecuencia concreta |
| `sin_jerga` | Sin jerga ni latín en la primera frase |
| `duracion` | Entre 25 y 50 s |
| `titulo_pantalla` | Título en pantalla de 6 palabras o menos |
| `primera_linea_unica` | Primera línea de la descripción única |
| `sin_promesas` | No promete lo que no cumple ("sources always cited", etc.) |
| `episodio_con_cupo` | Al episodio le quedan Shorts recomendados |

### 4.5 Registrar Shorts que ya existen: `stage: "register"`
Es para los proyectos de antes de este cambio. Se llama **una vez por proyecto**, con hasta 40 planes por llamada. No gasta IA de texto, solo embeddings, que son centavos.
```ts
// cuerpo (además de access_token, language, account_id, project_id, source)
{ stage: "register", plans: [{
    plan_id: plan.id, title, hook_line: plan.hookLine, hook_text: plan.hookText, end_text: plan.endText,
    segments: plan.segments, description: plan.description, score: totalScore(plan.score),
    used: boolean,                 // true si está en project.sentToSchedule o tiene Reel en Instagram
    youtube_video_id?: string      // si ya se sabe cuál Short de YouTube es (matchFactoryShort / listSourceRefs)
}] }
// respuesta
{ ok: true, stage: "register", ideas: [{ plan_id, id, similarity, level, reason, similar_to, neighbors, checks, passed, total }], registry_error }
```
- Es idempotente: registrar dos veces el mismo `plan_id` actualiza la fila, no la duplica.
- **Aquí el `plan.id` NO cambia**: se guarda tal cual.

## 5. Lo que hay que construir

### 5.1 Capa de datos nueva: `src/lib/studio/short-ideas.ts`
- Tipos: `ShortIdea` (fila de la vista), `IdeaCheck` (el `idea` de 4.4), `SourceStatus`, `IdeaStage`.
- `sourceKeyFor(project): Promise<string>` (4.3).
- `listIdeas(accountId)`: una sola consulta a `studio_short_ideas_v`, `.eq("account_id", …)`, columnas explícitas y `.order("created_at", { ascending: false }).limit(500)`.
- `setIdeaStatus(ids: string[], status: "usada" | "descartada")`. Con `usada` también manda `used_at: new Date().toISOString()`.
- `setOpenFrameHash(id, hash)` y `linkYoutubeVideo(id, videoId)`.
- `registerPlans(project, plans, ctx)` (4.5).
- **Funciones puras, con tests en `short-ideas.test.ts`:**
  - `sourceSummary(ideas, sourceKey, duration): SourceStatus`. Es la misma fórmula que n8n (4.4), para mostrar el estado sin llamar a la IA. Cuentan como usadas las de `stage` `usada`, `programada` y `publicada`.
  - `usedRangesOf(ideas, sourceKey)`, uniendo tramos solapados.
  - `spacingConflicts(idea, at: Date, ideas, drafts)` (5.5).
  - `dHash(imageData)` y `hamming(a, b)` (5.6).

### 5.2 `src/lib/studio/shorts.ts`
- `AiContext` suma `accountId`, `projectId`, `source: { key, title, videoId, duration }`.
- `callShortsAi` manda los campos de 4.2.
- Nueva clase `SaturatedError extends Error { sourceStatus }`. Se lanza cuando `body.saturated`.
- `ShortCandidate` suma `topic`.
- `ShortPlan` suma `idea?: IdeaCheck`, guardado en IndexedDB con el proyecto. `normalizePlan` lo conserva tal cual.
- `fromAi`:
  - Si `s.idea?.plan_id` existe, úsalo como `id` del plan. **Ojo en `reviseShort`:** ahí se conserva el `id` del plan original, como hoy.
  - Copia `idea` al plan.
- `scoutMoments` y `editShorts` devuelven además `sourceStatus`. `editShorts` devuelve también `budgetNotice` y `registryError`.
- `reviseShort` manda `current_plan.plan_id = plan.id`.
- `ShortsProject` suma:
  - `sourceKey?: string`
  - `registeredAt?: string`: marca que el backfill de 4.5 ya se hizo.
  - `sourceStatus?: SourceStatus | null`: el último que mandó n8n.

### 5.3 `src/views/studio/YouTubeShorts.tsx`
- **Contexto IA:** saca la lista `made` de `aiContext`, porque n8n ya trae el historial real. Deja `ONE_IDEA_RULE`. Pasa `accountId`, `projectId` y `source`. En `editCandidate` manda `manual: true`.
- **Registro en memoria:**
  - Al cargar la Fábrica (y al cambiar de canal): `listIdeas(channelId)` una vez.
  - Después de cada análisis, revisión, envío o descarte, vuelve a leer **solo** con `listIdeas`. Sin intervalos.
- **Backfill:** al abrir un proyecto sin `registeredAt` que tenga planes sin `plan.idea?.id`, llama a `registerPlans` en segundo plano.
  - Marca `used` así: `sentToSchedule[plan.id]` existe, o hay una publicación de Instagram con ese `source_ref`. Las publicaciones ya se leen en la vista.
  - Guarda los resultados en `plan.idea` y luego `registeredAt`.
  - Si falla, reintenta la próxima vez que se abra el proyecto. No muestres error.
- **Marcar estados:**
  - `send` (a Programación) y replicar a Instagram → `setIdeaStatus([plan.idea.id], "usada")`.
  - Borrar un plan → `descartada`.
  - Volver a analizar un proyecto: antes de `analyze`, marca `descartada` los planes actuales **no** enviados.
  - Borrar el proyecto: marca `descartada` sus ideas `propuesta`. Las usadas quedan, porque ya salieron.
- **Episodio agotado o casi:** pon un banner arriba del proyecto. Usa `project.sourceStatus` o, si no hay, `sourceSummary(ideas, …)`.
  - `casi`: banner ámbar con `message`.
  - `agotado`: banner rojo con `message` y dos botones: **"Ir a otro episodio"** (abre el formulario de nuevo proyecto) y **"Sacar igual"** (repite la acción con `override_budget: true`).
  - Cuando `analyze` recibe `SaturatedError`: no pongas el proyecto en `error`. Guarda `sourceStatus` y muestra ese banner.
  - Si llega `budget_notice`, muéstralo en un toast informativo.
  - Si llega `registry_error`, muestra un toast suave ("Los Shorts quedaron listos, pero no se pudieron anotar en el registro.").
- **Formulario "Nuevo proyecto":** al elegir el video relacionado, muestra debajo el resumen de ese episodio según el registro: "Este episodio ya tiene 5 de 7 Shorts · 64 % del video usado". Si está `agotado`, agrega la sugerencia en rojo, sin bloquear.
- **Lista de proyectos:** un chip por proyecto con `used/budget · coverage %`, coloreado según `level`.
- **Pestaña o hoja "Registro de ideas"** (botón en la cabecera de la Fábrica):
  - Agrupa por episodio (`source_title`) y ordena por actividad.
  - Por episodio muestra:
    - una **barra de cobertura**: el ancho del episodio con los `segments` de cada idea pintados según `stage` (gris propuesta, azul usada, ámbar programada, verde publicada);
    - el contador `used/budget`;
    - el `level`.
  - Por idea muestra: título, chip de `stage`, formato, `% parecido` (color de 5.4), fecha (`planned_at`) y links a YouTube (`youtube_video_id`) e Instagram (`ig_permalink`).
  - Filtros por episodio y por estado.
  - Esta vista sirve para decidir "de qué episodio saco el próximo Short".

### 5.4 `src/components/studio/ShortPlanCard.tsx`
- **Badge de parecido** junto al puntaje. Colores por `level`: `ok` verde (< 50 %), `cercana` ámbar (50-74 %), `repetida` rojo (≥ 75 %), `sin_dato` gris ("Sin comparar"). El tooltip muestra `reason`.
- **"Lista de control X/Y"** plegable. Cada ítem va con ✓ o ✗, `label` y `detail`. Suma 2 ítems que calcula la app:
  - `video_relacionado`: el proyecto tiene `relatedVideo`. Texto: "Lleva al episodio correcto".
  - `cuadro_apertura`: el cuadro de apertura no se parece a otro Short de los últimos 7 días (5.6). Solo aparece cuando ya hay render.
- Si `level === "repetida"`, pide confirmación antes de **Enviar a Programación** o **Replicar en Instagram**: "Se parece {similarity} % a «{title}». YouTube puede verlo como contenido repetido. ¿Enviar igual?"

### 5.5 Regla de los 3 días en Programación de YouTube (`YouTubeProgramacion.tsx`)
- Aplica al asignar o mover la fecha de un borrador cuyo `sourceRef` sea de la Fábrica (`parseShortsSourceRef`). Busca su idea (por `source_ref`) y calcula `spacingConflicts`.
- **Hay conflicto** con otra idea si cumple las dos:
  - Es del **mismo tema**: está en `neighbors` de una o de la otra con ≥ 55 %, o es del **mismo capítulo** (mismo `source_key` y sus tramos quedan a menos de 60 s de distancia en el video).
  - Su fecha (la del borrador en Programación, si existe; si no, `planned_at`) queda a **menos de 72 h**.
- Muestra un chip ámbar en la tarjeta del calendario: "Mismo tema que «X» (jue 22). Sepáralos al menos 3 días". **No bloquea.**
- Haz lo mismo en la Programación de Instagram, con `scheduled_at`.

### 5.6 Cuadro de apertura (huella dHash)
- Al terminar un render, toma un cuadro del archivo renderizado en t = 0,3 s. Usa `<video>` + `canvas` de 9×8 en escala de grises.
- Calcula el dHash (64 bits → 16 hex) y guárdalo con `setOpenFrameHash(plan.idea.id, hash)`.
- Para el check, compara con las ideas `usada`, `programada` o `publicada` de los últimos 7 días (`planned_at` o `used_at`). Hamming ≤ 10 = "Abre con una imagen casi igual a «X»".

## 6. Mensajes clave (úsalos tal cual o muy parecidos)
- Banner casi: `{message}`
- Banner agotado: `{message}`. Botones: "Ir a otro episodio" · "Sacar igual".
- Toast tras análisis con descartes automáticos: "{n} momentos se descartaron por repetir algo ya hecho. Míralos en Descartados."
- Badge: "Parecido {n} %" · "Sin comparar".
- Programación: "Mismo tema que «{title}» ({día}). Sepáralos al menos 3 días."

## 7. Fuera de alcance (no hacer)
- Nada de libros ni de Shorts "independientes" de fuentes externas: los Shorts salen solo del episodio, que ya trae su investigación.
- Nada de embeddings, similitud ni reglas duplicadas en el cliente. La única fórmula que se repite es `sourceSummary`, para mostrar el estado sin llamar a la IA.
- No tocar el flujo de n8n, la tabla ni la vista.

## 8. Criterios de aceptación
1. Un proyecto nuevo con video relacionado analiza y cada Short trae su badge de parecido y su lista de control. En la base aparecen sus filas en `studio_short_ideas_v` con `stage = propuesta`, y `plan.id === idea.id`.
2. Enviar un Short a Programación lo deja `usada`. Al programarlo en YouTube pasa a `programada` y después a `publicada`, sin código extra, por el cruce con `source_ref`.
3. Un segundo proyecto del **mismo episodio** no propone tramos ya usados. Si el episodio está agotado aparece el banner rojo, y "Sacar igual" funciona.
4. Abrir un proyecto viejo lo registra solo una vez (`registeredAt`) y sus Shorts aparecen en el Registro de ideas.
5. Al programar dos Shorts del mismo tema con 1 día de diferencia, aparece el chip de los 3 días.
6. Supabase: una lectura del registro al abrir la Fábrica y una por acción. Sin polling ni Realtime.
7. `tsc`, `lint` y `vitest` en verde, con tests de `sourceSummary`, `usedRangesOf`, `spacingConflicts`, `dHash` y `hamming`.

## 9. Entrega
Commit en `main` con un resumen. Incluye lo que no pudiste hacer y cualquier cosa del backend que creas que falta.
