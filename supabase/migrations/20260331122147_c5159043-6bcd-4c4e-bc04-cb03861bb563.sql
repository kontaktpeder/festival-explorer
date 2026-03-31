
-- =============================================================
-- Migration: Extend event_invitations for email-based actor invitations
-- and add indexes for event_participants zone
-- =============================================================

-- 1. Make entity_id nullable on event_invitations (was NOT NULL)
--    Existing entity-based invitations keep their entity_id,
--    new email-based ones will have entity_id = NULL
ALTER TABLE public.event_invitations ALTER COLUMN entity_id DROP NOT NULL;

-- 2. Add new columns for email-based invitation flow
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS token text;
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.event_invitations ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invitations_token
  ON public.event_invitations(token) WHERE token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_invitations_email_lower
  ON public.event_invitations(lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_invitations_pending_email_zone
  ON public.event_invitations(event_id, lower(email), zone)
  WHERE status = 'pending' AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_participants_zone
  ON public.event_participants(zone);
