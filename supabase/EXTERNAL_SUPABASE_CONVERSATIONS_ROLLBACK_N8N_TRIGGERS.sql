-- =============================================================================
-- ROLLBACK URGENTE — restaurar n8n_chat_histories sin triggers
-- Ejecutar YA en el Supabase EXTERNO si n8n Postgres Chat Memory falla con:
--   null value in column "tenant_id" of relation "conversations" ...
--
-- Causa: los triggers AFTER INSERT/UPDATE en n8n_chat_histories intentan escribir
-- en conversations; n8n inserta filas de memoria SIN tenant_id y el INSERT falla.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_insert ON public.n8n_chat_histories;
DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_bot_state ON public.n8n_chat_histories;

-- La tabla n8n_chat_histories queda sin triggers (como antes).
-- La proyección conversations sigue existiendo; WhatsApp se actualiza vía
-- backfill + realtime en la app (filas con tenant_id), no vía triggers en n8n.
