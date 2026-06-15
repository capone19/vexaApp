-- =============================================================================
-- Índices y RLS sugeridos para el proyecto Supabase EXTERNO (VITE_EXTERNAL_SUPABASE_*)
-- donde viven public.n8n_chat_histories, public.instagram_chat_histories y public.bookings.
-- Este repo no aplica migraciones a ese proyecto: ejecutar manualmente en el SQL
-- editor del panel de Supabase del proyecto externo, o versionar allí.
--
-- RLS instagram: ver también EXTERNAL_SUPABASE_INSTAGRAM.sql
-- =============================================================================

-- n8n_chat_histories: filtros típicos tenant_id + created_at; paginación por rango
CREATE INDEX IF NOT EXISTS idx_n8n_tenant_created_at
  ON public.n8n_chat_histories (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_n8n_session_created
  ON public.n8n_chat_histories (session_id, created_at);

-- Polling / incremental por id
CREATE INDEX IF NOT EXISTS idx_n8n_tenant_id
  ON public.n8n_chat_histories (tenant_id, id);

-- bookings externos: eq tenant + rango event_date
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_event_date
  ON public.bookings (tenant_id, event_date);

-- instagram_chat_histories: mismos patrones que n8n (lista por tenant + fecha)
CREATE INDEX IF NOT EXISTS idx_instagram_tenant_created_at
  ON public.instagram_chat_histories (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_instagram_session_created
  ON public.instagram_chat_histories (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_instagram_tenant_id
  ON public.instagram_chat_histories (tenant_id, id);
