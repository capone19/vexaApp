-- Create tickets table
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category text,
  created_by uuid,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'admin')),
  sender_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for tickets
CREATE POLICY "Clients can view their own tickets" ON public.tickets
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Clients can create tickets for their tenant" ON public.tickets
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Clients can update their own tickets" ON public.tickets
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Service role has full access to tickets" ON public.tickets
  FOR ALL USING (true);

-- RLS policies for ticket messages
CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Service role has full access to ticket_messages" ON public.ticket_messages
  FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_tickets_tenant_id ON public.tickets(tenant_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();