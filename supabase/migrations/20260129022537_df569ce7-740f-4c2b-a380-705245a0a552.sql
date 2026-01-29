-- Add RLS policy for health_checks table
-- Only service_role can access this table (from edge function)
-- No direct frontend access needed

CREATE POLICY "Service role has full access to health_checks"
  ON public.health_checks
  FOR ALL
  USING (true)
  WITH CHECK (true);