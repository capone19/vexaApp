-- =============================================
-- FIX: Usuario nuevo NO se asigna automáticamente a ningún tenant
-- El equipo técnico hará el onboarding manualmente
-- =============================================

-- 1. Eliminar el trigger que asigna usuarios al primer tenant
DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;

-- 2. Eliminar la función que ya no necesitamos
DROP FUNCTION IF EXISTS public.handle_new_user_roles();

-- 3. Crear función helper para que el equipo técnico pueda hacer onboarding
-- Esta función crea un tenant + asigna el usuario como owner
CREATE OR REPLACE FUNCTION public.setup_new_client(
  _user_id UUID,
  _tenant_name TEXT,
  _tenant_slug TEXT,
  _timezone TEXT DEFAULT 'America/Mexico_City',
  _plan TEXT DEFAULT 'basic'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Crear el tenant
  INSERT INTO public.tenants (name, slug, timezone, plan, is_active)
  VALUES (_tenant_name, _tenant_slug, _timezone, _plan, true)
  RETURNING id INTO new_tenant_id;
  
  -- Asignar usuario como owner
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, new_tenant_id, 'owner')
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'owner';
  
  -- Crear subscription inicial
  INSERT INTO public.subscriptions (tenant_id, plan, price_usd, status, billing_cycle)
  VALUES (new_tenant_id, _plan, 
    CASE _plan 
      WHEN 'basic' THEN 99.00
      WHEN 'pro' THEN 199.00
      WHEN 'enterprise' THEN 499.00
      ELSE 99.00
    END,
    'active', 'monthly');
  
  -- agent_prompts se crea automáticamente por el trigger handle_new_tenant
  
  RETURN new_tenant_id;
END;
$$;

-- 4. Crear función para agregar usuario existente a un tenant
CREATE OR REPLACE FUNCTION public.add_user_to_tenant(
  _user_id UUID,
  _tenant_id UUID,
  _role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, _role::app_role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = _role::app_role;
  
  RETURN true;
END;
$$;

-- 5. Agregar constraint único para user_roles (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_tenant_unique'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_tenant_unique UNIQUE (user_id, tenant_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;