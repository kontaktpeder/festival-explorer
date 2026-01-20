-- 1. Create entity_visibility enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_visibility') THEN
    CREATE TYPE public.entity_visibility AS ENUM ('public', 'unlisted', 'private');
  END IF;
END $$;

-- 2. Add new columns to entities table
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS visibility public.entity_visibility NOT NULL DEFAULT 'public';

-- 3. Create entity_types config table
CREATE TABLE IF NOT EXISTS public.entity_types (
  key text PRIMARY KEY,
  label_nb text NOT NULL,
  icon_key text NOT NULL,
  admin_route text NOT NULL,
  public_route_base text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Seed existing entity types
INSERT INTO public.entity_types (key, label_nb, icon_key, admin_route, public_route_base, sort_order, capabilities)
VALUES
  ('venue', 'Spillested', 'building2', '/admin/entities', '/venue', 10, '{"has_capacity": true, "has_tech": true, "has_calendar": false}'::jsonb),
  ('solo', 'Soloartist', 'user', '/admin/entities', '/project', 20, '{"has_tracks": true, "has_rider": true}'::jsonb),
  ('band', 'Band', 'users', '/admin/entities', '/project', 30, '{"has_tracks": true, "has_rider": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  label_nb = EXCLUDED.label_nb,
  icon_key = EXCLUDED.icon_key,
  admin_route = EXCLUDED.admin_route,
  public_route_base = EXCLUDED.public_route_base,
  sort_order = EXCLUDED.sort_order,
  capabilities = EXCLUDED.capabilities;

-- 5. Enable RLS on entity_types
ALTER TABLE public.entity_types ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for entity_types
CREATE POLICY "Public read entity_types"
  ON public.entity_types FOR SELECT
  USING (true);

CREATE POLICY "Admin manage entity_types"
  ON public.entity_types FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Update existing RLS on entities to exclude system entities from public view
-- First, drop the existing public read policy
DROP POLICY IF EXISTS "Public can view published entities" ON public.entities;

-- Create new policy that filters out system entities
CREATE POLICY "Public can view published non-system entities"
  ON public.entities FOR SELECT
  USING (
    is_published = true 
    AND is_system = false 
    AND visibility = 'public'
  );

-- 8. Update platform entity to be a system entity
UPDATE public.entities
SET 
  is_system = true,
  visibility = 'private',
  is_published = false
WHERE slug = 'giggen-platform' OR name ILIKE 'GIGGEN Platform';