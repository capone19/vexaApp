-- ============================================
-- VEXA - Sistema de Créditos para Mensajería WhatsApp
-- ============================================

-- Tabla principal de saldo de créditos por tenant
CREATE TABLE public.tenant_messaging_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance_usd NUMERIC(10,4) DEFAULT 0,
  total_purchased_usd NUMERIC(10,4) DEFAULT 0,
  total_consumed_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Historial de transacciones (depósitos, consumos, reembolsos)
CREATE TABLE public.messaging_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'consumption', 'refund', 'bonus')),
  amount_usd NUMERIC(10,4) NOT NULL,
  balance_after NUMERIC(10,4) NOT NULL,
  message_count INTEGER,
  message_type TEXT CHECK (message_type IN ('marketing', 'utility', 'authentication', 'service')),
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_messaging_credits_tenant ON public.tenant_messaging_credits(tenant_id);
CREATE INDEX idx_messaging_transactions_tenant ON public.messaging_transactions(tenant_id);
CREATE INDEX idx_messaging_transactions_created ON public.messaging_transactions(created_at DESC);
CREATE INDEX idx_messaging_transactions_type ON public.messaging_transactions(type);

-- Habilitar RLS
ALTER TABLE public.tenant_messaging_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_transactions ENABLE ROW LEVEL SECURITY;

-- RLS para tenant_messaging_credits
CREATE POLICY "Service role has full access to messaging credits"
ON public.tenant_messaging_credits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their tenant messaging credits"
ON public.tenant_messaging_credits FOR SELECT
TO authenticated
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- RLS para messaging_transactions
CREATE POLICY "Service role has full access to messaging transactions"
ON public.messaging_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their tenant messaging transactions"
ON public.messaging_transactions FOR SELECT
TO authenticated
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_messaging_credits_updated_at
BEFORE UPDATE ON public.tenant_messaging_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear registro de créditos automáticamente cuando se crea un tenant
CREATE OR REPLACE FUNCTION public.handle_new_tenant_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_messaging_credits (tenant_id, balance_usd)
  VALUES (NEW.id, 0)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_tenant_messaging_credits
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_tenant_credits();

-- Agregar columnas de costo a campaigns si no existen
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS actual_cost_usd NUMERIC(10,4);