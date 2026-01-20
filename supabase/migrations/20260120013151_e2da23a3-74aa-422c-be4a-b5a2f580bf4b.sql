-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Team members can view their entities" ON public.entities;
DROP POLICY IF EXISTS "Entity team can update their entities" ON public.entities;

-- Create a SECURITY DEFINER function to check entity team membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_entity_team_member(p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entity_team
    WHERE entity_id = p_entity_id
      AND user_id = auth.uid()
      AND left_at IS NULL
  )
$$;

-- Recreate the policies using the security definer function
CREATE POLICY "Team members can view their entities" 
ON public.entities 
FOR SELECT 
USING (is_entity_team_member(id));

CREATE POLICY "Entity team can update their entities" 
ON public.entities 
FOR UPDATE 
USING (can_edit_entity(id))
WITH CHECK (can_edit_entity(id));