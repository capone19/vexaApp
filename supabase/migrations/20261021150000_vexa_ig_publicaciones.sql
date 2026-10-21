-- =============================================================================
-- Ficha de cada Reel de VEXA para el chatbot de Instagram
-- =============================================================================
-- La llena el flujo de n8n "VEXA Studio · Instagram: publicar Reel" apenas Instagram publica (nodo "Guardar ficha
-- para el chatbot"). Si el Reel se publicó directo en Instagram, el chatbot guarda su caption la primera vez que
-- alguien lo comenta (origen = 'instagram'). El chatbot la lee por media_id para saber de qué publicación le hablan.
-- La app no la usa. RLS activo sin políticas: nadie entra con la llave pública.

create table if not exists public.vexa_ig_publicaciones (
  media_id text primary key,               -- id del Reel en Instagram
  publication_id uuid,                     -- studio_publications.id (vacío si se publicó directo en Instagram)
  permalink text,
  titulo text,
  caption text,
  primer_comentario text,
  tema text,                               -- de la idea del Short (studio_short_ideas)
  tesis text,
  gancho text,
  frase_inicio text,
  frase_final text,
  short_youtube_id text,
  episodio_titulo text,                    -- video de origen (luego se renombra a video_origen_titulo)
  episodio_youtube_id text,
  origen text not null default 'vexa' check (origen in ('vexa','instagram')),
  publicado_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.vexa_ig_publicaciones enable row level security;

-- Reels que ya se publicaron desde VEXA Studio antes de esta tabla
insert into public.vexa_ig_publicaciones (media_id, publication_id, permalink, titulo, caption, primer_comentario,
  tema, tesis, gancho, frase_inicio, frase_final, short_youtube_id, episodio_titulo, episodio_youtube_id, origen, publicado_at)
select p.external_id, p.id, p.permalink, p.title, p.caption, nullif(p.settings->>'first_comment', ''),
       i.topic, i.thesis, i.hook_line, i.first_line, i.end_line,
       coalesce(p.youtube_video_id, i.youtube_video_id),
       case when i.source_video_id is not null then i.source_title else t.related_video_title end,
       coalesce(i.source_video_id, t.related_video_id),
       'vexa', p.published_at
from public.studio_publications p
left join lateral (
  select x.* from public.studio_short_ideas x
  where (p.source_ref is not null and x.source_ref = p.source_ref)
     or (p.youtube_video_id is not null and x.youtube_video_id = p.youtube_video_id)
  order by x.updated_at desc limit 1
) i on true
left join lateral (
  select y.related_video_id, y.related_video_title from public.studio_video_tasks y
  where y.video_id = coalesce(p.youtube_video_id, i.youtube_video_id)
  limit 1
) t on true
where p.platform = 'instagram' and p.external_id is not null
on conflict (media_id) do nothing;
