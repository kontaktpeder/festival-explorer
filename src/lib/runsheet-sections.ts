import type { ExtendedEventProgramSlot } from "@/types/program-slots";

/** Tre seksjoner: Opprigg, Lydprøve, Event */
export const RUNSHEET_SECTION_KEYS = ["Opprigg", "Lydprøve", "Event"] as const;
export type RunSheetSectionKey = (typeof RUNSHEET_SECTION_KEYS)[number];

export function getSectionForSlot(slot: ExtendedEventProgramSlot): RunSheetSectionKey {
  const kind = slot.slot_kind;
  if (kind === "rigging") return "Opprigg";
  if (kind === "soundcheck") return "Lydprøve";
  if (kind === "crew") return "Opprigg";
  const title = (slot.title_override ?? "").toUpperCase();
  if (slot.visibility === "internal" && title.includes("LYDPRØVE")) return "Lydprøve";
  if (slot.visibility === "internal" && (title.includes("OPPRIGG") || title.includes("RIGGING"))) return "Opprigg";
  return "Event";
}

/** Kind sort priority within Opprigg section: rigging first, then crew */
const OPPRIGG_SORT: Record<string, number> = {
  rigging: 0,
  crew: 1,
};

/** Slots gruppert i Opprigg, Lydprøve og Event */
export function groupSlotsBySection(
  slots: ExtendedEventProgramSlot[]
): Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> {
  const out: Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> = {
    Opprigg: [],
    Lydprøve: [],
    Event: [],
  };
  for (const slot of slots) {
    const key = getSectionForSlot(slot);
    out[key].push(slot);
  }
  RUNSHEET_SECTION_KEYS.forEach((key) => {
    out[key].sort((a, b) => {
      if (key === "Opprigg") {
        const ka = OPPRIGG_SORT[a.slot_kind] ?? 9;
        const kb = OPPRIGG_SORT[b.slot_kind] ?? 9;
        if (ka !== kb) return ka - kb;
      }
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  });
  return out;
}
