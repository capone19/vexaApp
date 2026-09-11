-- =============================================================================
-- conversations — Supabase EXTERNO (VITE_EXTERNAL_SUPABASE_*)
-- Tabla de proyección: 1 fila por chat.
-- IMPORTANTE: NO crear triggers en n8n_chat_histories — n8n Postgres Chat Memory
-- inserta filas sin tenant_id y un trigger que escriba en conversations rompe n8n.
-- WhatsApp se sincroniza vía backfill + realtime en la app (filas con tenant_id).
-- Ejecutar manualmente en el SQL Editor del proyecto externo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  session_id              text        NOT NULL,
  tenant_id               uuid        NOT NULL,
  channel                 text        NOT NULL CHECK (channel IN ('whatsapp')),
  contact_phone           text,
  contact_username        text,
  last_message_preview    text,
  last_message_at         timestamptz NOT NULL,
  last_client_message_at  timestamptz,
  message_count           int         NOT NULL DEFAULT 0,
  bot_activado            boolean     NOT NULL DEFAULT true,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, session_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_channel_last_msg
  ON public.conversations (tenant_id, channel, last_message_at DESC, session_id DESC);

-- -----------------------------------------------------------------------------
-- Asegurar que no queden triggers de sync en n8n_chat_histories
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_insert ON public.n8n_chat_histories;
DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_bot_state ON public.n8n_chat_histories;

-- =============================================================================
-- BACKFILL — correr una sola vez; si el statement timeout del plan free corta,
-- correr por lotes filtrando por rango de created_at.
-- =============================================================================

-- WhatsApp backfill
INSERT INTO public.conversations (
  session_id,
  tenant_id,
  channel,
  contact_phone,
  contact_username,
  last_message_preview,
  last_message_at,
  last_client_message_at,
  message_count,
  bot_activado,
  updated_at
)
SELECT
  agg.session_id,
  agg.tenant_id,
  'whatsapp'::text AS channel,
  (array_agg(h.phone_number ORDER BY h.created_at DESC))[1] AS contact_phone,
  NULL::text AS contact_username,
  LEFT(COALESCE((array_agg(h.message ORDER BY h.created_at DESC))[1]->>'content', ''), 140) AS last_message_preview,
  MAX(h.created_at) AS last_message_at,
  MAX(h.created_at) FILTER (WHERE h.message->>'type' = 'human') AS last_client_message_at,
  COUNT(*)::int AS message_count,
  COALESCE((array_agg(h.bot_activado ORDER BY h.created_at DESC))[1], true) AS bot_activado,
  now() AS updated_at
FROM public.n8n_chat_histories h
INNER JOIN (
  SELECT session_id, tenant_id
  FROM public.n8n_chat_histories
  GROUP BY session_id, tenant_id
) agg ON agg.session_id = h.session_id AND agg.tenant_id = h.tenant_id
GROUP BY agg.session_id, agg.tenant_id
ON CONFLICT (channel, session_id) DO NOTHING;

-- =============================================================================
-- NOTAS MANUALES (no ejecutar desde Cursor)
-- =============================================================================
-- alter publication supabase_realtime add table public.conversations;
--
-- RLS: replicar exactamente la config de RLS/policies de n8n_chat_histories.
