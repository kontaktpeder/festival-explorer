-- Timeline events for projects (solo/band)

-- Create table
CREATE TABLE public.project_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('live_show', 'release', 'milestone', 'collaboration', 'media', 'award', 'personal_memory')),
  visibility text NOT NULL CHECK (visibility IN ('public', 'pro', 'private')) DEFAULT 'public',
  title text NOT NULL,
  description text NULL,
  date date NULL,
  year int NULL,
  location_name text NULL,
  city text NULL,
  country text NULL,
  media jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT date_or_year_required CHECK ((date IS NOT NULL) OR (year IS NOT NULL))
);

-- Indexes for performance
CREATE INDEX idx_project_timeline_project_id ON public.project_timeline_events(project_id);
CREATE INDEX idx_project_timeline_date ON public.project_timeline_events(date);
CREATE INDEX idx_project_timeline_year ON public.project_timeline_events(year);
CREATE INDEX idx_project_timeline_visibility ON public.project_timeline_events(visibility);

-- Updated_at trigger
CREATE TRIGGER update_project_timeline_events_updated_at
  BEFORE UPDATE ON public.project_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.project_timeline_events ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "Admin full access on project_timeline_events"
  ON public.project_timeline_events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public: Only visibility='public' events for published projects
CREATE POLICY "Public can view public timeline events"
  ON public.project_timeline_events FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public' 
    AND EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_timeline_events.project_id 
      AND projects.is_published = true
    )
  );