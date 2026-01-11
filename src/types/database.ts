// Database types matching Supabase schema
// These are simplified types for UI use - the actual DB types are in src/integrations/supabase/types.ts

export interface Theme {
  id: string;
  name: string;
  hero_image_url?: string | null;
  texture_preset: 'grain_dark' | 'grain_blue' | 'paper_offwhite';
  accent_color?: string | null;
  font_preset: 'industrial' | 'grotesk' | 'editorial';
  created_at: string;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  venue_id?: string | null;
  theme_id?: string | null;
  status: 'draft' | 'submitted' | 'published';
  created_by: string;
  created_at: string;
  updated_at: string;
  theme?: Theme | null;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  hero_image_url?: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  hero_image_url?: string | null;
  city?: string | null;
  venue_id?: string | null;
  status: 'draft' | 'submitted' | 'published';
  created_by: string;
  created_at: string;
  updated_at: string;
  venue?: Venue | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  type: 'solo' | 'band';
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  handle?: string | null;
  slug?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  profile_id: string;
  role_label?: string | null;
  is_admin: boolean;
  is_public: boolean;
  joined_at: string;
  left_at?: string | null;
  profile?: Profile | null;
}

export interface EventProject {
  event_id: string;
  project_id: string;
  billing_order: number;
  project?: Project | null;
}

export interface FestivalEvent {
  festival_id: string;
  event_id: string;
  sort_order: number;
  event?: Event | null;
}
