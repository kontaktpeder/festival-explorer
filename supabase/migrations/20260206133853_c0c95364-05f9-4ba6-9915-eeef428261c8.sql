
-- Create access_requests table
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  role_type text NOT NULL CHECK (role_type IN ('musician', 'organizer', 'technician', 'photographer', 'booking', 'other')),
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  admin_notes text
);

-- Indexes
CREATE INDEX idx_access_requests_status ON public.access_requests(status);
CREATE INDEX idx_access_requests_created_at ON public.access_requests(created_at DESC);
CREATE INDEX idx_access_requests_email ON public.access_requests(email);

-- RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public request form)
CREATE POLICY "Anyone can insert access requests"
  ON public.access_requests FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view access requests"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins can update
CREATE POLICY "Admins can update access requests"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin());
