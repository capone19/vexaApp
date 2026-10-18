-- Frecuencia de publicación de cada canal (Programación del Studio): días y horas de Shorts y videos
alter table public.studio_accounts add column if not exists publish_plan jsonb not null default '{}'::jsonb;
