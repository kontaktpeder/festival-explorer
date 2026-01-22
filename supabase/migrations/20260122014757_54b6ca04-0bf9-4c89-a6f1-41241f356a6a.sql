-- Insert example event
INSERT INTO public.ticket_events (slug, name, starts_at, venue_name, capacity)
VALUES (
  'festival-2026',
  'GIGG Festival 2026',
  '2026-06-15 18:00:00+00',
  'Oslo Spektrum',
  1000
) ON CONFLICT (slug) DO NOTHING;

-- Get event ID and insert ticket types
DO $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM public.ticket_events WHERE slug = 'festival-2026';

  IF v_event_id IS NOT NULL THEN
    INSERT INTO public.ticket_types (
      event_id, code, name, description, price_nok, capacity, visible, sort_order
    ) VALUES
      (v_event_id, 'FEST_EARLYBIRD', 'Festivalpass Earlybird', 'Festivalpass inkluderer DJ afterparty', 50000, 200, true, 1),
      (v_event_id, 'FEST_STEP2', 'Festivalpass Steg 2', 'Festivalpass inkluderer DJ afterparty', 60000, 300, true, 2),
      (v_event_id, 'FEST_STEP3', 'Festivalpass Steg 3', 'Festivalpass inkluderer DJ afterparty', 70000, 500, true, 3),
      (v_event_id, 'DJ_ONLY', 'DJ Afterparty Only', 'Kun afterparty', 20000, 100, true, 4)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;