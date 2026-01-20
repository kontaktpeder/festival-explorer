-- ============================================
-- GIGGEN Entity Model Migration
-- Phase 1: Create enums, tables, functions
-- ============================================

-- 1. Create new enums
CREATE TYPE entity_type AS ENUM ('venue', 'solo', 'band');
CREATE TYPE access_level AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- 2. Create entities table (unified model for venues, solo, band)
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type entity_type NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  hero_image_url TEXT,
  address TEXT, -- For venues
  city TEXT, -- For venues
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_type ON public.entities(type);
CREATE INDEX idx_entities_slug ON public.entities(slug);
CREATE INDEX idx_entities_published ON public.entities(is_published);
CREATE INDEX idx_entities_created_by ON public.entities(created_by);

-- Updated_at trigger for entities
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create entity_team table (replaces project_members and venue_members)
CREATE TABLE public.entity_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access access_level NOT NULL DEFAULT 'viewer',
  role_labels TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ NULL,
  UNIQUE (entity_id, user_id)
);

CREATE INDEX idx_entity_team_entity_id ON public.entity_team(entity_id);
CREATE INDEX idx_entity_team_user_id ON public.entity_team(user_id);
CREATE INDEX idx_entity_team_access ON public.entity_team(access);

-- 4. Create access_invitations table
CREATE TABLE public.access_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access access_level NOT NULL CHECK (access != 'owner'),
  role_labels TEXT[] DEFAULT '{}',
  token TEXT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at TIMESTAMPTZ NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_invitations_entity_id ON public.access_invitations(entity_id);
CREATE INDEX idx_access_invitations_email ON public.access_invitations(email);
CREATE INDEX idx_access_invitations_token ON public.access_invitations(token);
CREATE INDEX idx_access_invitations_status ON public.access_invitations(status);

-- 5. Create event_entities table (replaces event_projects)
CREATE TABLE public.event_entities (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  billing_order INTEGER NOT NULL DEFAULT 0,
  feature_order INTEGER,
  is_featured BOOLEAN DEFAULT false,
  PRIMARY KEY (event_id, entity_id)
);

CREATE INDEX idx_event_entities_event_id ON public.event_entities(event_id);
CREATE INDEX idx_event_entities_entity_id ON public.event_entities(entity_id);
CREATE INDEX idx_event_entities_billing_order ON public.event_entities(billing_order);

-- 6. Create entity_timeline_events table (replaces project_timeline_events)
CREATE TABLE public.entity_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('live_show', 'release', 'milestone', 'collaboration', 'media', 'award', 'personal_memory')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'pro', 'private')) DEFAULT 'public',
  title TEXT NOT NULL,
  description TEXT NULL,
  date DATE NULL,
  year INT NULL,
  location_name TEXT NULL,
  city TEXT NULL,
  country TEXT NULL,
  media JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entity_timeline_date_or_year_required CHECK ((date IS NOT NULL) OR (year IS NOT NULL))
);

CREATE INDEX idx_entity_timeline_entity_id ON public.entity_timeline_events(entity_id);
CREATE INDEX idx_entity_timeline_date ON public.entity_timeline_events(date);
CREATE INDEX idx_entity_timeline_year ON public.entity_timeline_events(year);
CREATE INDEX idx_entity_timeline_visibility ON public.entity_timeline_events(visibility);

-- Updated_at trigger for entity_timeline_events
CREATE TRIGGER update_entity_timeline_events_updated_at
  BEFORE UPDATE ON public.entity_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. Access Helper Functions (SECURITY DEFINER)
-- ============================================

-- Check if user can edit entity (owner, admin, or editor)
CREATE OR REPLACE FUNCTION public.can_edit_entity(p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.entity_team
    WHERE entity_id = p_entity_id
      AND user_id = auth.uid()
      AND access IN ('owner', 'admin', 'editor')
      AND left_at IS NULL
  )
$$;

-- Check if user is entity admin/owner
CREATE OR REPLACE FUNCTION public.is_entity_admin(p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.entity_team
    WHERE entity_id = p_entity_id
      AND user_id = auth.uid()
      AND access IN ('owner', 'admin')
      AND left_at IS NULL
  )
$$;

