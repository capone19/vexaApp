-- Añadir campo para controlar acceso a VEXA Ads por tenant
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS vexa_ads_enabled BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN public.tenants.vexa_ads_enabled IS 'Controla si el tenant tiene acceso al módulo VEXA Ads';