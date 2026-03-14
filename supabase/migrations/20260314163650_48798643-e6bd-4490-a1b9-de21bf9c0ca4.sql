CREATE OR REPLACE FUNCTION public.can_scan_tickets_for_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.staff_roles sr
    WHERE sr.user_id = p_user_id AND sr.role IN ('admin', 'crew')
  )
  OR EXISTS (
    SELECT 1 FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE p.user_id = p_user_id
      AND fp.zone IN ('host', 'backstage')
      AND fp.can_scan_tickets = true
  )
$$;