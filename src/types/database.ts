// Database types matching Supabase schema
// These are simplified types for UI use - the actual DB types are in src/integrations/supabase/types.ts

// ============================================
// Image Crop/Focal Point Settings
// ============================================

/**
 * Image settings for focal point and crop data.
 * Used for avatars (1:1) and hero images (16:9).
 * 
 * focal_x: 0-1, horizontal position (0=left, 0.5=center, 1=right)
 * focal_y: 0-1, vertical position (0=top, 0.5=center, 1=bottom)
 * zoom: 1+, zoom level (1=no zoom)
 * 
 * To extend for gallery mode in the future, add additional fields:
 * - mode: 'avatar' | 'hero' | 'gallery' | 'custom'
 * - aspect_ratio: number (for custom modes)
 */
export interface ImageSettings {
  focal_x: number;
  focal_y: number;
  zoom?: number;
  aspect_ratio?: number; // Image's natural aspect ratio (width/height)
}

// Type-safe parser for JSONB image settings from Supabase
export function parseImageSettings(json: unknown): ImageSettings | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  if (typeof obj.focal_x !== 'number' || typeof obj.focal_y !== 'number') return null;
  return {
    focal_x: obj.focal_x,
    focal_y: obj.focal_y,
    zoom: typeof obj.zoom === 'number' ? obj.zoom : undefined,
    aspect_ratio: typeof obj.aspect_ratio === 'number' ? obj.aspect_ratio : undefined,
  };
}

// ============================================
// Enums
// ============================================

export type EntityType = 'venue' | 'solo' | 'band';
export type EntityKind = 'host' | 'project';
export type PersonaType = 'musician' | 'dj' | 'photographer' | 'video' | 'technician' | 'organizer' | 'audience' | 'volunteer' | 'manager';
export type EventParticipantZone = 'on_stage' | 'backstage' | 'host';
export type EventParticipantKind = 'persona' | 'project' | 'entity';
export type AccessLevel = 'owner' | 'admin' | 'editor' | 'viewer';
export type TimelineEventType = 
  // Persona/Artist categories
  | 'start_identity'           // Start & identitet
  | 'artistic_development'     // Kunstnerisk utvikling
  | 'collaboration'            // Samarbeid
  | 'milestone'                // Milepæler
  | 'live_performance'         // Live & opptreden
  | 'education'                // Utdanning
  | 'course_competence'        // Kurs & kompetanse
  | 'recognition'              // Anerkjennelse
  | 'transitions_life'         // Overganger & liv
  | 'present_direction'        // Nåtid & retning
  // Venue categories
  | 'establishment'            // Etablering & identitet
  | 'concept'                  // Konsept & retning
  | 'program'                  // Program & innhold
  | 'artists'                  // Kunstnere & øyeblikk
  | 'development'              // Ombygging & utvikling
  | 'pause'                    // Utfordringer & pauser
  | 'relaunch'                 // Gjenåpning & nye kapitler
  | 'focus_now';               // Nåtid & fokus
export type TimelineVisibility = 'public' | 'pro' | 'private';
// ============================================
// Platform Access (NEW - replaces Platform entity membership)
// ============================================

export interface PlatformAccess {
  id: string;
  user_id: string;
  access_level: AccessLevel;
  role_labels: string[];
  granted_by: string | null;
  granted_at: string;
  revoked_at?: string | null;
  updated_at: string;
}

// ============================================
// Personas (Public User Identities)
// ============================================

export interface Persona {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_image_settings?: unknown; // JSONB from DB, use parseImageSettings() to access
  category_tags: string[];
  type?: PersonaType | null; // NEW ROLE MODEL STEP 1
  is_public: boolean;
  allow_team_credit?: boolean; // default true; styrer visning i team-lister
  created_at: string;
  updated_at: string;
}

// ============================================
// Core Entity Model (NEW - replaces Project/Venue)
// ============================================

