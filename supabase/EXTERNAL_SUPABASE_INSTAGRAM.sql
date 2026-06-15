-- =============================================================================
-- instagram_chat_histories — Supabase EXTERNO (VITE_EXTERNAL_SUPABASE_*)
-- Ejecutar manualmente en el SQL Editor del proyecto externo.
-- Sin esto, el cliente anon devuelve [] aunque existan filas (RLS sin policy).
-- =============================================================================

-- Diagnóstico: reemplazar el UUID por el tenant_id del usuario
-- SELECT COUNT(*), MIN(created_at), MAX(created_at)
-- FROM public.instagram_chat_histories
-- WHERE tenant_id = '32e875a5-4186-43cb-a075-da1d532616f9';

-- Comparar policies con n8n_chat_histories:
-- SELECT policyname, roles, cmd, qual FROM pg_policies
-- WHERE tablename IN ('n8n_chat_histories', 'instagram_chat_histories');

ALTER TABLE public.instagram_chat_histories ENABLE ROW LEVEL SECURITY;

-- Espejo típico de n8n_chat_histories: lectura anon para el dashboard
DROP POLICY IF EXISTS "anon_select_instagram_chat_histories" ON public.instagram_chat_histories;
CREATE POLICY "anon_select_instagram_chat_histories"
  ON public.instagram_chat_histories
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_update_instagram_chat_histories" ON public.instagram_chat_histories;
CREATE POLICY "anon_update_instagram_chat_histories"
  ON public.instagram_chat_histories
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Rol authenticated (por si el cliente usa sesión en lugar de anon)
DROP POLICY IF EXISTS "authenticated_select_instagram_chat_histories" ON public.instagram_chat_histories;
CREATE POLICY "authenticated_select_instagram_chat_histories"
  ON public.instagram_chat_histories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_update_instagram_chat_histories" ON public.instagram_chat_histories;
CREATE POLICY "authenticated_update_instagram_chat_histories"
  ON public.instagram_chat_histories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime (publicación) — habilitar en Dashboard > Database > Replication si no está
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_chat_histories;
