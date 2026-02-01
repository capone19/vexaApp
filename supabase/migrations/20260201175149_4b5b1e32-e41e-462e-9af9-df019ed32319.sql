-- ============================================
-- Tabla para almacenar reportes generados desde n8n
-- ============================================

CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'agent-performance', 'conversation-metrics', etc.
  file_name TEXT NOT NULL,
  file_url TEXT, -- URL si se almacena en storage
  html_content TEXT, -- Contenido HTML del reporte (alternativa a file_url)
  file_size INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'downloaded')),
  sent_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_generated_reports_tenant_id ON public.generated_reports(tenant_id);
CREATE INDEX idx_generated_reports_report_type ON public.generated_reports(report_type);
CREATE INDEX idx_generated_reports_created_at ON public.generated_reports(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuarios solo ven reportes de su tenant
CREATE POLICY "Users can view their tenant reports"
  ON public.generated_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

-- Políticas para actualización (marcar como descargado)
CREATE POLICY "Users can update their tenant reports"
  ON public.generated_reports
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios
COMMENT ON TABLE public.generated_reports IS 'Almacena reportes HTML generados desde n8n';
COMMENT ON COLUMN public.generated_reports.html_content IS 'Contenido HTML del reporte para visualización directa';