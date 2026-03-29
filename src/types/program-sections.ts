export type EventProgramPhaseType = "opprigg" | "lydprove" | "event";

export interface EventProgramSection {
  id: string;
  event_id: string | null;
  festival_id: string | null;
  type: EventProgramPhaseType;
  display_name: string | null;
  starts_at_local: string; // "HH:mm:ss" from Postgres time
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const PHASE_LABELS: Record<EventProgramPhaseType, string> = {
  opprigg: "Opprigg",
  lydprove: "Lydprøve",
  event: "Event",
};

export const PHASE_PREFIXES: Record<EventProgramPhaseType, string> = {
  opprigg: "O",
  lydprove: "L",
  event: "E",
};

export function displaySectionTitle(section: EventProgramSection): string {
  return section.display_name?.trim() || PHASE_LABELS[section.type];
}
