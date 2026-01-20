-- Fix RLS policies for access_invitations to allow admin access
-- The issue is that RESTRICTIVE policies require ALL to match,
-- but admin should have full access regardless

-- First, drop the restrictive admin policy
DROP POLICY IF EXISTS "Admin full access on access_invitations" ON public.access_invitations;

-- Create a PERMISSIVE admin policy (default behavior)
CREATE POLICY "Admin full access on access_invitations"
ON public.access_invitations
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Also need to add policy for entity admins to INSERT (they can manage invitations)
-- The current policy is restrictive which is wrong

DROP POLICY IF EXISTS "Entity admins can manage invitations" ON public.access_invitations;

-- Create PERMISSIVE policy for entity admins
CREATE POLICY "Entity admins can manage invitations"
ON public.access_invitations
FOR ALL
TO authenticated
USING (is_entity_admin(entity_id))
WITH CHECK (is_entity_admin(entity_id));

-- Drop and recreate the user view policy as PERMISSIVE too
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.access_invitations;

CREATE POLICY "Users can view their own invitations"
ON public.access_invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > now()
);