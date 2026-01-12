-- 1. Create festival_sections table
CREATE TABLE public.festival_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID REFERENCES public.festivals(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hero', 'om', 'program', 'artister', 'venue-plakat', 'praktisk', 'footer')),
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  bg_image_url TEXT,
  bg_mode TEXT NOT NULL DEFAULT 'scroll' CHECK (bg_mode IN ('fixed', 'scroll')),
  overlay_strength DECIMAL(3,2) DEFAULT 0.3 CHECK (overlay_strength >= 0 AND overlay_strength <= 1),
  accent_override TEXT,
  is_enabled BOOLEAN DEFAULT true,
  content_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_festival_sections_festival_order ON public.festival_sections(festival_id, sort_order);

-- Enable RLS
ALTER TABLE public.festival_sections ENABLE ROW LEVEL SECURITY;

-- Public can read enabled sections for published festivals
CREATE POLICY "festival_sections_read" ON public.festival_sections
  FOR SELECT
  USING (
    is_enabled = true 
    AND EXISTS (
      SELECT 1 FROM public.festivals 
      WHERE festivals.id = festival_sections.festival_id 
      AND festivals.status = 'published'
    )
  );

-- Festival owner can manage sections
CREATE POLICY "festival_sections_owner_all" ON public.festival_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals 
      WHERE festivals.id = festival_sections.festival_id 
      AND festivals.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.festivals 
      WHERE festivals.id = festival_sections.festival_id 
      AND festivals.created_by = auth.uid()
    )
  );

-- 2. Extend event_projects with featured columns
ALTER TABLE public.event_projects 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_event_projects_featured ON public.event_projects(event_id, is_featured, feature_order);

-- 3. Extend festival_events with featured and program visibility
ALTER TABLE public.festival_events 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_in_program BOOLEAN DEFAULT true;

-- 4. Add trigger for updated_at on festival_sections
CREATE TRIGGER set_festival_sections_updated_at
  BEFORE UPDATE ON public.festival_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();