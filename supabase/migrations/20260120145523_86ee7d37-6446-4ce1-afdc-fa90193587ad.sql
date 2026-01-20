-- Fix RLS policy to allow anon users to view pending invitations
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view pending invitations by email and entity" ON access_invitations;

-- Create a new PERMISSIVE policy that allows anon and authenticated users to view pending invitations
CREATE POLICY "Anon can view pending invitations"
  ON access_invitations 
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'pending' 
    AND expires_at > now()
  );