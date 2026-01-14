-- ==============================================
-- VEXA - Configuración de Planes y Addons
-- ==============================================

-- 1. Crear ENUM para planes
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('basic', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear ENUM para addons
DO $$ BEGIN
    CREATE TYPE addon_type AS ENUM (
        'report_meta_ads',
        'report_unconverted_leads', 
        'report_converted_sales',
        'report_ad_advisor',
        'report_conversational_metrics',
        'report_agent_performance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Actualizar campo plan en tenants (convertir a enum)
ALTER TABLE public.tenants 
    ALTER COLUMN plan SET DEFAULT 'basic',
    ALTER COLUMN plan SET NOT NULL;

-- 4. Crear tabla de addons por tenant
CREATE TABLE IF NOT EXISTS public.tenant_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    addon_id TEXT NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, addon_id)
);

-- 5. Crear tabla de historial de suscripciones
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'basic',
    price_usd DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Crear tabla de pagos/facturas
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    amount_usd DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    invoice_url TEXT,
    stripe_invoice_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Habilitar RLS
ALTER TABLE public.tenant_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas RLS
CREATE POLICY "Tenants can view own addons" ON public.tenant_addons
    FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenants can view own subscription" ON public.subscriptions
    FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenants can view own invoices" ON public.invoices
    FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Service role full access
CREATE POLICY "Service role has full access to tenant_addons" ON public.tenant_addons
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to subscriptions" ON public.subscriptions
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to invoices" ON public.invoices
    FOR ALL USING (true);

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_addons_tenant ON public.tenant_addons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);

-- 10. Trigger para updated_at
CREATE TRIGGER tenant_addons_updated_at
    BEFORE UPDATE ON public.tenant_addons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();