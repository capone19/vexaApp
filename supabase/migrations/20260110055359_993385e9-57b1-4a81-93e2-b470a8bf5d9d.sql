-- =====================================================
-- VEXA ADDITIONAL TABLES - COMPLETE SCHEMA
-- =====================================================

-- 1. TEMPLATE STATUS ENUM
-- =====================================================
CREATE TYPE public.template_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- 2. TEMPLATE CATEGORY ENUM
-- =====================================================
CREATE TYPE public.template_category AS ENUM ('marketing', 'utility', 'authentication', 'service');

-- 3. CAMPAIGN STATUS ENUM
-- =====================================================
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');

-- 4. NOTIFICATION TYPE ENUM
-- =====================================================
CREATE TYPE public.notification_type AS ENUM ('handoff', 'booking', 'campaign', 'system', 'alert');

-- 5. WEBHOOK EVENT TYPE ENUM
-- =====================================================
CREATE TYPE public.webhook_event_type AS ENUM ('message', 'status', 'template_status', 'error', 'other');

-- =====================================================
-- WHATSAPP TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category template_category NOT NULL DEFAULT 'utility',
  status template_status NOT NULL DEFAULT 'draft',
  language TEXT DEFAULT 'es_MX',
  header_type TEXT CHECK (header_type IN ('none', 'text', 'image', 'video', 'document')),
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  wa_template_id TEXT,
  wa_template_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_whatsapp_templates_tenant ON public.whatsapp_templates(tenant_id);
CREATE INDEX idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX idx_whatsapp_templates_category ON public.whatsapp_templates(category);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.whatsapp_templates(id),
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  target_audience JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_tenant ON public.campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CAMPAIGN RECIPIENTS TABLE
-- =====================================================
CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
  wa_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SERVICES TABLE (Structured catalog)
-- =====================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2),
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'variable', 'referential', 'free')),
  currency TEXT DEFAULT 'MXN',
  duration_minutes INTEGER DEFAULT 60,
  modality TEXT[] DEFAULT ARRAY['presencial'],
  requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_tenant ON public.services(tenant_id);
CREATE INDEX idx_services_active ON public.services(is_active);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CONTACTS TABLE (CRM)
-- =====================================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  wa_contact_id TEXT,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  source TEXT DEFAULT 'chat' CHECK (source IN ('chat', 'campaign', 'manual', 'import', 'web')),
  funnel_stage funnel_stage DEFAULT 'tofu',
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT false,
  is_priority BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX idx_contacts_funnel ON public.contacts(funnel_stage);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AVAILABILITY SLOTS TABLE
-- =====================================================
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  location_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT day_or_date CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

CREATE INDEX idx_availability_tenant ON public.availability_slots(tenant_id);
CREATE INDEX idx_availability_day ON public.availability_slots(day_of_week);
CREATE INDEX idx_availability_date ON public.availability_slots(specific_date);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BLOCKED DATES TABLE (Holidays, closures)
-- =====================================================
CREATE TABLE public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  is_full_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX idx_blocked_dates_tenant ON public.blocked_dates(tenant_id);
CREATE INDEX idx_blocked_dates_date ON public.blocked_dates(date);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- WEBHOOK LOGS TABLE
-- =====================================================
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type webhook_event_type NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  endpoint TEXT,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  wa_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_logs_tenant ON public.webhook_logs(tenant_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_event ON public.webhook_logs(event_type);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- WHATSAPP_TEMPLATES
CREATE POLICY "Users can view templates for their tenant"
  ON public.whatsapp_templates FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage templates for their tenant"
  ON public.whatsapp_templates FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- CAMPAIGNS
CREATE POLICY "Users can view campaigns for their tenant"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage campaigns for their tenant"
  ON public.campaigns FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- CAMPAIGN_RECIPIENTS
CREATE POLICY "Users can view campaign recipients for their tenant"
  ON public.campaign_recipients FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage campaign recipients for their tenant"
  ON public.campaign_recipients FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- SERVICES
CREATE POLICY "Users can view services for their tenant"
  ON public.services FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage services for their tenant"
  ON public.services FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- CONTACTS
CREATE POLICY "Users can view contacts for their tenant"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage contacts for their tenant"
  ON public.contacts FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- AVAILABILITY_SLOTS
CREATE POLICY "Users can view availability for their tenant"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage availability for their tenant"
  ON public.availability_slots FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- BLOCKED_DATES
CREATE POLICY "Users can view blocked dates for their tenant"
  ON public.blocked_dates FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage blocked dates for their tenant"
  ON public.blocked_dates FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- WEBHOOK_LOGS
CREATE POLICY "Users can view webhook logs for their tenant"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- NOTIFICATIONS
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- AUDIT_LOGS
CREATE POLICY "Users can view audit logs for their tenant"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- =====================================================
-- SERVICE ROLE POLICIES (for n8n)
-- =====================================================

CREATE POLICY "Service role has full access to whatsapp_templates"
  ON public.whatsapp_templates FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to campaigns"
  ON public.campaigns FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to campaign_recipients"
  ON public.campaign_recipients FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to services"
  ON public.services FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to contacts"
  ON public.contacts FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to availability_slots"
  ON public.availability_slots FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to blocked_dates"
  ON public.blocked_dates FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to webhook_logs"
  ON public.webhook_logs FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to notifications"
  ON public.notifications FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to audit_logs"
  ON public.audit_logs FOR ALL TO service_role USING (true);

-- =====================================================
-- TRIGGERS FOR NEW TABLES
-- =====================================================

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- UPDATE BOOKINGS TABLE - Add contact_id FK
-- =====================================================
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS service_id_fk UUID REFERENCES public.services(id);

-- =====================================================
-- UPDATE CHAT_SESSIONS - Add contact_id FK
-- =====================================================
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);

-- =====================================================
-- HELPER FUNCTION: Get available slots for a date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
  _tenant_id UUID,
  _date DATE,
  _service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  slot_id UUID,
  start_time TIME,
  end_time TIME,
  available_spots INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as slot_id,
    a.start_time,
    a.end_time,
    a.max_bookings - COALESCE(
      (SELECT COUNT(*) FROM bookings b 
       WHERE b.tenant_id = _tenant_id 
         AND DATE(b.scheduled_at) = _date
         AND b.scheduled_at::time >= a.start_time
         AND b.scheduled_at::time < a.end_time
         AND b.status NOT IN ('cancelled')),
      0
    )::INTEGER as available_spots
  FROM availability_slots a
  WHERE a.tenant_id = _tenant_id
    AND a.is_available = true
    AND (_service_id IS NULL OR a.service_id IS NULL OR a.service_id = _service_id)
    AND (
      (a.day_of_week = EXTRACT(DOW FROM _date)::INTEGER AND a.specific_date IS NULL)
      OR a.specific_date = _date
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_dates bd
      WHERE bd.tenant_id = _tenant_id
        AND bd.date = _date
        AND (bd.is_full_day = true OR (a.start_time >= bd.start_time AND a.end_time <= bd.end_time))
    )
  ORDER BY a.start_time;
END;
$$;