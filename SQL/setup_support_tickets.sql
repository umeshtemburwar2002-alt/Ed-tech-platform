
-- ==============================================
-- STEP 1: Create Support Tickets Table
-- ==============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  subject TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachment_url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- STEP 2: Create Sequence for Ticket IDs
-- ==============================================
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1001;

-- ==============================================
-- STEP 3: Add Trigger to Auto-Generate Ticket ID
-- ==============================================
CREATE OR REPLACE FUNCTION public.set_ticket_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_id := 'SUP-' || nextval('support_ticket_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_id
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_id();

-- ==============================================
-- STEP 4: Enable RLS
-- ==============================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 5: Add RLS Policies for Students
-- ==============================================
DROP POLICY IF EXISTS "Students can create tickets" ON public.support_tickets;
CREATE POLICY "Students can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can view own tickets" ON public.support_tickets;
CREATE POLICY "Students can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own tickets" ON public.support_tickets;
CREATE POLICY "Students can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);
