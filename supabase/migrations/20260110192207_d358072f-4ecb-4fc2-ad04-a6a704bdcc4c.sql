-- Create table to persist UI form state for agent settings
-- This stores the RAW form data that the user fills in (for UI persistence)
-- NOT the mini-prompts which are stored in agent_prompts

CREATE TABLE public.agent_settings_ui (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each tenant can only have one entry per section
  UNIQUE(tenant_id, section_key)
);

-- Enable RLS
ALTER TABLE public.agent_settings_ui ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view settings for their tenant"
ON public.agent_settings_ui
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can insert settings for their tenant"
ON public.agent_settings_ui
FOR INSERT
WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can update settings for their tenant"
ON public.agent_settings_ui
FOR UPDATE
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Service role has full access"
ON public.agent_settings_ui
FOR ALL
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_agent_settings_ui_updated_at
BEFORE UPDATE ON public.agent_settings_ui
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.agent_settings_ui IS 'Stores raw form data for agent settings UI persistence. Mini-prompts are stored separately in agent_prompts after n8n processing.';