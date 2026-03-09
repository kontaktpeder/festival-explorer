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

/** Type for "På scenen"-modus */
export type PerformerKind = "entity" | "persona" | "text";

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

  /** Run sheet fields */
  title_override: string | null;
  stage_label: string | null;
  duration_minutes: number | null;
  sequence_number: number | null;

  /** Parallel group – slots sharing this ID run simultaneously */
  parallel_group_id: string | null;

  /** Performer fields for "På scenen" */
  performer_kind: PerformerKind;
  performer_entity_id: string | null;
  performer_persona_id: string | null;
  performer_name_override: string | null;

  created_at: string;
  updated_at: string;

  // Resolved relations
  entity?: { id: string; name: string; slug: string } | null;
  event?: { id: string; title: string; slug: string } | null;

  performer_entity?: { id: string; name: string; slug: string; is_published: boolean } | null;
  performer_persona?: { id: string; name: string; slug: string; is_public: boolean } | null;
}
