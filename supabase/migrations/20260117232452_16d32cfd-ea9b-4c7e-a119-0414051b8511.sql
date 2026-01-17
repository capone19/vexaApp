-- Create tenant_webhooks table for dynamic webhook routing
CREATE TABLE public.tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL DEFAULT 'human_message',
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, webhook_type)
);

-- Enable RLS
ALTER TABLE public.tenant_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy for users to view webhooks for their tenant
CREATE POLICY "Users can view webhooks for their tenant" 
ON public.tenant_webhooks 
FOR SELECT 
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Policy for users to manage webhooks for their tenant
CREATE POLICY "Users can manage webhooks for their tenant" 
ON public.tenant_webhooks 
FOR ALL 
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Service role full access
CREATE POLICY "Service role has full access to tenant_webhooks" 
ON public.tenant_webhooks 
FOR ALL 
USING (true);

-- Insert webhook for Estética Online
INSERT INTO public.tenant_webhooks (tenant_id, webhook_type, webhook_url)
VALUES (
  '6fea8edb-fcaa-4724-86c3-3865398e4aa8',
  'human_message',
  'https://n8n-growthpartners-n8n.q7anmx.easypanel.host/webhook/estetica_online'
);

-- Insert default webhook for other tenants (using a known tenant or create a system default)
-- For now, we'll handle the default in the edge function code