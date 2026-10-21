-- Miniatura de Shorts pendiente de subir a mano en YouTube Studio.
-- YouTube responde OK a thumbnails.set en los Shorts pero no la aplica (deja un cuadro del video),
-- así que la app la marca como pendiente y la muestra en "Pendientes en YouTube" hasta que el usuario la sube.
alter table public.studio_video_tasks
  add column if not exists thumbnail_pending boolean not null default false;
