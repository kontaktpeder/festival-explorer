
CREATE TABLE IF NOT EXISTS public.festival_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  zone text NOT NULL CHECK (zone IN ('backstage', 'host', 'crew', 'other')),
  participant_kind text NOT NULL CHECK (participant_kind IN ('persona', 'entity', 'project')),
  participant_id uuid NOT NULL,
  role_label text,
  sort_order int DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_festival_participants_festival_zone
  ON public.festival_participants(festival_id, zone, sort_order);

ALTER TABLE public.festival_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage festival_participants"
  ON public.festival_participants
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Public can read festival_participants"
  ON public.festival_participants
  FOR SELECT
  USING (true);
