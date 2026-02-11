
CREATE OR REPLACE FUNCTION public.get_my_festivals_as_team()
RETURNS SETOF public.festivals
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
  FROM public.festivals f
  WHERE public.is_festival_team_member(f.id)
  AND NOT public.is_admin()
  ORDER BY f.start_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_my_festivals_as_team() IS 
  'Festivaler brukeren har tilgang til via festival_participants (persona host/backstage), uten admin-bonus. Brukes for forhåndsvisning og for rene festivalteam-brukere.';
