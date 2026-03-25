import type { LiveRolePreset } from "@/types/live-role";

export type FieldKey =
  | "starts_at"
  | "ends_at"
  | "duration_minutes"
  | "title_override"
  | "stage_label"
  | "internal_note"
  | "live_note"
  | "slot_kind"
  | "slot_type"
  | "sequence_number"
  | "event_id"
  | "performer_kind"
  | "performer_entity_id"
  | "performer_persona_id"
  | "performer_name_override"
  | "tech_rider_asset_id"
  | "tech_rider_media_id"
  | "hosp_rider_asset_id"
  | "hosp_rider_media_id"
  | "contract_media_id"
  | "visibility"
  | "internal_status"
  | "is_visible_public"
  | "is_canceled"
  | "parallel_group_id"
  | "live_status"
  | "actual_started_at"
  | "actual_ended_at"
  | "delay_minutes"
  | "completed_at";

export type ViewSurface =
  | "production"
  | "live_viewer"
  | "live_crew"
  | "live_editor"
  | "live_admin";

export type RenderMode = "hidden" | "badge" | "readonly" | "editable";

export const FIELD_VIEW_MATRIX: Record<FieldKey, Record<ViewSurface, RenderMode>> = {
  starts_at:               { production: "editable", live_viewer: "readonly", live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  ends_at:                 { production: "editable", live_viewer: "readonly", live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  duration_minutes:        { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  title_override:          { production: "editable", live_viewer: "hidden",   live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  stage_label:             { production: "editable", live_viewer: "hidden",   live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  internal_note:           { production: "editable", live_viewer: "hidden",   live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  live_note:               { production: "hidden",   live_viewer: "hidden",   live_crew: "readonly", live_editor: "editable", live_admin: "editable" },
  slot_kind:               { production: "editable", live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  slot_type:               { production: "editable", live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  sequence_number:         { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  event_id:                { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  performer_kind:          { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  performer_entity_id:     { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  performer_persona_id:    { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  performer_name_override: { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  tech_rider_asset_id:     { production: "badge",    live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  tech_rider_media_id:     { production: "hidden",   live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  hosp_rider_asset_id:     { production: "badge",    live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  hosp_rider_media_id:     { production: "hidden",   live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  contract_media_id:       { production: "badge",    live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  visibility:              { production: "editable", live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  internal_status:         { production: "editable", live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  is_visible_public:       { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  is_canceled:             { production: "editable", live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "editable" },
  parallel_group_id:       { production: "editable", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "hidden",   live_admin: "hidden" },
  live_status:             { production: "badge",    live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  actual_started_at:       { production: "readonly", live_viewer: "readonly", live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  actual_ended_at:         { production: "readonly", live_viewer: "hidden",   live_crew: "readonly", live_editor: "readonly", live_admin: "readonly" },
  delay_minutes:           { production: "badge",    live_viewer: "hidden",   live_crew: "badge",    live_editor: "badge",    live_admin: "badge" },
  completed_at:            { production: "readonly", live_viewer: "hidden",   live_crew: "hidden",   live_editor: "readonly", live_admin: "readonly" },
};

/** Action permissions per live role */
export const LIVE_ACTIONS = {
  viewer: { start: false, delay5: false, complete: false, cancel: false, editLiveNote: false },
  crew:   { start: false, delay5: false, complete: false, cancel: false, editLiveNote: false },
  editor: { start: true,  delay5: true,  complete: true,  cancel: false, editLiveNote: true },
  admin:  { start: true,  delay5: true,  complete: true,  cancel: true,  editLiveNote: true },
} as const;

/** Map a LiveRolePreset to its ViewSurface key */
export function roleToSurface(role: LiveRolePreset): ViewSurface {
  const map: Record<LiveRolePreset, ViewSurface> = {
    viewer: "live_viewer",
    crew: "live_crew",
    editor: "live_editor",
    admin: "live_admin",
  };
  return map[role];
}

/** Get the render mode for a specific field on a given surface */
export function getFieldMode(field: FieldKey, surface: ViewSurface): RenderMode {
  return FIELD_VIEW_MATRIX[field][surface];
}

/** Check if a field should be visible (anything other than hidden) */
export function isFieldVisible(field: FieldKey, surface: ViewSurface): boolean {
  return FIELD_VIEW_MATRIX[field][surface] !== "hidden";
}

/** Check if a field renders as a badge */
export function isFieldBadge(field: FieldKey, surface: ViewSurface): boolean {
  return FIELD_VIEW_MATRIX[field][surface] === "badge";
}

/** Get all allowed actions for a role */
export function getLiveActions(role: LiveRolePreset) {
  return LIVE_ACTIONS[role];
}
