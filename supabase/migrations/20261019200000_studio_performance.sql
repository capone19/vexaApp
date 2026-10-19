-- =============================================================================
-- Content Studio: Rendimiento (YouTube)
-- =============================================================================
-- Tablas chicas: el trabajo pesado lo hace n8n (fotos por hora y alertas) y el navegador (Analytics).
--   studio_video_snapshots  · n8n anota cada hora las vistas de los videos recientes (YouTube no da vistas por hora).
--                             n8n la poda a diario: después de 21 días queda 1 foto diaria + las primeras 72 h de cada video.
--   studio_performance_alerts · un aviso por video y nivel, para no repetir el Telegram.
--   studio_channel_baselines  · curva típica del canal (vistas acumuladas por día de vida), la calcula la app.
--   studio_video_insights     · diagnósticos de la IA y propuestas para replicar (con su resultado real: bitácora).

CREATE TABLE IF NOT EXISTS public.studio_video_snapshots (
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  taken_at timestamptz NOT NULL,
  views integer NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, video_id, taken_at)
);

CREATE INDEX IF NOT EXISTS idx_studio_video_snapshots_time
  ON public.studio_video_snapshots (account_id, taken_at);

CREATE TABLE IF NOT EXISTS public.studio_performance_alerts (
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  -- despegando: 3x su curva esperada · viral: 10x · reactivado: un video viejo que vuelve a moverse
  level text NOT NULL CHECK (level IN ('despegando', 'viral', 'reactivado')),
  video_title text NOT NULL DEFAULT '',
  is_short boolean NOT NULL DEFAULT false,
  ratio numeric NOT NULL,
  views integer NOT NULL,
  age_hours numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, video_id, level)
);

CREATE TABLE IF NOT EXISTS public.studio_channel_baselines (
  account_id uuid PRIMARY KEY REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_video_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  is_short boolean NOT NULL DEFAULT false,
  kind text NOT NULL CHECK (kind IN ('diagnostico', 'replica')),
  data jsonb NOT NULL,
  -- Bitácora: el video que se publicó siguiendo esta réplica, para comparar lo previsto con lo real
  result_video_id text,
  result_video_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_video_insights_video
  ON public.studio_video_insights (account_id, video_id, kind, created_at DESC);

DROP TRIGGER IF EXISTS trg_studio_video_insights_updated_at ON public.studio_video_insights;
CREATE TRIGGER trg_studio_video_insights_updated_at
  BEFORE UPDATE ON public.studio_video_insights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_video_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_channel_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_video_insights ENABLE ROW LEVEL SECURITY;

-- Fotos y alertas las escribe n8n (conexión Postgres); el equipo del canal solo las lee
DROP POLICY IF EXISTS "studio_video_snapshots_select" ON public.studio_video_snapshots;
CREATE POLICY "studio_video_snapshots_select" ON public.studio_video_snapshots
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ));

DROP POLICY IF EXISTS "studio_performance_alerts_select" ON public.studio_performance_alerts;
CREATE POLICY "studio_performance_alerts_select" ON public.studio_performance_alerts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.studio_accounts a
    WHERE a.id = account_id
      AND (public.user_belongs_to_tenant(auth.uid(), a.tenant_id) OR public.has_role(auth.uid(), 'admin'))
  ));

DROP POLICY IF EXISTS "studio_channel_baselines_all" ON public.studio_channel_baselines;
CREATE POLICY "studio_channel_baselines_all" ON public.studio_channel_baselines
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

DROP POLICY IF EXISTS "studio_video_insights_all" ON public.studio_video_insights;
CREATE POLICY "studio_video_insights_all" ON public.studio_video_insights
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

-- Poda: la corre n8n una vez al día con su conexión Postgres (sin funciones extra en la base):
--   DELETE FROM studio_video_snapshots s USING (SELECT account_id, video_id, min(taken_at) first_at
--     FROM studio_video_snapshots GROUP BY 1, 2) f
--   WHERE s.account_id = f.account_id AND s.video_id = f.video_id AND s.taken_at < now() - interval '21 days'
--     AND s.taken_at > f.first_at + interval '72 hours' AND extract(hour FROM s.taken_at AT TIME ZONE 'UTC') <> 0;
--   DELETE FROM studio_video_snapshots WHERE taken_at < now() - interval '400 days';
