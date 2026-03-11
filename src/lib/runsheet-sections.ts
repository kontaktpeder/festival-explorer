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
    kind === "crew" ||
    (slot.visibility === "internal" && title.includes("LYDPRØVE"))
  ) return "Lydprøver";
  return "Event";
}

/** Kind sort priority within Lydprøver section: soundcheck first, then rigging, then crew */
const KIND_SORT_ORDER: Record<string, number> = {
  soundcheck: 0,
  rigging: 1,
  crew: 2,
};

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
    out[key].sort((a, b) => {
      // Within Lydprøver: soundcheck first, rigging second, crew last
      if (key === "Lydprøver") {
        const ka = KIND_SORT_ORDER[a.slot_kind] ?? 9;
        const kb = KIND_SORT_ORDER[b.slot_kind] ?? 9;
        if (ka !== kb) return ka - kb;
      }
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  });
  return out;
}
