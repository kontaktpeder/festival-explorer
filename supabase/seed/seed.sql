-- NEW ROLE MODEL STEP 1.2 – SEED
-- Hardcoded test users:
--   test1:     1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9 (host/admin)
--   Livstreet: b95097b3-c425-43d5-a86e-2c241cd60644 (photographer/audience)

-- 1. Ensure profiles exist
INSERT INTO public.profiles (id, display_name)
VALUES
  ('1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'Test1'),
  ('b95097b3-c425-43d5-a86e-2c241cd60644', 'Livstreet')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 2. Personas (4) with type
INSERT INTO public.personas (id, user_id, name, slug, type, is_public, category_tags, show_email)
VALUES
  ('a1111111-1111-1111-1111-111111111101', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'Ola Musiker', 'ola-musiker', 'musician', true, '{}', false),
  ('a1111111-1111-1111-1111-111111111102', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'Ola Arrangør', 'ola-arranger', 'organizer', true, '{}', false),
  ('a1111111-1111-1111-1111-111111111103', 'b95097b3-c425-43d5-a86e-2c241cd60644', 'Kari Foto', 'kari-foto', 'photographer', true, '{}', false),
  ('a1111111-1111-1111-1111-111111111104', 'b95097b3-c425-43d5-a86e-2c241cd60644', 'Kari Publikum', 'kari-publikum', 'audience', false, '{}', false)
ON CONFLICT (slug) DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name;

-- 3. Entities: 1 host + 2 projects
INSERT INTO public.entities (id, type, entity_kind, name, slug, is_published, created_by)
VALUES
  ('b2222222-2222-2222-2222-222222222201', 'venue', 'host', 'Test Scene', 'test-scene', true, '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9'),
  ('b2222222-2222-2222-2222-222222222202', 'band', 'project', 'Test Band', 'test-band', true, '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9'),
  ('b2222222-2222-2222-2222-222222222203', 'solo', 'project', 'Test Solo', 'test-solo', true, '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9')
ON CONFLICT (slug) DO UPDATE SET entity_kind = EXCLUDED.entity_kind, name = EXCLUDED.name;

-- 4. entity_team (test1 = admin on all three)
INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public)
VALUES
  ('b2222222-2222-2222-2222-222222222201', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'admin', '{}', true),
  ('b2222222-2222-2222-2222-222222222202', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'admin', '{}', true),
  ('b2222222-2222-2222-2222-222222222203', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'admin', '{}', true)
ON CONFLICT DO NOTHING;

-- 5. entity_persona_bindings
INSERT INTO public.entity_persona_bindings (entity_id, persona_id, is_public, role_label)
VALUES
  ('b2222222-2222-2222-2222-222222222202', 'a1111111-1111-1111-1111-111111111101', true, 'Vokal'),
  ('b2222222-2222-2222-2222-222222222201', 'a1111111-1111-1111-1111-111111111102', true, 'Arrangør')
ON CONFLICT DO NOTHING;

-- 6. Event with host_entity_id
INSERT INTO public.events (id, title, slug, start_at, status, created_by, host_entity_id)
VALUES
  ('c3333333-3333-3333-3333-333333333301', 'Test Event Main', 'test-event-main', (now() + interval '1 day'), 'published', '1b5ba549-a84f-4a4e-afbe-672fe3ac9ef9', 'b2222222-2222-2222-2222-222222222201')
ON CONFLICT (slug) DO UPDATE SET host_entity_id = EXCLUDED.host_entity_id;

-- 7. event_participants: on_stage, backstage, host
INSERT INTO public.event_participants (event_id, zone, participant_kind, participant_id, role_label, sort_order, is_public)
VALUES
  ('c3333333-3333-3333-3333-333333333301', 'on_stage', 'entity', 'b2222222-2222-2222-2222-222222222202', null, 1, true),
  ('c3333333-3333-3333-3333-333333333301', 'on_stage', 'entity', 'b2222222-2222-2222-2222-222222222203', null, 2, true),
  ('c3333333-3333-3333-3333-333333333301', 'backstage', 'persona', 'a1111111-1111-1111-1111-111111111103', 'Foto', 1, true),
  ('c3333333-3333-3333-3333-333333333301', 'host', 'persona', 'a1111111-1111-1111-1111-111111111102', 'Arrangør', 1, true)
ON CONFLICT DO NOTHING;
