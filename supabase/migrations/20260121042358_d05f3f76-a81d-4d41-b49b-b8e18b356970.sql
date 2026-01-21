-- ==================================================
-- Chat Labels System
-- ==================================================

-- Table: chat_labels (definiciones de etiquetas por tenant)
CREATE TABLE public.chat_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Color en hex
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Table: chat_session_labels (relación N:M entre sesiones y labels)
CREATE TABLE public.chat_session_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL, -- session_id de n8n_chat_histories
  label_id UUID REFERENCES public.chat_labels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, session_id, label_id)
);

-- Enable RLS
ALTER TABLE public.chat_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_session_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_labels
CREATE POLICY "Users can view their tenant labels"
  ON public.chat_labels FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create labels for their tenant"
  ON public.chat_labels FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant labels"
  ON public.chat_labels FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their tenant labels"
  ON public.chat_labels FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- RLS Policies for chat_session_labels
CREATE POLICY "Users can view their tenant session labels"
  ON public.chat_session_labels FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can assign labels to sessions"
  ON public.chat_session_labels FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can remove labels from sessions"
  ON public.chat_session_labels FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_chat_labels_tenant ON public.chat_labels(tenant_id);
CREATE INDEX idx_chat_session_labels_tenant ON public.chat_session_labels(tenant_id);
CREATE INDEX idx_chat_session_labels_session ON public.chat_session_labels(session_id);
CREATE INDEX idx_chat_session_labels_label ON public.chat_session_labels(label_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_labels_updated_at
  BEFORE UPDATE ON public.chat_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();