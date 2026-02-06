
-- 1. Create user_contact_info table
CREATE TABLE public.user_contact_info (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text,
  contact_email text,
  contact_phone text,
  use_as_default boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_contact_info_user_id ON public.user_contact_info(user_id);

ALTER TABLE public.user_contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own contact info"
ON public.user_contact_info FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "user can update own contact info"
ON public.user_contact_info FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can insert own contact info"
ON public.user_contact_info FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin can read all contact info"
ON public.user_contact_info FOR SELECT
USING (public.is_admin());

-- 2. Create contact_requests table
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('opened_mailto')),
  recipient_persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_phone text,
  mode text NOT NULL CHECK (mode IN ('free', 'template')),
  subject text,
  message text NOT NULL,
  template_payload jsonb
);

CREATE INDEX idx_contact_requests_created_at ON public.contact_requests(created_at DESC);
CREATE INDEX idx_contact_requests_recipient_persona_id ON public.contact_requests(recipient_persona_id);
CREATE INDEX idx_contact_requests_status ON public.contact_requests(status);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow public insert contact requests"
ON public.contact_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "admin can read all contact requests"
ON public.contact_requests FOR SELECT
USING (public.is_admin());

-- 3. Add show_email and public_email to personas
ALTER TABLE public.personas
ADD COLUMN show_email boolean NOT NULL DEFAULT false,
ADD COLUMN public_email text;
