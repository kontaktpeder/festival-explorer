-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('entity', 'event', 'persona')),
  entity_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_entity ON public.deletion_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by ON public.deletion_requests(requested_by);

-- RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = requested_by OR public.is_admin());

-- Users can create deletion requests
CREATE POLICY "Users can create deletion requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- Only admins can update deletion requests
CREATE POLICY "Admins can update deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete deletion requests
CREATE POLICY "Admins can delete deletion requests"
  ON public.deletion_requests FOR DELETE
  USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER set_deletion_requests_updated_at
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();