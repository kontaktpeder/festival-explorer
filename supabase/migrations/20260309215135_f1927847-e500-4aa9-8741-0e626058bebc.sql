
CREATE TABLE IF NOT EXISTS public.event_run_sheet_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  duration_minutes integer,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  scene_ids uuid[] NOT NULL DEFAULT '{}',
  default_slot_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

COMMENT ON TABLE public.event_run_sheet_defaults IS
  'Standard for kjøreplan per event. Brukes ved «Hent fra event» og nye rader.';

CREATE INDEX IF NOT EXISTS idx_event_run_sheet_defaults_event_id
  ON public.event_run_sheet_defaults(event_id);

CREATE TRIGGER event_run_sheet_defaults_updated_at
  BEFORE UPDATE ON public.event_run_sheet_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_run_sheet_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event editors can manage event_run_sheet_defaults"
  ON public.event_run_sheet_defaults FOR ALL TO authenticated
  USING (public.can_edit_event(event_id))
  WITH CHECK (public.can_edit_event(event_id));

CREATE POLICY "Festival team can manage event_run_sheet_defaults"
  ON public.event_run_sheet_defaults FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festival_events fe
      WHERE fe.event_id = event_run_sheet_defaults.event_id
      AND public.is_festival_team_member(fe.festival_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.festival_events fe
      WHERE fe.event_id = event_run_sheet_defaults.event_id
      AND public.is_festival_team_member(fe.festival_id)
    )
  );

CREATE POLICY "Admin full access on event_run_sheet_defaults"
  ON public.event_run_sheet_defaults FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
