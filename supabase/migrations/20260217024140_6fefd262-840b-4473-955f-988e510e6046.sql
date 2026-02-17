
-- ============================================
-- EVENT PROGRAM SLOTS (MVP)
-- Tidslinje-slots på event-sider
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_program_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  slot_kind TEXT NOT NULL DEFAULT 'concert',
  is_canceled BOOLEAN NOT NULL DEFAULT false,
  internal_status TEXT NOT NULL DEFAULT 'confirmed',
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_program_slots IS 'Tidslinje-slots for event-program.';
COMMENT ON COLUMN public.event_program_slots.entity_id IS 'Kobles til artist/entity for concert/boiler slots.';
COMMENT ON COLUMN public.event_program_slots.internal_status IS 'Intern status for arrangør (ikke synlig for publikum).';
COMMENT ON COLUMN public.event_program_slots.internal_note IS 'Internt notat for arrangør.';

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_program_slots_event_starts
  ON public.event_program_slots(event_id, starts_at);

-- Updated_at trigger (set_updated_at already exists)
CREATE TRIGGER event_program_slots_updated_at
  BEFORE UPDATE ON public.event_program_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.event_program_slots ENABLE ROW LEVEL SECURITY;

-- Public: read slots for published events (hide internal fields in SELECT)
CREATE POLICY "Public read published event_program_slots"
ON public.event_program_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_program_slots.event_id
    AND e.status = 'published'::publish_status
  )
);

-- Admin full access
CREATE POLICY "Admin full access event_program_slots"
ON public.event_program_slots
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Event editors (via can_edit_event RPC) can manage slots
CREATE POLICY "Event editors manage event_program_slots"
ON public.event_program_slots
FOR ALL
USING (public.can_edit_event(event_id))
WITH CHECK (public.can_edit_event(event_id));
