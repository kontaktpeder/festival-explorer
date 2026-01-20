-- Fix access_invitations policy to avoid selecting from auth.users (causes permission denied)
-- PostgREST does a SELECT to return the inserted row (return=representation), so this policy must not touch auth.users.

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.access_invitations;

CREATE POLICY "Users can view their own invitations"
ON public.access_invitations
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  AND status = 'pending'
  AND expires_at > now()
);
