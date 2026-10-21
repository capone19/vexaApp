-- =============================================================================
-- Video de origen (el video largo de YouTube del que salió cada Reel)
-- =============================================================================
-- studio_publications.source_video_*: lo guarda la app al crear el Reel (Fábrica de Shorts: el video vinculado al
--   proyecto; archivo subido: el que elija el usuario). Si viene vacío, n8n lo busca igual al publicar: idea del
--   Short (studio_short_ideas) → tarea del Short de YouTube (studio_video_tasks.related_video_*).
-- vexa_ig_publicaciones.video_origen_*: lo que usa el chatbot de Instagram para mandar a la persona al video largo
--   correcto (antes se llamaban episodio_*).

alter table public.studio_publications add column if not exists source_video_id text;
alter table public.studio_publications add column if not exists source_video_title text;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
             and table_name = 'vexa_ig_publicaciones' and column_name = 'episodio_youtube_id') then
    alter table public.vexa_ig_publicaciones rename column episodio_youtube_id to video_origen_id;
    alter table public.vexa_ig_publicaciones rename column episodio_titulo to video_origen_titulo;
  end if;
end $$;

-- Reels que ya existen: se completa el video de origen con lo que se sabe hoy
update public.studio_publications p
set source_video_id = s.vid, source_video_title = s.titulo
from (
  select p2.id,
         coalesce(i.source_video_id, t.related_video_id) as vid,
         case when i.source_video_id is not null then i.source_title else t.related_video_title end as titulo
  from public.studio_publications p2
  left join lateral (
    select x.source_video_id, x.source_title, x.youtube_video_id from public.studio_short_ideas x
    where (p2.source_ref is not null and x.source_ref = p2.source_ref)
       or (p2.youtube_video_id is not null and x.youtube_video_id = p2.youtube_video_id)
    order by x.updated_at desc limit 1
  ) i on true
  left join lateral (
    select y.related_video_id, y.related_video_title from public.studio_video_tasks y
    where y.video_id = coalesce(p2.youtube_video_id, i.youtube_video_id)
    limit 1
  ) t on true
) s
where s.id = p.id and p.source_video_id is null and s.vid is not null;
