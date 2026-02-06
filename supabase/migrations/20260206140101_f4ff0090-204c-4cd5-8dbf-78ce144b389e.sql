-- Add email verification fields to access_requests
ALTER TABLE public.access_requests
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_sent_at timestamptz;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_verification_token 
  ON public.access_requests(verification_token) 
  WHERE verification_token IS NOT NULL;