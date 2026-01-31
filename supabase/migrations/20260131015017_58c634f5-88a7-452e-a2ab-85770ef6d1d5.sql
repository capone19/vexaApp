-- Agregar columna para tipo de integración de WhatsApp
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS whatsapp_integration text DEFAULT 'no_conectado';

-- Comentario descriptivo
COMMENT ON COLUMN public.tenants.whatsapp_integration IS 'Tipo de integración WhatsApp: no_conectado, evolution_api, meta_api';