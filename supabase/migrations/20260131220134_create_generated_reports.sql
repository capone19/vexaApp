-- =====================================================
-- GENERATED REPORTS TABLE
-- =====================================================
-- Tabla para almacenar reportes generados y enviados a los clientes
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  report_type VARCHAR(100) NOT NULL, -- 'agent-performance', 'conversational-metrics', etc.
  file_url TEXT NOT NULL, -- URL del archivo PDF o documento
  file_name VARCHAR(255) NOT NULL, -- Nombre del archivo
  file_size INTEGER, -- Tamaño en bytes
  period_start DATE NOT NULL, -- Inicio del período del reporte
  period_end DATE NOT NULL, -- Fin del período del reporte
  status VARCHAR(50) DEFAULT 'generated', -- 'generated', 'sent', 'downloaded'
  sent_at TIMESTAMPTZ, -- Fecha en que se envió al cliente
  downloaded_at TIMESTAMPTZ, -- Fecha en que el cliente lo descargó
  download_count INTEGER DEFAULT 0, -- Número de veces descargado
  metadata JSONB, -- Datos adicionales del reporte
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_generated_reports_tenant_id ON public.generated_reports(tenant_id);
CREATE INDEX idx_generated_reports_report_type ON public.generated_reports(report_type);
CREATE INDEX idx_generated_reports_tenant_type ON public.generated_reports(tenant_id, report_type);
CREATE INDEX idx_generated_reports_period ON public.generated_reports(period_start DESC, period_end DESC);
CREATE INDEX idx_generated_reports_created_at ON public.generated_reports(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_generated_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_reports_updated_at();

-- RLS Policies
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver reportes de su tenant
CREATE POLICY "Users can view reports from their tenant"
  ON public.generated_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Solo el sistema puede insertar reportes (vía service role)
-- Los usuarios no pueden insertar directamente
CREATE POLICY "Service role can insert reports"
  ON public.generated_reports
  FOR INSERT
  WITH CHECK (false); -- Solo service role puede insertar

-- Policy: Los usuarios pueden actualizar el status de descarga
CREATE POLICY "Users can update download status"
  ON public.generated_reports
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Comentarios
COMMENT ON TABLE public.generated_reports IS 'Almacena los reportes generados y enviados a los clientes';
COMMENT ON COLUMN public.generated_reports.report_type IS 'Tipo de reporte: agent-performance, conversational-metrics, etc.';
COMMENT ON COLUMN public.generated_reports.file_url IS 'URL del archivo del reporte (PDF, Excel, etc.)';
COMMENT ON COLUMN public.generated_reports.period_start IS 'Fecha de inicio del período que cubre el reporte';
COMMENT ON COLUMN public.generated_reports.period_end IS 'Fecha de fin del período que cubre el reporte';
COMMENT ON COLUMN public.generated_reports.status IS 'Estado: generated (generado), sent (enviado), downloaded (descargado)';
COMMENT ON COLUMN public.generated_reports.metadata IS 'Datos adicionales del reporte en formato JSON';
