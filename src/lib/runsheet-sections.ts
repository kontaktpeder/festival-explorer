import type { ExtendedEventProgramSlot } from "@/types/program-slots";

/** Kun to seksjoner – Opprigg & intern er blandet inn i Lydprøver og Event */
export const RUNSHEET_SECTION_KEYS = ["Lydprøver", "Event"] as const;
export type RunSheetSectionKey = (typeof RUNSHEET_SECTION_KEYS)[number];

export function getSectionForSlot(slot: ExtendedEventProgramSlot): RunSheetSectionKey {
  const kind = slot.slot_kind;
  const title = (slot.title_override ?? "").toUpperCase();
  if (
    kind === "soundcheck" ||
    kind === "rigging" ||
    (slot.visibility === "internal" && title.includes("LYDPRØVE"))
  ) return "Lydprøver";
  return "Event";
}

/** Slots gruppert i Lydprøver og Event */
export function groupSlotsBySection(
  slots: ExtendedEventProgramSlot[]
): Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> {
  const out: Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> = {
    Lydprøver: [],
    Event: [],
  };
  for (const slot of slots) {
    const key = getSectionForSlot(slot);
    out[key].push(slot);
  }
  RUNSHEET_SECTION_KEYS.forEach((key) => {
    out[key].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  });
  return out;
}
