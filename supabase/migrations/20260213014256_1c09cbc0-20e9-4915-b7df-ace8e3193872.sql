
-- Remove seed test data (Ola/Kari personas, Test Scene/Band/Solo, Test Event Main)

-- 1. event_participants for test event
DELETE FROM public.event_participants
WHERE event_id = 'c3333333-3333-3333-3333-333333333301'::uuid
   OR (participant_kind = 'persona' AND participant_id IN (
      'a1111111-1111-1111-1111-111111111101'::uuid,
      'a1111111-1111-1111-1111-111111111102'::uuid,
      'a1111111-1111-1111-1111-111111111103'::uuid,
      'a1111111-1111-1111-1111-111111111104'::uuid
   ))
   OR (participant_kind = 'entity' AND participant_id IN (
      'b2222222-2222-2222-2222-222222222201'::uuid,
      'b2222222-2222-2222-2222-222222222202'::uuid,
      'b2222222-2222-2222-2222-222222222203'::uuid
   ));

-- 2. Test event
DELETE FROM public.events WHERE id = 'c3333333-3333-3333-3333-333333333301'::uuid;

-- 3. entity_persona_bindings
DELETE FROM public.entity_persona_bindings
WHERE entity_id IN (
  'b2222222-2222-2222-2222-222222222201'::uuid,
  'b2222222-2222-2222-2222-222222222202'::uuid,
  'b2222222-2222-2222-2222-222222222203'::uuid
)
   OR persona_id IN (
  'a1111111-1111-1111-1111-111111111101'::uuid,
  'a1111111-1111-1111-1111-111111111102'::uuid,
  'a1111111-1111-1111-1111-111111111103'::uuid,
  'a1111111-1111-1111-1111-111111111104'::uuid
);

-- 4. entity_team
DELETE FROM public.entity_team
WHERE entity_id IN (
  'b2222222-2222-2222-2222-222222222201'::uuid,
  'b2222222-2222-2222-2222-222222222202'::uuid,
  'b2222222-2222-2222-2222-222222222203'::uuid
);

-- 5. Seed entities
DELETE FROM public.entities
WHERE id IN (
  'b2222222-2222-2222-2222-222222222201'::uuid,
  'b2222222-2222-2222-2222-222222222202'::uuid,
  'b2222222-2222-2222-2222-222222222203'::uuid
);

-- 6. Seed personas
DELETE FROM public.personas
WHERE id IN (
  'a1111111-1111-1111-1111-111111111101'::uuid,
  'a1111111-1111-1111-1111-111111111102'::uuid,
  'a1111111-1111-1111-1111-111111111103'::uuid,
  'a1111111-1111-1111-1111-111111111104'::uuid
);
