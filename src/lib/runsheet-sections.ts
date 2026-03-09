import type { ExtendedEventProgramSlot } from "@/types/program-slots";

/** Kun disse tre seksjonene finnes – unike og trygge for sletting/utskrift */
export const RUNSHEET_SECTION_KEYS = ["Opprigg & intern", "Lydprøver", "Event"] as const;
export type RunSheetSectionKey = (typeof RUNSHEET_SECTION_KEYS)[number];

export function getSectionForSlot(slot: ExtendedEventProgramSlot): RunSheetSectionKey {
  const kind = slot.slot_kind;
  const title = (slot.title_override ?? "").toUpperCase();
  if (
    kind === "soundcheck" ||
    (slot.visibility === "internal" && title.includes("LYDPRØVE"))
  ) return "Lydprøver";
  if (
    slot.visibility === "internal" &&
    (kind === "rigging" || kind === "break" || !slot.entity_id)
  ) return "Opprigg & intern";
  return "Event";
}

/** Slots gruppert i de tre faste seksjonene */
export function groupSlotsBySection(
  slots: ExtendedEventProgramSlot[]
): Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> {
  const out: Record<RunSheetSectionKey, ExtendedEventProgramSlot[]> = {
    "Opprigg & intern": [],
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
