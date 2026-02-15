
-- 1. Ny kolonne på personas
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS allow_team_credit boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.personas.allow_team_credit IS
  'When true, name is shown in project/festival team lists where this persona is added. When false, shown as "Skjult".';

-- 2. RPC: festival team display names
CREATE OR REPLACE FUNCTION public.get_festival_team_member_display_names(
  p_festival_id uuid,
  p_zone text DEFAULT 'backstage'
)
RETURNS TABLE(participant_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fp.participant_id,
         CASE WHEN p.allow_team_credit THEN p.name ELSE 'Skjult' END AS display_name
  FROM public.festival_participants fp
  JOIN public.personas p ON p.id = fp.participant_id
  WHERE fp.festival_id = p_festival_id
    AND fp.zone = p_zone
    AND fp.participant_kind = 'persona';
$$;

-- 3. RPC: entity team display names
CREATE OR REPLACE FUNCTION public.get_entity_team_display_names(p_entity_id uuid)
RETURNS TABLE(entity_team_id uuid, user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT et.id AS entity_team_id,
         et.user_id,
         CASE
           WHEN et.persona_id IS NOT NULL AND p.id IS NOT NULL THEN
             CASE WHEN p.allow_team_credit THEN p.name ELSE 'Skjult' END
           ELSE 'Ukjent'
         END AS display_name
  FROM public.entity_team et
  LEFT JOIN public.personas p ON p.id = et.persona_id
  WHERE et.entity_id = p_entity_id
    AND et.left_at IS NULL;
$$;
