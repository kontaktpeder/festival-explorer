
-- 1) Scener per venue
CREATE TABLE IF NOT EXISTS public.venue_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_scenes_venue_id
  ON public.venue_scenes(venue_id);

ALTER TABLE public.venue_scenes ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can read scenes for venues they can see
CREATE POLICY "Anyone can read venue scenes"
  ON public.venue_scenes FOR SELECT
  TO authenticated
  USING (true);

-- RLS: venue owner or manager can manage scenes
CREATE POLICY "Venue manager can manage scenes"
  ON public.venue_scenes FOR ALL
  TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

-- Also allow public (anon) read for public venue pages
CREATE POLICY "Public can read venue scenes"
  ON public.venue_scenes FOR SELECT
  TO anon
  USING (true);

COMMENT ON TABLE public.venue_scenes IS
  'Scener/etasjer per venue. Arves til event og deretter kjøreplan.';

-- 2) Event peker på scene
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS scene_id uuid REFERENCES public.venue_scenes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.events.scene_id IS
  'Valgt scene innenfor venue. Arves til kjøreplan som standard.';
