-- ============================================
-- ADMIN ROLLE-SYSTEM (SIKKER IMPLEMENTASJON)
-- ============================================

-- 1. Opprett enum for roller
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Opprett user_roles tabell
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Aktiver RLS på user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Opprett SECURITY DEFINER funksjon for rollesjekk
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Shortcut-funksjon for å sjekke om nåværende bruker er admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- ============================================
-- ADMIN RLS POLICIES FOR ALLE TABELLER
-- ============================================

-- FESTIVAL_SECTIONS
CREATE POLICY "Admin full access on festival_sections"
  ON public.festival_sections FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- VENUES
CREATE POLICY "Admin full access on venues"
  ON public.venues FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROJECTS
CREATE POLICY "Admin full access on projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- EVENTS
CREATE POLICY "Admin full access on events"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- MEDIA
CREATE POLICY "Admin full access on media"
  ON public.media FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- FESTIVALS
CREATE POLICY "Admin full access on festivals"
  ON public.festivals FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- FESTIVAL_EVENTS
CREATE POLICY "Admin full access on festival_events"
  ON public.festival_events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- EVENT_PROJECTS
CREATE POLICY "Admin full access on event_projects"
  ON public.event_projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- THEMES
CREATE POLICY "Admin full access on themes"
  ON public.themes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROFILES (admin kan lese og oppdatere alle profiler)
CREATE POLICY "Admin full access on profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- USER_ROLES (kun admins kan administrere roller)
CREATE POLICY "Admin can manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STORAGE: Media bucket
CREATE POLICY "Admin full access on media storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());