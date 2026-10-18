-- =============================================================================
-- Content Studio: cuentas sociales conectadas por OAuth (YouTube primero)
-- =============================================================================

-- Cuentas visibles en el Studio (sin secretos)
CREATE TABLE IF NOT EXISTS public.studio_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  external_id text NOT NULL,
  handle text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  followers bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'conectada' CHECK (status IN ('conectada', 'pendiente', 'error')),
  managed boolean NOT NULL DEFAULT true,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_studio_accounts_tenant ON public.studio_accounts (tenant_id);

DROP TRIGGER IF EXISTS trg_studio_accounts_updated_at ON public.studio_accounts;
CREATE TRIGGER trg_studio_accounts_updated_at
  BEFORE UPDATE ON public.studio_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_accounts ENABLE ROW LEVEL SECURITY;

-- El alta se hace solo desde la Edge Function (service role); el usuario puede ver,
-- marcar como gestionada y quitar las cuentas de su tenant.
DROP POLICY IF EXISTS "studio_accounts_select" ON public.studio_accounts;
CREATE POLICY "studio_accounts_select" ON public.studio_accounts
  FOR SELECT USING (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "studio_accounts_update" ON public.studio_accounts;
CREATE POLICY "studio_accounts_update" ON public.studio_accounts
  FOR UPDATE USING (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "studio_accounts_delete" ON public.studio_accounts;
CREATE POLICY "studio_accounts_delete" ON public.studio_accounts
  FOR DELETE USING (public.user_belongs_to_tenant(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- Tokens OAuth: solo service role (RLS activo y sin políticas)
CREATE TABLE IF NOT EXISTS public.studio_account_tokens (
  account_id uuid PRIMARY KEY REFERENCES public.studio_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  scope text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_account_tokens ENABLE ROW LEVEL SECURITY;

-- Estados de OAuth en curso (anti-CSRF), expiran a los 15 minutos
CREATE TABLE IF NOT EXISTS public.studio_oauth_states (
  state text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  return_to text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_oauth_states ENABLE ROW LEVEL SECURITY;
