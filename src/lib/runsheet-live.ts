import type { ExtendedEventProgramSlot } from "@/types/program-slots";

export type LiveStatus = "not_started" | "in_progress" | "completed" | "cancelled";
export type LiveAction = "start" | "complete" | "delay5" | "cancel";

export interface EffectiveTime {
  effectiveStart: Date;
  effectiveEnd: Date | null;
}

/**
 * Compute effective (delay-propagated) start/end for each slot.
 *
 * Groups are sorted by plan start. For each group:
 *   groupDelay = max(delay_minutes across items)
 *   effectiveStart = plan_start + accumulatedDelay (from previous groups)
 * After processing, accumulatedDelay += groupDelay for the next group.
 */
export function computeEffectiveTimeline(
  slots: ExtendedEventProgramSlot[]
): Map<string, EffectiveTime> {
  const result = new Map<string, EffectiveTime>();
  if (!slots.length) return result;

  interface Group {
    items: ExtendedEventProgramSlot[];
    planStartMs: number;
  }

  const groupMap = new Map<string, ExtendedEventProgramSlot[]>();
  const groups: Group[] = [];

  for (const s of slots) {
    if (s.parallel_group_id) {
      const arr = groupMap.get(s.parallel_group_id) || [];
      arr.push(s);
      groupMap.set(s.parallel_group_id, arr);
    } else {
      groups.push({ items: [s], planStartMs: new Date(s.starts_at).getTime() });
    }
  }

  for (const [, arr] of groupMap) {
    const planStartMs = Math.min(...arr.map((s) => new Date(s.starts_at).getTime()));
    groups.push({ items: arr, planStartMs });
  }

  groups.sort((a, b) => a.planStartMs - b.planStartMs);

  let accumulatedDelayMs = 0;

  for (const group of groups) {
    const groupDelay = Math.max(...group.items.map((s) => s.delay_minutes ?? 0), 0);

    for (const slot of group.items) {
      const planStartMs = new Date(slot.starts_at).getTime();
      const effectiveStartMs = planStartMs + accumulatedDelayMs;
      const effectiveStart = new Date(effectiveStartMs);

      let effectiveEnd: Date | null = null;
      if (slot.ends_at) {
        effectiveEnd = new Date(new Date(slot.ends_at).getTime() + accumulatedDelayMs);
      } else if (slot.duration_minutes) {
        effectiveEnd = new Date(effectiveStartMs + slot.duration_minutes * 60000);
      }

      result.set(slot.id, { effectiveStart, effectiveEnd });
    }

    accumulatedDelayMs += groupDelay * 60000;
  }

  return result;
}

/** Get display label for live status */
export function getLiveStatusLabel(status: LiveStatus): string {
  switch (status) {
    case "in_progress":
      return "LIVE";
    case "completed":
      return "FERDIG";
    case "cancelled":
      return "AVLYST";
    default:
      return "VENTER";
  }
}