-- Check if user is entity owner
CREATE OR REPLACE FUNCTION public.is_entity_owner(p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.entity_team
    WHERE entity_id = p_entity_id
      AND user_id = auth.uid()
      AND access = 'owner'
      AND left_at IS NULL
  )
$$;

-- Get user's entities (for dashboard)
CREATE OR REPLACE FUNCTION public.get_user_entities()
RETURNS TABLE(entity_id UUID, access access_level)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entity_id, access
  FROM public.entity_team
  WHERE user_id = auth.uid()
    AND left_at IS NULL
    AND access != 'viewer'
$$;

-- Auto-grant owner access when entity created
CREATE OR REPLACE FUNCTION public.auto_grant_entity_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.entity_team (
    entity_id,
    user_id,
    access,
    role_labels,
    is_public
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'owner',
    ARRAY['Eier'],
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_entity_created_grant_owner
  AFTER INSERT ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_entity_owner();

-- ============================================
-- 8. Enable RLS and Create Policies
-- ============================================

-- ENTITIES RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published entities"
  ON public.entities FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Team members can view their entities"
  ON public.entities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_team
      WHERE entity_team.entity_id = entities.id
      AND entity_team.user_id = auth.uid()
      AND entity_team.left_at IS NULL
    )
  );

CREATE POLICY "Admin full access on entities"
  ON public.entities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can create entities"
  ON public.entities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Entity team can update their entities"
  ON public.entities FOR UPDATE
  TO authenticated
  USING (public.can_edit_entity(id))
  WITH CHECK (public.can_edit_entity(id));

-- ENTITY_TEAM RLS
ALTER TABLE public.entity_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on entity_team"
  ON public.entity_team FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Team members can view their team"
  ON public.entity_team FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_edit_entity(entity_id)
  );

CREATE POLICY "Public can view public team members"
  ON public.entity_team FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND left_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.entities
      WHERE entities.id = entity_team.entity_id
      AND entities.is_published = true
    )
  );

CREATE POLICY "Entity admins can manage team"
  ON public.entity_team FOR INSERT
  TO authenticated
  WITH CHECK (public.is_entity_admin(entity_id));

CREATE POLICY "Entity admins can update team"
  ON public.entity_team FOR UPDATE
  TO authenticated
  USING (public.is_entity_admin(entity_id))
  WITH CHECK (public.is_entity_admin(entity_id));

CREATE POLICY "Entity admins can delete team members"
  ON public.entity_team FOR DELETE
  TO authenticated
  USING (public.is_entity_admin(entity_id));

-- ACCESS_INVITATIONS RLS
ALTER TABLE public.access_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on access_invitations"
  ON public.access_invitations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Entity admins can manage invitations"
  ON public.access_invitations FOR ALL
  TO authenticated
  USING (public.is_entity_admin(entity_id))
  WITH CHECK (public.is_entity_admin(entity_id));

CREATE POLICY "Users can view their own invitations"
  ON public.access_invitations FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  );

-- EVENT_ENTITIES RLS
ALTER TABLE public.event_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view event entities for published events"
  ON public.event_entities FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_entities.event_id
      AND events.status = 'published'
    )
  );

CREATE POLICY "Admin full access on event_entities"
  ON public.event_entities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Event owners can manage event entities"
  ON public.event_entities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_entities.event_id
      AND events.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_entities.event_id
      AND events.created_by = auth.uid()
    )
  );

-- ENTITY_TIMELINE_EVENTS RLS
ALTER TABLE public.entity_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public timeline events"
  ON public.entity_timeline_events FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM public.entities
      WHERE entities.id = entity_timeline_events.entity_id
      AND entities.is_published = true
    )
  );

CREATE POLICY "Team members can view their entity timeline"
  ON public.entity_timeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_team
      WHERE entity_team.entity_id = entity_timeline_events.entity_id
      AND entity_team.user_id = auth.uid()
      AND entity_team.left_at IS NULL
    )
  );

CREATE POLICY "Admin full access on entity_timeline_events"
  ON public.entity_timeline_events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Entity team can manage timeline"
  ON public.entity_timeline_events FOR ALL
  TO authenticated
  USING (public.can_edit_entity(entity_id))
  WITH CHECK (public.can_edit_entity(entity_id));

