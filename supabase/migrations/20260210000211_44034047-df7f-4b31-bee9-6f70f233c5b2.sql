
-- Live-oppsett: total kapasitet 320
-- Betalt: 250 (Earlybird 30 + Ordinær 150 + Festivalpass+BOILER 50 + BOILER only 20)
-- Intern: 70 (Liste 30 + Crew 10 + Musikere 30)

-- 1) Oppdater event-kapasitet
UPDATE public.ticket_events SET capacity = 320 WHERE slug = 'festival-2026';

-- 2) Slett gamle typer og sett inn nye (alle for festival-2026)
DELETE FROM public.ticket_types
WHERE event_id = (SELECT id FROM public.ticket_events WHERE slug = 'festival-2026' LIMIT 1);

INSERT INTO public.ticket_types (
  event_id, code, name, description, price_nok, capacity, visible, sort_order, stripe_price_id
)
SELECT e.id, v.code, v.name, v.description, v.price_nok, v.capacity, v.visible, v.sort_order, v.stripe_price_id
FROM public.ticket_events e
CROSS JOIN (VALUES
  ('EARLYBIRD', 'Festivalpass – Earlybird', 'Konserter (BOILER ROOM ikke inkludert)', 22900, 30, true, 1, NULL::text),
  ('ORDINAR', 'Festivalpass – Ordinær', 'Konserter', 28900, 150, true, 2, NULL::text),
  ('FESTIVALPASS_BOILER', 'Festivalpass + BOILER ROOM', 'Konserter inkl. BOILER ROOM', 38900, 50, true, 3, NULL::text),
  ('BOILER', 'BOILER ROOM', 'Kun BOILER ROOM etter konsertene', 22900, 20, true, 4, NULL::text),
  ('LISTE', 'Liste', 'Listeplass – opprettes med navn', 0, 30, false, 5, NULL::text),
  ('CREW', 'Crew', 'Crew og personale', 0, 10, false, 6, NULL::text),
  ('MUSIKERE', 'Musikere', 'Musikere', 0, 30, false, 7, NULL::text)
) AS v(code, name, description, price_nok, capacity, visible, sort_order, stripe_price_id)
WHERE e.slug = 'festival-2026';
