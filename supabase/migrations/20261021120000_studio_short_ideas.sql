-- =============================================================================
-- Content Studio: registro de ideas de Shorts (anti-repetición)
-- =============================================================================
-- Una fila por Short que propone la IA de la Fábrica (o que se registra desde un proyecto viejo).
-- Sirve para: no reusar tramos del mismo episodio, medir el parecido con lo ya hecho, rotar formatos
-- y avisar cuando un episodio ya dio todo lo que tenía. Escribe n8n (webhook vexa-studio/shorts);
-- la app solo lee la vista y cambia el estado (usada / descartada) y la huella del cuadro de apertura.

CREATE TABLE IF NOT EXISTS public.studio_short_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  -- Episodio / video origen: 'yt:<id del video largo>' o 'file:<huella del archivo>'
  source_key text NOT NULL,
  source_title text NOT NULL DEFAULT '',
  source_video_id text,
  source_duration numeric,
  project_id text NOT NULL,
  plan_id text NOT NULL,
  source_ref text GENERATED ALWAYS AS ('shorts:' || project_id || ':' || plan_id) STORED,
  -- propuesta: la sugirió la IA · usada: se renderizó y mandó a Programación o a Instagram · descartada
  status text NOT NULL DEFAULT 'propuesta' CHECK (status IN ('propuesta', 'usada', 'descartada')),
  -- Tramos del video origen (segundos) y su envoltura para buscar solapes rápido
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  range_start numeric,
  range_end numeric,
  topic text NOT NULL DEFAULT '',
  thesis text NOT NULL DEFAULT '',
  angle text,
  format text,
  hook_line text NOT NULL DEFAULT '',
  hook_text text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  end_line text NOT NULL DEFAULT '',
  first_line text NOT NULL DEFAULT '',
  duration numeric,
  score integer,
  -- Huella (dHash, 16 hex) del primer cuadro del Short renderizado: la calcula la app
  open_frame_hash text,
  -- Embedding de la idea (OpenAI text-embedding-3-small, 256 dims): solo lo lee n8n
  embedding real[],
  -- Parecido máximo (0-100) con una idea anterior del canal y cuál fue
  similarity integer,
  similar_to uuid REFERENCES public.studio_short_ideas(id) ON DELETE SET NULL,
  similarity_reason text,
  -- Ideas del mismo tema (parecido >= 55): [{id, similarity}] para la regla de 3 días
  neighbors jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Lista de control: [{key, ok, label}]
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Short de YouTube vinculado a mano (Shorts subidos antes de existir source_ref)
  youtube_video_id text,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, project_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_studio_short_ideas_source ON public.studio_short_ideas (account_id, source_key);
CREATE INDEX IF NOT EXISTS idx_studio_short_ideas_recent ON public.studio_short_ideas (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_short_ideas_ref ON public.studio_short_ideas (source_ref);
CREATE INDEX IF NOT EXISTS idx_studio_video_tasks_source_ref ON public.studio_video_tasks (source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studio_publications_source_ref ON public.studio_publications (source_ref) WHERE source_ref IS NOT NULL;

DROP TRIGGER IF EXISTS trg_studio_short_ideas_updated_at ON public.studio_short_ideas;
CREATE TRIGGER trg_studio_short_ideas_updated_at
  BEFORE UPDATE ON public.studio_short_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_short_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_short_ideas_select" ON public.studio_short_ideas;
CREATE POLICY "studio_short_ideas_select" ON public.studio_short_ideas
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ));

DROP POLICY IF EXISTS "studio_short_ideas_update" ON public.studio_short_ideas;
CREATE POLICY "studio_short_ideas_update" ON public.studio_short_ideas
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ));

-- La app no inserta ni borra (lo hace n8n) y solo puede tocar estas columnas
REVOKE ALL ON public.studio_short_ideas FROM anon, authenticated;
GRANT SELECT ON public.studio_short_ideas TO authenticated;
GRANT UPDATE (status, used_at, open_frame_hash, youtube_video_id) ON public.studio_short_ideas TO authenticated;

-- Vista para la app: sin el embedding y con dónde quedó cada idea (YouTube e Instagram)
CREATE OR REPLACE VIEW public.studio_short_ideas_v
WITH (security_invoker = true) AS
SELECT
  i.id, i.account_id, i.source_key, i.source_title, i.source_video_id, i.source_duration,
  i.project_id, i.plan_id, i.source_ref, i.status, i.segments, i.range_start, i.range_end,
  i.topic, i.thesis, i.angle, i.format, i.hook_line, i.hook_text, i.title, i.end_line, i.first_line,
  i.duration, i.score, i.open_frame_hash, i.similarity, i.similar_to, i.similarity_reason,
  i.neighbors, i.checks, i.used_at, i.created_at, i.updated_at,
  coalesce(i.youtube_video_id, t.video_id) AS youtube_video_id,
  t.post_after AS youtube_at,
  p.id AS ig_publication_id,
  p.status AS ig_status,
  coalesce(p.published_at, p.scheduled_at) AS ig_at,
  p.permalink AS ig_permalink,
  CASE
    WHEN i.status = 'descartada' THEN 'descartada'
    WHEN t.post_after <= now() OR p.status = 'publicado' THEN 'publicada'
    WHEN t.post_after > now() OR p.status IN ('programado', 'publicando') THEN 'programada'
    ELSE i.status
  END AS stage,
  least(t.post_after, coalesce(p.published_at, p.scheduled_at)) AS planned_at
FROM public.studio_short_ideas i
LEFT JOIN LATERAL (
  SELECT vt.video_id, vt.post_after
  FROM public.studio_video_tasks vt
  WHERE vt.account_id = i.account_id
    AND (vt.source_ref = i.source_ref OR (i.youtube_video_id IS NOT NULL AND vt.video_id = i.youtube_video_id))
  ORDER BY vt.post_after DESC
  LIMIT 1
) t ON true
LEFT JOIN LATERAL (
  SELECT sp.id, sp.status, sp.scheduled_at, sp.published_at, sp.permalink
  FROM public.studio_publications sp
  WHERE sp.source_ref = i.source_ref AND sp.status <> 'borrador'
  ORDER BY sp.created_at DESC
  LIMIT 1
) p ON true;

REVOKE ALL ON public.studio_short_ideas_v FROM anon, authenticated;
GRANT SELECT ON public.studio_short_ideas_v TO authenticated;