-- ============================================
-- 9. MIGRATE EXISTING DATA
-- ============================================

-- Migrate projects to entities
INSERT INTO public.entities (id, type, name, slug, tagline, description, hero_image_url, is_published, created_by, created_at, updated_at)
SELECT 
  id,
  CASE 
    WHEN type::text = 'solo' THEN 'solo'::entity_type
    WHEN type::text = 'band' THEN 'band'::entity_type
    ELSE 'solo'::entity_type
  END as type,
  name,
  slug,
  tagline,
  description,
  hero_image_url,
  is_published,
  created_by,
  created_at,
  updated_at
FROM public.projects
ON CONFLICT (slug) DO NOTHING;

-- Migrate venues to entities
INSERT INTO public.entities (id, type, name, slug, description, hero_image_url, address, city, is_published, created_by, created_at, updated_at)
SELECT 
  id,
  'venue'::entity_type as type,
  name,
  slug,
  description,
  hero_image_url,
  address,
  city,
  is_published,
  created_by,
  created_at,
  updated_at
FROM public.venues
ON CONFLICT (slug) DO NOTHING;

-- Migrate project_members to entity_team (disable trigger first to avoid duplicate owner inserts)
ALTER TABLE public.entities DISABLE TRIGGER on_entity_created_grant_owner;

INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, joined_at, left_at)
SELECT 
  project_id as entity_id,
  profile_id as user_id,
  CASE 
    WHEN is_admin THEN 'admin'::access_level
    ELSE 'editor'::access_level
  END as access,
  CASE 
    WHEN role_label IS NOT NULL THEN ARRAY[role_label]
    ELSE ARRAY[]::TEXT[]
  END as role_labels,
  is_public,
  joined_at,
  left_at
FROM public.project_members
WHERE EXISTS (SELECT 1 FROM public.entities WHERE id = project_members.project_id)
ON CONFLICT (entity_id, user_id) DO NOTHING;

-- Migrate venue_members to entity_team
INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, joined_at)
SELECT 
  venue_id as entity_id,
  profile_id as user_id,
  CASE 
    WHEN is_admin THEN 'admin'::access_level
    ELSE 'editor'::access_level
  END as access,
  ARRAY[]::TEXT[] as role_labels,
  is_public,
  now() as joined_at
FROM public.venue_members
WHERE EXISTS (SELECT 1 FROM public.entities WHERE id = venue_members.venue_id)
ON CONFLICT (entity_id, user_id) DO NOTHING;

-- Set original creators as owners
INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, joined_at)
SELECT 
  e.id as entity_id,
  e.created_by as user_id,
  'owner'::access_level as access,
  ARRAY['Eier']::TEXT[] as role_labels,
  false as is_public,
  e.created_at as joined_at
FROM public.entities e
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_team et 
  WHERE et.entity_id = e.id AND et.user_id = e.created_by
)
ON CONFLICT (entity_id, user_id) DO UPDATE SET access = 'owner';

-- Re-enable trigger
ALTER TABLE public.entities ENABLE TRIGGER on_entity_created_grant_owner;

-- Migrate project_timeline_events to entity_timeline_events
INSERT INTO public.entity_timeline_events (
  id, entity_id, event_type, visibility, title, description, 
  date, year, location_name, city, country, media, created_at, updated_at
)
SELECT 
  id,
  project_id as entity_id,
  event_type,
  visibility,
  title,
  description,
  date,
  year,
  location_name,
  city,
  country,
  media,
  created_at,
  updated_at
FROM public.project_timeline_events
WHERE EXISTS (SELECT 1 FROM public.entities WHERE id = project_timeline_events.project_id)
ON CONFLICT (id) DO NOTHING;

-- Migrate event_projects to event_entities
INSERT INTO public.event_entities (event_id, entity_id, billing_order, feature_order, is_featured)
SELECT 
  event_id,
  project_id as entity_id,
  billing_order,
  feature_order,
  is_featured
FROM public.event_projects
WHERE EXISTS (SELECT 1 FROM public.entities WHERE id = event_projects.project_id)
  AND EXISTS (SELECT 1 FROM public.events WHERE id = event_projects.event_id)
ON CONFLICT (event_id, entity_id) DO NOTHING;