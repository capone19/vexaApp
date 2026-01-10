-- =====================================================
-- VEXA MULTI-TENANT SAAS BACKEND SCHEMA
-- =====================================================

-- 1. APP ROLE ENUM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'agent', 'viewer');

-- 2. FUNNEL STAGE ENUM
-- =====================================================
CREATE TYPE public.funnel_stage AS ENUM ('tofu', 'mofu', 'hot', 'bofu', 'converted', 'lost');

-- 3. BOOKING STATUS ENUM
-- =====================================================
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- 4. BOOKING ORIGIN ENUM
-- =====================================================
CREATE TYPE public.booking_origin AS ENUM ('chat', 'campaign', 'manual', 'web');

-- 5. CHAT STATUS ENUM
-- =====================================================
CREATE TYPE public.chat_status AS ENUM ('active', 'waiting', 'resolved', 'escalated', 'abandoned');

-- =====================================================
-- TENANTS TABLE (Business Clients)
-- =====================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  whatsapp_phone_id TEXT,
  whatsapp_business_id TEXT,
  timezone TEXT DEFAULT 'America/Mexico_City',
  is_active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER ROLES TABLE (Multi-tenant user access)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE (User profiles)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AGENT PROMPTS TABLE (Core AI Configuration)
-- One row per tenant, no versioning
-- =====================================================
CREATE TABLE public.agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prompt_personality TEXT,
  prompt_business_context TEXT,
  prompt_policies TEXT,
  prompt_services TEXT,
  prompt_rescheduling TEXT,
  prompt_payments TEXT,
  prompt_handover TEXT,
  prompt_faq TEXT,
  prompt_limits TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHAT SESSIONS TABLE
-- =====================================================
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  wa_contact_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  status chat_status DEFAULT 'active',
  funnel_stage funnel_stage DEFAULT 'tofu',
  is_handoff BOOLEAN DEFAULT false,
  handoff_reason TEXT,
  assigned_agent_id UUID REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_sessions_tenant ON public.chat_sessions(tenant_id);
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_sessions_funnel ON public.chat_sessions(funnel_stage);
CREATE INDEX idx_chat_sessions_last_message ON public.chat_sessions(last_message_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'bot', 'system')),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'template')),
  wa_message_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_tenant ON public.chat_messages(tenant_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BOOKINGS TABLE
-- =====================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  service_name TEXT NOT NULL,
  service_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status booking_status DEFAULT 'pending',
  origin booking_origin DEFAULT 'chat',
  notes TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'MXN',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX idx_bookings_scheduled ON public.bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- METRICS DAILY TABLE (Pre-aggregated metrics)
-- =====================================================
CREATE TABLE public.metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  inbound_messages INTEGER DEFAULT 0,
  outbound_messages INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  tofu_count INTEGER DEFAULT 0,
  mofu_count INTEGER DEFAULT 0,
  hot_count INTEGER DEFAULT 0,
  bofu_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  lost_count INTEGER DEFAULT 0,
  handoffs INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  bookings_confirmed INTEGER DEFAULT 0,
  bookings_cancelled INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  avg_response_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX idx_metrics_daily_tenant_date ON public.metrics_daily(tenant_id, date DESC);

ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- Function to check if user has role in tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  )
$$;

-- Function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
  )
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- TENANTS: Users can only see their tenant
CREATE POLICY "Users can view their tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), id));

-- USER_ROLES: Users can see roles in their tenant
CREATE POLICY "Users can view roles in their tenant"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- PROFILES: Users can manage their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- AGENT_PROMPTS: Users can view/update prompts for their tenant
CREATE POLICY "Users can view agent prompts for their tenant"
  ON public.agent_prompts FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can update agent prompts for their tenant"
  ON public.agent_prompts FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can insert agent prompts for their tenant"
  ON public.agent_prompts FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- CHAT_SESSIONS: Tenant isolation
CREATE POLICY "Users can view chat sessions for their tenant"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- CHAT_MESSAGES: Tenant isolation
CREATE POLICY "Users can view chat messages for their tenant"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- BOOKINGS: Tenant isolation
CREATE POLICY "Users can view bookings for their tenant"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can manage bookings for their tenant"
  ON public.bookings FOR ALL
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- METRICS_DAILY: Tenant isolation
CREATE POLICY "Users can view metrics for their tenant"
  ON public.metrics_daily FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- =====================================================
-- SERVICE ROLE POLICIES (for n8n/backend)
-- =====================================================

-- Allow service role full access (used by n8n)
CREATE POLICY "Service role has full access to tenants"
  ON public.tenants FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to agent_prompts"
  ON public.agent_prompts FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to chat_sessions"
  ON public.chat_sessions FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to chat_messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to bookings"
  ON public.bookings FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to metrics_daily"
  ON public.metrics_daily FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_prompts_updated_at
  BEFORE UPDATE ON public.agent_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create agent_prompts when tenant is created
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agent_prompts (tenant_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;