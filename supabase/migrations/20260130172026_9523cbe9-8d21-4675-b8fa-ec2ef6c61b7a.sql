-- Create table for YCloud configuration per tenant
CREATE TABLE IF NOT EXISTS public.tenant_ycloud_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_ycloud_config ENABLE ROW LEVEL SECURITY;

-- RLS: Tenants can manage their own config
CREATE POLICY "Tenants can view own ycloud config"
  ON public.tenant_ycloud_config
  FOR SELECT
  USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "Tenants can insert own ycloud config"
  ON public.tenant_ycloud_config
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "Tenants can update own ycloud config"
  ON public.tenant_ycloud_config
  FOR UPDATE
  USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "Tenants can delete own ycloud config"
  ON public.tenant_ycloud_config
  FOR DELETE
  USING (tenant_id = (SELECT get_user_tenant_id()));

-- Service role full access
CREATE POLICY "Service role has full access to ycloud config"
  ON public.tenant_ycloud_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_tenant_ycloud_config
  BEFORE UPDATE ON public.tenant_ycloud_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();