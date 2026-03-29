import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { resolveDuration, sectionAnchorDate, snapTo5Min } from "@/lib/runsheet-plan-time";
import type { EventProgramSection } from "@/types/program-sections";

/** Neste starttid for ny post: etter forrige slutt, eller +15 min, eller scopeStartAt, eller avrundet nå. */
export function computeNextSlotStartsAt(
  slots: ExtendedEventProgramSlot[],
  scopeStartAt?: string | null
): Date {
  if (!slots.length) {
    if (scopeStartAt) return new Date(scopeStartAt);
    const d = new Date();
    const m = d.getMinutes();
    d.setMinutes(Math.ceil(m / 5) * 5, 0, 0);
    return d;
  }
  const sorted = [...slots].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const last = sorted[sorted.length - 1];
  const start = new Date(last.starts_at).getTime();
  if (last.ends_at) return new Date(last.ends_at);
  if (last.duration_minutes != null && last.duration_minutes > 0) {
    return new Date(start + last.duration_minutes * 60000);
  }
  return new Date(start + 15 * 60000);
}

/**
 * Chain-based next start: compute end of last slot in section using
 * section anchor + cumulative durations, snapped to 5-min boundary.
 */
export function computeChainNextStart(
  slotsInSection: ExtendedEventProgramSlot[],
  section: EventProgramSection,
  scopeStartAt: string
): Date {
  const anchor = sectionAnchorDate(scopeStartAt, section.starts_at_local);
  if (!slotsInSection.length) return anchor;

  const sorted = [...slotsInSection].sort((a, b) => {
    const sa = a.sequence_number ?? Infinity;
    const sb = b.sequence_number ?? Infinity;
    if (sa !== sb) return sa - sb;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  let t = anchor.getTime();
  for (const s of sorted) {
    const dur = resolveDuration(s, 15);
    t += dur * 60000;
  }
  return snapTo5Min(new Date(t));
}

/** Should the "Advanced" collapsible be open initially for this slot? */
export function shouldOpenAdvancedInitially(slot: ExtendedEventProgramSlot): boolean {
  if (slot.slot_kind !== "custom") return true;
  const hasPerformer =
    !!slot.performer_entity_id ||
    !!slot.performer_persona_id ||
    (slot.performer_kind === "text" && !!slot.performer_name_override?.trim());
  if (hasPerformer) return true;
  if (slot.visibility === "public") return true;
  if (slot.is_visible_public) return true;
  if (slot.is_canceled) return true;
  if (slot.slot_type) return true;
  if (slot.event_id) return true;
  if (slot.internal_status === "canceled") return true;
  return false;
}

export function customRowTitle(slot: ExtendedEventProgramSlot): string {
  const t = slot.title_override?.trim();
  if (t) return t;
  return "Legg til hva som skjer";
}
