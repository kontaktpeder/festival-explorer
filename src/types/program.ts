// src/types/program.ts

export type ProgramCategoryType = "lineup" | "events" | "profiler" | "slots";

export interface ProgramItem {
  id: string;
  label: string;
  href?: string | null;
  subtitle?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  slotKind?: string | null;
  zone?: string | null;
  meta?: Record<string, unknown>;
}

export interface ProgramCategory {
  id: string;
  label: string;
  type: ProgramCategoryType;
  items: ProgramItem[];
}
