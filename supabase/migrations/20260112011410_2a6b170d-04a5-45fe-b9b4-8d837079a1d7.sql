-- Crear índice único para soportar upsert en agent_settings_ui
CREATE UNIQUE INDEX IF NOT EXISTS agent_settings_ui_tenant_section_key 
ON public.agent_settings_ui (tenant_id, section_key);