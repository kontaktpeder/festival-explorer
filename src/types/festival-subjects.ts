export type FestivalSubjectKind = "entity" | "persona";

export type FestivalSubjectSource =
  | "event_participant"
  | "event_legacy"
  | "festival_participant"
  | "program_slot";

export interface FestivalSubject {
  id: string;
  kind: FestivalSubjectKind;
  name: string;
  slug: string | null;
  source: FestivalSubjectSource;
  eventIds: string[];
}
