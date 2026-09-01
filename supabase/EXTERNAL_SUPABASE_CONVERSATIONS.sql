-- =============================================================================
-- conversations — Supabase EXTERNO (VITE_EXTERNAL_SUPABASE_*)
-- Tabla de proyección: 1 fila por chat.
-- IMPORTANTE: NO crear triggers en n8n_chat_histories — n8n Postgres Chat Memory
-- inserta filas sin tenant_id y un trigger que escriba en conversations rompe n8n.
-- Solo instagram_chat_histories lleva triggers; WhatsApp se sincroniza vía backfill
-- + realtime en la app (filas con tenant_id).
-- Ejecutar manualmente en el SQL Editor del proyecto externo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  session_id              text        NOT NULL,
  tenant_id               uuid        NOT NULL,
  channel                 text        NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
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
-- Trigger: sync on INSERT into source tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_conversation_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_channel          text;
  v_contact_phone    text;
  v_contact_username text;
  v_is_human         boolean;
  v_preview          text;
BEGIN
  -- Solo instagram: n8n_chat_histories NO debe tener este trigger (ver nota arriba).
  IF TG_TABLE_NAME = 'instagram_chat_histories' THEN
    v_channel          := 'instagram';
    v_contact_phone    := NULL;
    v_contact_username := NEW.username;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_human := (NEW.message->>'type' = 'human');
  v_preview  := LEFT(COALESCE(NEW.message->>'content', ''), 140);

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
  ) VALUES (
    NEW.session_id,
    NEW.tenant_id,
    v_channel,
    v_contact_phone,
    v_contact_username,
    v_preview,
    NEW.created_at,
    CASE WHEN v_is_human THEN NEW.created_at ELSE NULL END,
    1,
    COALESCE(NEW.bot_activado, true),
    now()
  )
  ON CONFLICT (channel, session_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    contact_phone = COALESCE(EXCLUDED.contact_phone, conversations.contact_phone),
    contact_username = COALESCE(EXCLUDED.contact_username, conversations.contact_username),
    last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at),
    message_count = conversations.message_count + 1,
    last_client_message_at = CASE
      WHEN v_is_human THEN GREATEST(
        COALESCE(conversations.last_client_message_at, '-infinity'::timestamptz),
        NEW.created_at
      )
      ELSE conversations.last_client_message_at
    END,
    last_message_preview = CASE
      WHEN NEW.created_at >= conversations.last_message_at THEN v_preview
      ELSE conversations.last_message_preview
    END,
    bot_activado = COALESCE(NEW.bot_activado, conversations.bot_activado),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: sync bot_activado on UPDATE of source tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_conversation_bot_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_channel text;
BEGIN
  -- Solo instagram: n8n_chat_histories NO debe tener este trigger.
  IF TG_TABLE_NAME = 'instagram_chat_histories' THEN
    v_channel := 'instagram';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.conversations
  SET
    bot_activado = NEW.bot_activado,
    updated_at = now()
  WHERE channel = v_channel
    AND session_id = NEW.session_id;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Triggers SOLO en instagram_chat_histories (n8n_chat_histories: sin triggers)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_insert ON public.n8n_chat_histories;
DROP TRIGGER IF EXISTS trg_n8n_sync_conversation_bot_state ON public.n8n_chat_histories;

-- -----------------------------------------------------------------------------
-- Triggers on instagram_chat_histories
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_instagram_sync_conversation_insert ON public.instagram_chat_histories;
CREATE TRIGGER trg_instagram_sync_conversation_insert
  AFTER INSERT ON public.instagram_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversation_on_insert();

DROP TRIGGER IF EXISTS trg_instagram_sync_conversation_bot_state ON public.instagram_chat_histories;
CREATE TRIGGER trg_instagram_sync_conversation_bot_state
  AFTER UPDATE OF bot_activado ON public.instagram_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversation_bot_state();

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

-- Instagram backfill
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
  'instagram'::text AS channel,
  NULL::text AS contact_phone,
  (array_agg(h.username ORDER BY h.created_at DESC))[1] AS contact_username,
  LEFT(COALESCE((array_agg(h.message ORDER BY h.created_at DESC))[1]->>'content', ''), 140) AS last_message_preview,
  MAX(h.created_at) AS last_message_at,
  MAX(h.created_at) FILTER (WHERE h.message->>'type' = 'human') AS last_client_message_at,
  COUNT(*)::int AS message_count,
  COALESCE((array_agg(h.bot_activado ORDER BY h.created_at DESC))[1], true) AS bot_activado,
  now() AS updated_at
FROM public.instagram_chat_histories h
INNER JOIN (
  SELECT session_id, tenant_id
  FROM public.instagram_chat_histories
  GROUP BY session_id, tenant_id
) agg ON agg.session_id = h.session_id AND agg.tenant_id = h.tenant_id
GROUP BY agg.session_id, agg.tenant_id
ON CONFLICT (channel, session_id) DO NOTHING;

-- =============================================================================
-- NOTAS MANUALES (no ejecutar desde Cursor)
-- =============================================================================
-- alter publication supabase_realtime add table public.conversations;
--
-- RLS: replicar exactamente la config de RLS/policies de n8n_chat_histories
-- (ver también EXTERNAL_SUPABASE_INSTAGRAM.sql para el patrón anon/authenticated).
