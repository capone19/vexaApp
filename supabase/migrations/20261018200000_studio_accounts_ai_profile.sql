-- Perfil de estilo por canal para "Rellenar con IA" (idioma, nicho, tono, títulos de ejemplo, traducciones).
-- Se guarda como JSON en la misma fila de la cuenta: sin tablas nuevas.
alter table public.studio_accounts
  add column if not exists ai_profile jsonb not null default '{}'::jsonb;
