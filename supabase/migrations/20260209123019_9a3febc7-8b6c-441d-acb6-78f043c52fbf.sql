
-- Add internal ticket types (not visible to public, no stripe price)
INSERT INTO ticket_types (event_id, code, name, description, price_nok, capacity, visible, sort_order, currency)
SELECT 
  '619cb631-d0c5-4083-829d-141da8c51934'::uuid,
  v.code, v.name, v.description, v.price_nok, v.capacity, v.visible, v.sort_order, 'nok'
FROM (VALUES
  ('KOMPIS', 'Kompisbillett', 'Intern – gitt av arrangør', 0, 20, false, 10),
  ('LISTE', 'Gjesteliste', 'Intern – gjesteliste', 0, 15, false, 11),
  ('CREW', 'Crew', 'Intern – crew/frivillig', 0, 10, false, 12)
) AS v(code, name, description, price_nok, capacity, visible, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_types WHERE code = v.code AND event_id = '619cb631-d0c5-4083-829d-141da8c51934'::uuid
);

-- Update total event capacity to 320
UPDATE ticket_events SET capacity = 320 WHERE id = '619cb631-d0c5-4083-829d-141da8c51934';
