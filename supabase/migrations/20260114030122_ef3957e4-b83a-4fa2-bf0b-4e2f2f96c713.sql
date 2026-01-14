-- Create trigger function to auto-create user_roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_roles()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Get the first active tenant (or you can hardcode a specific one)
  SELECT id INTO default_tenant_id FROM public.tenants WHERE is_active = true LIMIT 1;
  
  -- Only insert if we have a tenant
  IF default_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, default_tenant_id, 'viewer')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users for user_roles
CREATE TRIGGER on_auth_user_created_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_roles();