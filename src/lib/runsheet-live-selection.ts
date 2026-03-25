import type { LiveCardItem } from "./runsheet-live-view-model";

export interface LiveSelection {
  now: LiveCardItem[];
  next: LiveCardItem[];
  later: LiveCardItem[];
  completed: LiveCardItem[];
}

/**
 * Split live card items into NOW / NEXT / LATER / COMPLETED buckets.
 *
 * NOW  = live_status === "in_progress"
 * COMPLETED = live_status === "completed" | "cancelled"
 * NEXT = first upcoming parallel group (not started, earliest time)
 * LATER = everything else not started
 *
 * Parallel-group aware: all items sharing a parallelGroupId stay together.
 */
export function selectLiveBuckets(items: LiveCardItem[]): LiveSelection {
  const now: LiveCardItem[] = [];
  const completed: LiveCardItem[] = [];
  const pending: LiveCardItem[] = [];

  for (const item of items) {
    if (item.liveStatus === "in_progress") {
      now.push(item);
    } else if (item.liveStatus === "completed" || item.liveStatus === "cancelled") {
      completed.push(item);
    } else {
      pending.push(item);
    }
  }

  // Sort pending by timeLabel (HH:MM string sort works for same-day)
  pending.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

  if (pending.length === 0) {
    return { now, next: [], later: [], completed };
  }

  // Find the first parallel group or single item
  const firstPending = pending[0];
  const nextGroupId = firstPending.parallelGroupId;

  let next: LiveCardItem[];
  let later: LiveCardItem[];

  if (nextGroupId) {
    next = pending.filter((i) => i.parallelGroupId === nextGroupId);
    later = pending.filter((i) => i.parallelGroupId !== nextGroupId);
  } else {
    next = [firstPending];
    later = pending.slice(1);
  }

  return { now, next, later, completed };
}
