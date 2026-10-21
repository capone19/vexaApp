-- =============================================================================
-- Chatbot de Instagram de VEXA (comentarios + DM)
-- =============================================================================
-- Lo escriben y leen solo los flujos de n8n "Instagram · Router de webhooks" y "VEXA · Instagram: chatbot"
-- (conexión Postgres). La app no las usa. RLS activo sin políticas: nadie entra con la llave pública.
-- vexa_ig_mensajes: memoria de la conversación (comentarios, DM del bot y mensajes escritos a mano desde Instagram).
--   mid = id del mensaje en Instagram ('c:<id>' comentario, 'r:<id>' respuesta pública): evita responder dos veces
--   el mismo aviso de Meta y permite reconocer el eco de lo que mandó el bot.
-- vexa_ig_contactos: de qué Reel vino cada persona, su video, el último DM del bot (máx. 1 cada 7 días por comentario)
--   y la pausa de 12 h cuando una persona responde a mano.

create table if not exists public.vexa_ig_contactos (
  ig_user_id text primary key,
  username text,
  media_id text,
  post_context text,
  video_url text,
  last_dm_at timestamptz,
  paused_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.vexa_ig_mensajes (
  id bigserial primary key,
  ig_user_id text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  origen text not null default 'dm',
  mid text,
  created_at timestamptz not null default now()
);
create index if not exists vexa_ig_mensajes_user_idx on public.vexa_ig_mensajes (ig_user_id, created_at desc);
create unique index if not exists vexa_ig_mensajes_mid_key on public.vexa_ig_mensajes (mid);
alter table public.vexa_ig_mensajes drop constraint if exists vexa_ig_mensajes_origen_check;
alter table public.vexa_ig_mensajes add constraint vexa_ig_mensajes_origen_check check (origen in ('dm','comentario','humano'));

alter table public.vexa_ig_contactos enable row level security;
alter table public.vexa_ig_mensajes enable row level security;
