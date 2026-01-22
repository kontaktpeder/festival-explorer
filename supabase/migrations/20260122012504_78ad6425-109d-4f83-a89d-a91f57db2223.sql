-- =============================================
-- TICKET SYSTEM SCHEMA
-- =============================================

-- Create ticket_events table
CREATE TABLE IF NOT EXISTS public.ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  venue_name text,
  capacity int,
  created_at timestamptz DEFAULT now()
);

-- Create ticket_types table
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.ticket_events(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_nok int NOT NULL,
  currency text DEFAULT 'nok',
  capacity int NOT NULL,
  visible boolean DEFAULT true,
  sales_start timestamptz,
  sales_end timestamptz,
  stripe_price_id text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.ticket_events(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'CANCELLED')),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  ticket_code text UNIQUE NOT NULL,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create checkins audit log table
CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  checked_in_by uuid NOT NULL REFERENCES auth.users(id),
  method text CHECK (method IN ('qr', 'manual')),
  note text
);

-- Create staff_roles table
CREATE TABLE IF NOT EXISTS public.staff_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'crew')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON public.tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON public.tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_stripe_session_id ON public.tickets(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON public.ticket_types(event_id);

-- Function to generate ticket code (GIGG-XXXX-XXXX format)
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := 'GIGG-';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  
  WHILE EXISTS (SELECT 1 FROM public.tickets WHERE ticket_code = code) LOOP
    code := 'GIGG-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    code := code || '-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Helper function to check staff role
CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if user is any staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'crew')
  )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_ticket_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- RLS Policies
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Public can read ticket_events
CREATE POLICY "Public can read ticket_events"
  ON public.ticket_events FOR SELECT
  USING (true);

-- Admin can manage ticket_events
CREATE POLICY "Admin can manage ticket_events"
  ON public.ticket_events FOR ALL
  USING (public.is_ticket_admin())
  WITH CHECK (public.is_ticket_admin());

-- Public can read visible ticket_types
CREATE POLICY "Public can read visible ticket_types"
  ON public.ticket_types FOR SELECT
  USING (visible = true);

-- Admin can manage ticket_types
CREATE POLICY "Admin can manage ticket_types"
  ON public.ticket_types FOR ALL
  USING (public.is_ticket_admin())
  WITH CHECK (public.is_ticket_admin());

-- Staff can read all tickets
CREATE POLICY "Staff can read tickets"
  ON public.tickets FOR SELECT
  USING (public.is_staff());

-- Staff can update tickets (for check-in)
CREATE POLICY "Staff can update tickets"
  ON public.tickets FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Staff can read/insert checkins
CREATE POLICY "Staff can read checkins"
  ON public.checkins FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can insert checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (public.is_staff());

-- Admin can manage staff_roles
CREATE POLICY "Admin can manage staff_roles"
  ON public.staff_roles FOR ALL
  USING (public.is_ticket_admin())
  WITH CHECK (public.is_ticket_admin());

-- Users can see their own staff role
CREATE POLICY "Users can see own staff_role"
  ON public.staff_roles FOR SELECT
  USING (user_id = auth.uid());