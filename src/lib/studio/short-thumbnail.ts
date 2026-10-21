// ============================================
// VEXA Content Studio - Miniatura pendiente de un Short ya subido
// ============================================
// YouTube no aplica por API la miniatura de los Shorts: se baja el JPG y se sube a mano en YouTube Studio.

import { loadFactoryShorts } from "./instagram";
import { getShortsFolder, hasAccess } from "./shorts";
import { listSourceRefs } from "./video-tasks";
import { getShortThumbnail } from "./youtube-draft";

/**
 * JPG de la miniatura del Short: primero la copia guardada al programarlo; si no está, la de la Fábrica
 * (carpeta del PC). Tiene que llamarse desde un clic: si la carpeta perdió el permiso, lo pide.
 */
export async function findShortThumbnail(accountId: string, videoId: string): Promise<File | null> {
  const copy = await getShortThumbnail(videoId).catch(() => null);
  if (copy) return copy;
  // El permiso se pide antes de las lecturas lentas, mientras el navegador lo cuenta como parte del clic
  const folder = await getShortsFolder().catch(() => null);
  if (folder && !(await hasAccess(folder, "readwrite").catch(() => false))) {
    await hasAccess(folder, "readwrite", true).catch(() => false);
  }
  const [refs, local] = await Promise.all([
    listSourceRefs(accountId).catch(() => new Map<string, string>()),
    loadFactoryShorts(accountId).catch(() => ({ shorts: [], folderLocked: false })),
  ]);
  const ref = refs.get(videoId);
  return (ref && local.shorts.find((s) => s.sourceRef === ref)?.thumbnail) || null;
}
