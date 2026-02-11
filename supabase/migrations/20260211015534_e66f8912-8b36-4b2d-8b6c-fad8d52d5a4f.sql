
-- Nye tillatelser for billettkontroll
ALTER TABLE public.festival_participants
ADD COLUMN IF NOT EXISTS can_create_internal_ticket boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_see_report boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_see_revenue boolean DEFAULT false;

COMMENT ON COLUMN public.festival_participants.can_create_internal_ticket IS 'Kan opprette interne billetter';
COMMENT ON COLUMN public.festival_participants.can_see_report IS 'Kan se og eksportere rapport';
COMMENT ON COLUMN public.festival_participants.can_see_revenue IS 'Kan se inntekt, netto, Stripe-gebyrer';

-- RPC: Kan opprette internbillett
CREATE OR REPLACE FUNCTION public.can_create_internal_ticket_any()
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
    AND fp.can_create_internal_ticket = true
  )
$$;

-- RPC: Kan se rapport
CREATE OR REPLACE FUNCTION public.can_see_report_any()
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
    AND fp.can_see_report = true
  )
$$;

-- RPC: Kan se inntekt/penger
CREATE OR REPLACE FUNCTION public.can_see_revenue_any()
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
    AND fp.can_see_revenue = true
  )
$$;
