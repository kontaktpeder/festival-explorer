// Extended program slot types for festival run sheet

export type ProgramSlotVisibility = "public" | "internal";
export type ProgramSlotSource = "event" | "manual";

export type ProgramSlotTypeCategory =
  | "concert"
  | "break"
  | "doors"
  | "intro"
  | "technical"
  | "other";

export interface ProgramSlotType {
  id: string;
  festival_id: string;
  code: string;
  label: string;
  category: ProgramSlotTypeCategory;
  color: string;
  is_public_visible: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface ExtendedEventProgramSlot {
  id: string;
  event_id: string | null;
  festival_id: string | null;
  entity_id: string | null;
  starts_at: string;
  ends_at: string | null;
  slot_kind: string;
  slot_type: string | null;
  visibility: ProgramSlotVisibility;
  source: ProgramSlotSource;
  internal_status: string;
  internal_note: string | null;
  is_canceled: boolean;
  is_visible_public: boolean;
  contract_media_id: string | null;
  tech_rider_media_id: string | null;
  hosp_rider_media_id: string | null;
  created_at: string;
  updated_at: string;
  // Resolved relations
  entity?: { id: string; name: string; slug: string } | null;
  event?: { id: string; title: string; slug: string } | null;
}
