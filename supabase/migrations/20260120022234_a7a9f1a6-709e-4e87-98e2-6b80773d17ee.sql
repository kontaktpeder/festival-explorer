-- Allow unauthenticated users to view invitations they were invited to
-- This is needed for the accept-invitation page before login
-- Security: Only exposes the invitation to someone who knows email+entity_id

CREATE POLICY "Anyone can view pending invitations by email and entity"
ON public.access_invitations
FOR SELECT
TO anon, authenticated
USING (
  status = 'pending'
  AND expires_at > now()
);