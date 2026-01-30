-- ============================================
-- CORREGIR POLÍTICAS RLS - RESTRINGIR A service_role
-- ============================================

-- 1. agent_settings_ui
DROP POLICY IF EXISTS "Service role has full access" ON public.agent_settings_ui;
CREATE POLICY "Service role has full access" 
  ON public.agent_settings_ui 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. health_checks
DROP POLICY IF EXISTS "Service role has full access to health_checks" ON public.health_checks;
CREATE POLICY "Service role has full access to health_checks" 
  ON public.health_checks 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. invoices
DROP POLICY IF EXISTS "Service role has full access to invoices" ON public.invoices;
CREATE POLICY "Service role has full access to invoices" 
  ON public.invoices 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 4. subscriptions
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Service role has full access to subscriptions" 
  ON public.subscriptions 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 5. tenant_addons
DROP POLICY IF EXISTS "Service role has full access to tenant_addons" ON public.tenant_addons;
CREATE POLICY "Service role has full access to tenant_addons" 
  ON public.tenant_addons 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 6. tenant_webhooks
DROP POLICY IF EXISTS "Service role has full access to tenant_webhooks" ON public.tenant_webhooks;
CREATE POLICY "Service role has full access to tenant_webhooks" 
  ON public.tenant_webhooks 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 7. ticket_messages
DROP POLICY IF EXISTS "Service role has full access to ticket_messages" ON public.ticket_messages;
CREATE POLICY "Service role has full access to ticket_messages" 
  ON public.ticket_messages 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 8. tickets
DROP POLICY IF EXISTS "Service role has full access to tickets" ON public.tickets;
CREATE POLICY "Service role has full access to tickets" 
  ON public.tickets 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);