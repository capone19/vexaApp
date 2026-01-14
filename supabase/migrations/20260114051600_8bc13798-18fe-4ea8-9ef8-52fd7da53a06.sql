-- =============================================
-- FIX: Crear trigger para auto-crear agent_prompts cuando se crea tenant
-- =============================================

-- 1. Verificar que la función existe (ya existe según los logs anteriores)
-- Si no existe, crearla
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agent_prompts (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Crear el trigger que FALTABA en la tabla tenants
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tenant();

-- 3. Crear agent_prompts para tenants existentes que no lo tengan
INSERT INTO public.agent_prompts (tenant_id)
SELECT t.id FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_prompts ap WHERE ap.tenant_id = t.id
)
ON CONFLICT DO NOTHING;