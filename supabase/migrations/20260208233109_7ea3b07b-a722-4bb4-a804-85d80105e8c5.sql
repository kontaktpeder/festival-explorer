
-- ============================================
-- NEW ROLE MODEL STEP 1
-- Adds entity_kind, persona.type, host_entity_id, and event_participants
-- ============================================

-- 1. Entity kind: classify entities as 'host' or 'project'
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS entity_kind TEXT CHECK (entity_kind IN ('host', 'project'));

-- Backfill existing entities based on type
UPDATE public.entities 
SET entity_kind = CASE WHEN type::text = 'venue' THEN 'host' ELSE 'project' END 
WHERE entity_kind IS NULL;

-- 2. Persona type: what kind of person is this?
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'personas' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.personas ADD COLUMN type TEXT CHECK (type IN (
      'musician', 'dj', 'photographer', 'video', 'technician', 
      'organizer', 'audience', 'volunteer', 'manager'
    ));
  END IF;
END $$;

-- 3. Event host: link events to host entity (replaces venue_id conceptually)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS host_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_host_entity_id ON public.events(host_entity_id);

-- 4. Event participants: the new unified lineup/crew/host table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  zone TEXT NOT NULL CHECK (zone IN ('on_stage', 'backstage', 'host')),
  participant_kind TEXT NOT NULL CHECK (participant_kind IN ('persona', 'project', 'entity')),
  participant_id UUID NOT NULL,
  role_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_participant ON public.event_participants(participant_kind, participant_id);

-- 5. RLS for event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Public can read public participants of published events
CREATE POLICY "Public read published event_participants"
ON public.event_participants
FOR SELECT
USING (
  is_public = true 
  AND EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_participants.event_id 
    AND events.status = 'published'::publish_status
  )
);

-- Admin full access
CREATE POLICY "Admin full access event_participants"
ON public.event_participants
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Event owners (host entity admins) can manage participants
CREATE POLICY "Event owner manage participants"
ON public.event_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_participants.event_id
    AND (
      e.created_by = auth.uid()
      OR (e.host_entity_id IS NOT NULL AND public.is_entity_admin(e.host_entity_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_participants.event_id
    AND (
      e.created_by = auth.uid()
      OR (e.host_entity_id IS NOT NULL AND public.is_entity_admin(e.host_entity_id))
    )
  )
);
