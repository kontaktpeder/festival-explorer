-- Create persona_timeline_events table (mirrors entity_timeline_events structure)
CREATE TABLE public.persona_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  year INTEGER,
  location_name TEXT,
  city TEXT,
  country TEXT,
  media JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.persona_timeline_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view public persona timeline events"
ON public.persona_timeline_events
FOR SELECT
USING (
  visibility = 'public' 
  AND EXISTS (
    SELECT 1 FROM personas 
    WHERE personas.id = persona_timeline_events.persona_id 
    AND personas.is_public = true
  )
);

CREATE POLICY "Persona owners can manage their timeline"
ON public.persona_timeline_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM personas 
    WHERE personas.id = persona_timeline_events.persona_id 
    AND personas.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM personas 
    WHERE personas.id = persona_timeline_events.persona_id 
    AND personas.user_id = auth.uid()
  )
);

CREATE POLICY "Admin full access on persona_timeline_events"
ON public.persona_timeline_events
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_persona_timeline_events_updated_at
BEFORE UPDATE ON public.persona_timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();