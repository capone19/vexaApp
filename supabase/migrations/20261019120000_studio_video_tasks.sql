-- =============================================================================
-- Content Studio: tareas de cada video subido a YouTube
-- =============================================================================
-- Comentario para fijar (se publica solo: apenas se programa si YouTube lo permite, o a la hora
-- de publicación vía n8n) y video largo relacionado de los Shorts (se elige a mano en YouTube Studio).

CREATE TABLE IF NOT EXISTS public.studio_video_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  is_short boolean NOT NULL DEFAULT false,
  comment_text text,
  -- sin: no hay comentario · pendiente: falta publicarlo · publicado: falta fijarlo · fijado · error
  comment_status text NOT NULL DEFAULT 'sin' CHECK (comment_status IN ('sin', 'pendiente', 'publicado', 'fijado', 'error')),
  comment_id text,
  -- Desde cuándo n8n intenta publicar el comentario (la hora de publicación del video)
  post_after timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  posted_at timestamptz,
  related_video_id text,
  related_video_title text,
  related_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, video_id)
);

-- n8n solo mira los pendientes que ya vencieron
CREATE INDEX IF NOT EXISTS idx_studio_video_tasks_due
  ON public.studio_video_tasks (post_after) WHERE comment_status = 'pendiente';

DROP TRIGGER IF EXISTS trg_studio_video_tasks_updated_at ON public.studio_video_tasks;
CREATE TRIGGER trg_studio_video_tasks_updated_at
  BEFORE UPDATE ON public.studio_video_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_video_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_video_tasks_all" ON public.studio_video_tasks;
CREATE POLICY "studio_video_tasks_all" ON public.studio_video_tasks
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ));

-- Claves internas del Studio: solo service role y la conexión Postgres de n8n (RLS activo y sin políticas).
-- n8n lee 'n8n_key' en cada ejecución y la manda a la Edge Function: la clave nunca sale de la base.
CREATE TABLE IF NOT EXISTS public.studio_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.studio_secrets (name, value)
VALUES ('n8n_key', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;
