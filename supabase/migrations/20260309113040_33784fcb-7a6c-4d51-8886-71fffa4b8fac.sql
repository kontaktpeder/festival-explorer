
-- 1) program_slot_types: festival-specific custom slot types
CREATE TABLE public.program_slot_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  color text NOT NULL DEFAULT 'blue',
  is_public_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX program_slot_types_festival_code_uniq
  ON public.program_slot_types(festival_id, code);

ALTER TABLE public.program_slot_types ENABLE ROW LEVEL SECURITY;

-- RLS: festival editors can manage, team members can view
CREATE POLICY "Festival editors can manage program_slot_types"
  ON public.program_slot_types
  FOR ALL
  TO authenticated
  USING (public.can_edit_festival(festival_id))
  WITH CHECK (public.can_edit_festival(festival_id));

CREATE POLICY "Festival team can view program_slot_types"
  ON public.program_slot_types
  FOR SELECT
  TO authenticated
  USING (public.is_festival_team_member(festival_id));

-- 2) Extend event_program_slots with festival_id, visibility, source, slot_type, document links
ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS festival_id uuid REFERENCES public.festivals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS slot_type text,
  ADD COLUMN IF NOT EXISTS contract_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tech_rider_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hosp_rider_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL;

-- 3) Extend festivals with default document links
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS contract_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tech_rider_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hosp_rider_media_id uuid REFERENCES public.festival_media(id) ON DELETE SET NULL;
