-- Verify: no seed test data remains
SELECT 'personas' AS tbl, count(*) AS n FROM public.personas WHERE id::text LIKE 'a1111111-%'
UNION ALL
SELECT 'entities', count(*) FROM public.entities WHERE id::text LIKE 'b2222222-%'
UNION ALL
SELECT 'events', count(*) FROM public.events WHERE id = 'c3333333-3333-3333-3333-333333333301';
