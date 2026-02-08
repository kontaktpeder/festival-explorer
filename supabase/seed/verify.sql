-- NEW ROLE MODEL STEP 1.2 – VERIFY

-- Row counts
SELECT 'personas' AS tbl, count(*) AS n FROM public.personas
UNION ALL
SELECT 'entities', count(*) FROM public.entities
UNION ALL
SELECT 'entity_team', count(*) FROM public.entity_team
UNION ALL
SELECT 'entity_persona_bindings', count(*) FROM public.entity_persona_bindings
UNION ALL
SELECT 'events', count(*) FROM public.events
UNION ALL
SELECT 'event_participants', count(*) FROM public.event_participants;

-- Participants for Test Event Main
SELECT e.title, ep.zone, ep.participant_kind, ep.role_label, ep.sort_order
FROM public.events e
JOIN public.event_participants ep ON ep.event_id = e.id
WHERE e.slug = 'test-event-main'
ORDER BY ep.zone, ep.sort_order;

-- Event host entity
SELECT e.title, e.host_entity_id, en.name AS host_name, en.entity_kind
FROM public.events e
LEFT JOIN public.entities en ON en.id = e.host_entity_id
WHERE e.slug = 'test-event-main';
