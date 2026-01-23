-- Drop existing constraint on entity_timeline_events
ALTER TABLE public.entity_timeline_events
DROP CONSTRAINT IF EXISTS entity_timeline_events_event_type_check;

-- Add new constraint with all categories (persona + venue)
ALTER TABLE public.entity_timeline_events
ADD CONSTRAINT entity_timeline_events_event_type_check 
CHECK (event_type IN (
  -- Persona categories
  'start_identity',
  'artistic_development',
  'collaboration',
  'milestone',
  'live_performance',
  'education',
  'course_competence',
  'recognition',
  'transitions_life',
  'present_direction',
  -- Venue categories
  'establishment',
  'concept',
  'program',
  'artists',
  'development',
  'pause',
  'relaunch',
  'focus_now'
));