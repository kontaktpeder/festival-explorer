import type { ExtendedEventProgramSlot } from "@/types/program-slots";

/**
 * Compute visual (chain) start times for a section of ordered slots.
 *
 * Each slot starts where the previous one ends (anchor + cumulative duration).
 * This does NOT write to the DB – it's used for display only.
 *
 * @param sectionStartsAt  - Anchor date for the section (event date + section starts_at_local)
 * @param orderedSlotIds   - Slot IDs in sequence order
 * @param slotsById        - Lookup map for slot data
 * @param fallbackDurationMin - Duration used when slot has no duration_minutes or ends_at (default 15)
 * @returns Map of slotId → computed visual start Date
 */
export function computeVisualStartsForSection(
  sectionStartsAt: Date,
  orderedSlotIds: string[],
  slotsById: Map<string, ExtendedEventProgramSlot>,
  fallbackDurationMin = 15
): Map<string, Date> {
  const out = new Map<string, Date>();
  let t = sectionStartsAt.getTime();

  for (const id of orderedSlotIds) {
    const s = slotsById.get(id);
    if (!s) continue;

    out.set(id, new Date(t));

    const dur = resolveDuration(s, fallbackDurationMin);
    t += dur * 60_000;
  }

  return out;
}

/**
 * Resolve effective duration in minutes for a slot.
 * Priority: duration_minutes > computed from ends_at-starts_at > fallback.
 */
export function resolveDuration(
  slot: ExtendedEventProgramSlot,
  fallbackMin = 15
): number {
  if (slot.duration_minutes && slot.duration_minutes > 0) return slot.duration_minutes;
  if (slot.ends_at) {
    const diff = Math.round(
      (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60_000
    );
    if (diff > 0) return diff;
  }
  return fallbackMin;
}

/**
 * Build section anchor Date from event start_at + section starts_at_local (HH:mm:ss).
 * If startsAtLocal is null/empty, falls back to the event start_at directly.
 */
export function sectionAnchorDate(eventStartAtIso: string, startsAtLocal: string | null | undefined): Date {
  const d = new Date(eventStartAtIso);
  if (!startsAtLocal || !startsAtLocal.trim()) {
    console.warn("[sectionAnchorDate] starts_at_local is empty — using event start_at as anchor");
    return d;
  }
  const parts = startsAtLocal.split(":").map(Number);
  if (parts.some(isNaN)) {
    console.warn("[sectionAnchorDate] Invalid starts_at_local:", startsAtLocal, "— using event start_at");
    return d;
  }
  d.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0);
  return d;
}

/**
 * Snap a Date to the nearest 5-minute boundary.
 */
export function snapTo5Min(d: Date): Date {
  const x = new Date(d);
  x.setSeconds(0, 0);
  const total = x.getHours() * 60 + x.getMinutes();
  const snapped = Math.round(total / 5) * 5;
  x.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return x;
}
