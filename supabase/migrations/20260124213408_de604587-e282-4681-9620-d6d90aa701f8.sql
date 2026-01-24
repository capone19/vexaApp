-- Tabla para registrar impersonaciones administrativas (auditoría)
CREATE TABLE public.admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_impersonation_logs_admin ON public.admin_impersonation_logs(admin_user_id);
CREATE INDEX idx_impersonation_logs_tenant ON public.admin_impersonation_logs(tenant_id);
CREATE INDEX idx_impersonation_logs_started ON public.admin_impersonation_logs(started_at DESC);

-- Habilitar RLS
ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Solo service role puede acceder (los registros se crean desde edge functions)
CREATE POLICY "Service role has full access to impersonation logs" 
ON public.admin_impersonation_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comentario para documentación
COMMENT ON TABLE public.admin_impersonation_logs IS 'Registro de auditoría para impersonaciones de tenants por admins';