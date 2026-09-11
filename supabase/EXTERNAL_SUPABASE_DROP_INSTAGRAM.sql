-- =============================================================================
-- DROP Instagram chat — Supabase EXTERNO (VITE_EXTERNAL_SUPABASE_*)
-- Ejecutar manualmente en el SQL Editor del proyecto externo.
-- Elimina triggers, índices, filas de conversations y la tabla
-- instagram_chat_histories usada por el inbox de Instagram (ya removido de Vexa).
-- =============================================================================

-- Triggers de sync (si existen)
DROP TRIGGER IF EXISTS trg_instagram_sync_conversation_insert ON public.instagram_chat_histories;
DROP TRIGGER IF EXISTS trg_instagram_sync_conversation_bot_state ON public.instagram_chat_histories;

-- Funciones de sync (solo usadas por Instagram; seguras de dropear si no hay otros triggers)
DROP FUNCTION IF EXISTS public.sync_conversation_on_insert();
DROP FUNCTION IF EXISTS public.sync_conversation_bot_state();

-- Índices Instagram
DROP INDEX IF EXISTS public.idx_instagram_tenant_created_at;
DROP INDEX IF EXISTS public.idx_instagram_session_created;
DROP INDEX IF EXISTS public.idx_instagram_tenant_id;

-- Filas de proyección del canal Instagram
DELETE FROM public.conversations WHERE channel = 'instagram';

-- Tabla de mensajes Instagram
DROP TABLE IF EXISTS public.instagram_chat_histories;

-- Opcional: si la constraint CHECK aún permite 'instagram', recrearla solo con whatsapp:
-- ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
-- ALTER TABLE public.conversations
--   ADD CONSTRAINT conversations_channel_check CHECK (channel IN ('whatsapp'));
