// Database types matching Supabase schema

export interface Theme {
  id: string;
  name: string;
  hero_gradient?: string;
  texture_url?: string;
  accent_color?: string;
  font_preset?: 'industrial' | 'grotesk' | 'editorial';
  created_at: string;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  hero_image_url?: string;
  theme_id?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  theme?: Theme;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  hero_image_url?: string;
  capacity?: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_at: string;
  end_at?: string;
  hero_image_url?: string;
  venue_id?: string;
  status: 'draft' | 'published' | 'archived';
  ticket_url?: string;
  created_at: string;
  updated_at: string;
  venue?: Venue;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  hero_image_url?: string;
  profile_image_url?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role?: string;
  is_public: boolean;
  created_at: string;
  profile?: Profile;
}

export interface EventProject {
  id: string;
  event_id: string;
  project_id: string;
  billing_order: number;
  set_time?: string;
  created_at: string;
  project?: Project;
}

export interface FestivalEvent {
  id: string;
  festival_id: string;
  event_id: string;
  sort_order: number;
  created_at: string;
  event?: Event;
}