export interface Entity {
  id: string;
  type: EntityType;
  entity_kind?: string | null; // NEW ROLE MODEL STEP 1 – use inferEntityKind() for typed access
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  hero_image_settings?: unknown; // JSONB from DB, use parseImageSettings() to access
  address?: string | null; // For venues
  city?: string | null; // For venues
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EntityTeam {
  id: string;
  entity_id: string;
  user_id: string;
  access: AccessLevel;
  role_labels: string[];
  is_public: boolean;
  joined_at: string;
  left_at?: string | null;
  profile?: Profile | null;
}

export interface EntityTimelineEvent {
  id: string;
  entity_id: string;
  event_type: TimelineEventType;
  visibility: TimelineVisibility;
  title: string;
  description?: string | null;
  date?: string | null; // YYYY-MM-DD
  date_to?: string | null; // YYYY-MM-DD (end date for ranges)
  year?: number | null;
  year_to?: number | null; // End year for ranges
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
  media?: Array<{ type: 'image' | 'video'; url: string }> | null;
  created_at: string;
  updated_at: string;
  entity?: Entity | null;
}

export interface EventEntity {
  event_id: string;
  entity_id: string;
  billing_order: number;
  feature_order?: number | null;
  is_featured?: boolean | null;
  entity?: Entity | null;
}

export interface AccessInvitation {
  id: string;
  entity_id: string;
  email: string;
  access: AccessLevel;
  role_labels: string[];
  token?: string | null;
  invited_by: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string | null;
  invited_at: string;
  entity?: Entity | null;
}

export interface EntityPersonaBinding {
  id: string;
  entity_id: string;
  persona_id: string;
  is_public: boolean;
  role_label?: string | null;
  created_at: string;
  persona?: Persona | null;
  entity?: Entity | null;
}

// ============================================
// Legacy Types (kept for backwards compatibility)
// These will be deprecated once migration is complete
// ============================================

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

/** @deprecated Use Entity with type='venue' instead */
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
  hero_image_settings?: unknown; // JSONB from DB, use parseImageSettings() to access
  city?: string | null;
  venue_id?: string | null;
  host_entity_id?: string | null; // NEW ROLE MODEL STEP 1
  status: 'draft' | 'submitted' | 'published';
  created_by: string;
  created_at: string;
  updated_at: string;
  venue?: Partial<Venue> | null; // Partial venue to allow minimal venue info from joins
}

/** @deprecated Use Entity instead */
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

/** @deprecated Use EntityTeam instead */
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

/** @deprecated Use EventEntity instead */
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

/** @deprecated Use EntityTimelineEvent instead */
export interface ProjectTimelineEvent {
  id: string;
  project_id: string;
  event_type: TimelineEventType;
  visibility: TimelineVisibility;
  title: string;
  description: string | null;
  date: string | null; // YYYY-MM-DD
  year: number | null;
  location_name: string | null;
  city: string | null;
  country: string | null;
  media: Array<{ type: 'image' | 'video'; url: string }> | null;
  created_at: string;
  updated_at: string;
  project?: Project | null;
}

// ============================================
// Helper type for Entity with team included
// ============================================

export interface EntityWithTeam extends Entity {
  team: EntityTeam[];
}

export interface EntityWithAccess extends Entity {
  access: AccessLevel;
  persona_id?: string | null;
}

// ============================================
// NEW ROLE MODEL STEP 1: Event Participants
// ============================================

export interface EventParticipant {
  id: string;
  event_id: string;
  zone: EventParticipantZone;
  participant_kind: EventParticipantKind;
  participant_id: string;
  role_label?: string | null;
  sort_order: number;
  start_at?: string | null;
  end_at?: string | null;
  is_public: boolean;
  created_at: string;
  // Resolved references (populated by hooks)
  entity?: Entity | null;
  persona?: Persona | null;
}

// ============================================
// Program Slots
// ============================================

export type SlotKind =
  | 'concert'
  | 'boiler'
  | 'break'
  | 'giggen_info'
  | 'doors'
  | 'closing'
  | 'stage_talk';

export type InternalSlotStatus = 'contract_pending' | 'confirmed' | 'canceled';

export interface EventProgramSlot {
  id: string;
  event_id: string;
  entity_id: string | null;
  starts_at: string;
  ends_at: string | null;
  slot_kind: SlotKind;
  is_canceled: boolean;
  internal_status: InternalSlotStatus;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
  // Resolved entity (populated by hooks)
  entity?: { id: string; name: string; slug: string; tagline?: string | null; hero_image_url?: string | null; type?: string } | null;
}
