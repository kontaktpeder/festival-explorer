
CREATE OR REPLACE FUNCTION public.can_access_media_any()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
    AND fp.can_access_media = true
  )
$$;
