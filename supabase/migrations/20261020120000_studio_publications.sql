-- =============================================================================
-- Content Studio: publicaciones en Instagram (y luego TikTok) programadas desde VEXA
-- =============================================================================
-- La app crea y programa la fila. n8n hace el resto:
--   · "Instagram: subir video"    deja el archivo en R2 (transitorio) y llena media_*
--   · "Instagram: reloj"          cada minuto toma las que llegaron a su hora y llama a "publicar Reel"
--   · "Instagram: publicar Reel"  crea el Reel, lo publica, borra el archivo de R2 y marca publicado
-- El usuario solo puede dejar una fila en borrador o programado; los estados técnicos los pone n8n.

CREATE TABLE IF NOT EXISTS public.studio_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'tiktok')),
  format text NOT NULL DEFAULT 'reel' CHECK (format IN ('reel', 'video')),
  -- Nombre interno para el calendario (no se publica)
  title text NOT NULL DEFAULT '',
  -- Texto final tal como sale en Instagram (hashtags incluidos)
  caption text NOT NULL DEFAULT '',
  -- share_to_feed (bool, por defecto true), thumb_offset_ms (int), collaborators (text[] máx 3),
  -- location_id (text), first_comment (text), audio_name (text)
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- De dónde salió el video: 'shorts:<projectId>:<planId>' · 'youtube:<videoId>' · 'upload'
  source_ref text,
  -- Short de YouTube gemelo (para comparar rendimiento entre plataformas)
  youtube_video_id text,
  -- borrador · programado · publicando (n8n) · publicado (n8n) · error (n8n)
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'programado', 'publicando', 'publicado', 'error')),
  scheduled_at timestamptz,
  -- Archivo transitorio en R2: se borra apenas se publica
  media_key text,
  media_url text,
  media_size bigint,
  media_uploaded_at timestamptz,
  container_id text,
  -- Cuándo se le entregó el video a Instagram (si tarda más de 20 min en procesarlo, se reintenta)
  container_created_at timestamptz,
  external_id text,
  permalink text,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  retry_after timestamptz,
  last_error text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_publications_scheduled_needs_date CHECK (status <> 'programado' OR scheduled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_studio_publications_account_date ON public.studio_publications (account_id, scheduled_at);
-- El reloj de n8n solo mira las programadas
CREATE INDEX IF NOT EXISTS idx_studio_publications_due
  ON public.studio_publications (scheduled_at) WHERE status = 'programado';
CREATE INDEX IF NOT EXISTS idx_studio_publications_youtube ON public.studio_publications (youtube_video_id) WHERE youtube_video_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_studio_publications_updated_at ON public.studio_publications;
CREATE TRIGGER trg_studio_publications_updated_at
  BEFORE UPDATE ON public.studio_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lo que viene de la app (con sesión de usuario) no puede tocar los campos técnicos.
-- n8n entra por su conexión Postgres (sin auth.uid()) y no pasa por estas reglas.
CREATE OR REPLACE FUNCTION public.studio_publications_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = NEW.account_id AND a.tenant_id = NEW.tenant_id AND a.platform = NEW.platform
  ) THEN
    RAISE EXCEPTION 'La cuenta no corresponde a esta publicación';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('borrador', 'programado') THEN
      RAISE EXCEPTION 'Una publicación nueva solo puede quedar en borrador o programada';
    END IF;
    NEW.media_key := NULL; NEW.media_url := NULL; NEW.media_size := NULL; NEW.media_uploaded_at := NULL;
    NEW.container_id := NULL; NEW.container_created_at := NULL; NEW.external_id := NULL; NEW.permalink := NULL; NEW.published_at := NULL;
    NEW.attempts := 0; NEW.retry_after := NULL; NEW.last_error := NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('publicando', 'publicado') THEN
    RAISE EXCEPTION 'Esta publicación ya está saliendo o ya salió: no se puede editar';
  END IF;
  IF NEW.status NOT IN ('borrador', 'programado') THEN
    RAISE EXCEPTION 'Solo puedes dejarla en borrador o programada';
  END IF;

  -- Campos técnicos: solo n8n
  NEW.media_key := OLD.media_key; NEW.media_url := OLD.media_url; NEW.media_size := OLD.media_size;
  NEW.media_uploaded_at := OLD.media_uploaded_at; NEW.container_id := OLD.container_id;
  NEW.container_created_at := OLD.container_created_at;
  NEW.external_id := OLD.external_id; NEW.permalink := OLD.permalink; NEW.published_at := OLD.published_at;
  NEW.created_by := OLD.created_by; NEW.tenant_id := OLD.tenant_id;

  -- Reprogramar o reintentar limpia el error y los intentos
  IF NEW.status = 'programado' AND (OLD.status = 'error' OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at) THEN
    NEW.attempts := 0; NEW.retry_after := NULL; NEW.last_error := NULL;
  ELSE
    NEW.attempts := OLD.attempts; NEW.retry_after := OLD.retry_after; NEW.last_error := OLD.last_error;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_publications_guard ON public.studio_publications;
CREATE TRIGGER trg_studio_publications_guard
  BEFORE INSERT OR UPDATE ON public.studio_publications
  FOR EACH ROW EXECUTE FUNCTION public.studio_publications_guard();

ALTER TABLE public.studio_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_publications_select" ON public.studio_publications;
CREATE POLICY "studio_publications_select" ON public.studio_publications
  FOR SELECT USING (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "studio_publications_insert" ON public.studio_publications;
CREATE POLICY "studio_publications_insert" ON public.studio_publications
  FOR INSERT WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "studio_publications_update" ON public.studio_publications;
CREATE POLICY "studio_publications_update" ON public.studio_publications
  FOR UPDATE USING (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- Borrar una que se está publicando dejaría el Reel a medias
DROP POLICY IF EXISTS "studio_publications_delete" ON public.studio_publications;
CREATE POLICY "studio_publications_delete" ON public.studio_publications
  FOR DELETE USING (
    status <> 'publicando'
    AND (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'))
  );

-- Vínculo Short de YouTube ↔ archivo de la Fábrica de Shorts ('shorts:<projectId>:<planId>'):
-- así Instagram encuentra el archivo de un Short que ya se subió a YouTube.
ALTER TABLE public.studio_video_tasks ADD COLUMN IF NOT EXISTS source_ref text;
