-- Create table for health check history
CREATE TABLE public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER NOT NULL,
  error_message TEXT,
  metadata JSONB
);

-- Indexes for fast queries
CREATE INDEX idx_health_checks_service ON public.health_checks(service_name);
CREATE INDEX idx_health_checks_checked_at ON public.health_checks(checked_at DESC);

-- Enable RLS (access only via service role from edge function)
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- No user policies needed - only accessed via edge function with service role