import type { TimelineEventType, TimelineVisibility } from "@/types/database";

export type TimelineSourceType = "project" | "entity" | "persona";

export type TimelineSource = {
  type: TimelineSourceType;
  id: string;
};

export type UnifiedTimelineEvent = {
  id: string;
  title: string;
  event_type: string;
  visibility: string;
  date?: string | null;
  date_to?: string | null;
  year?: number | null;
  year_to?: number | null;
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  media?: Array<{ type: "image" | "video"; url: string }> | null;
  created_at: string;
  updated_at: string;
  // Source-specific IDs
  project_id?: string;
  entity_id?: string;
  persona_id?: string;
};

export type EventTypeOption = {
  value: TimelineEventType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
