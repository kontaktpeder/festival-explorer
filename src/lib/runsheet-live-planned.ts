import type { LiveCardItem } from "./runsheet-live-view-model";
import type { LiveSelection } from "./runsheet-live-selection";

function plannedBucketForItem(nowMs: number, item: LiveCardItem): "now" | "pending" | "completed" {
  if (item.isCanceled) return "completed";
  if (nowMs < item.effectiveStartMs) return "pending";
  if (item.effectiveEndMs === null) return "now";
  if (nowMs < item.effectiveEndMs) return "now";
  return "completed";
}

/**
 * Plan-based NOW/NEXT/LATER from effective start/end and wall clock.
 * Does not mutate live_status; purely derived view.
 */
export function selectPlannedBuckets(items: LiveCardItem[], now: Date): LiveSelection {
  const nowMs = now.getTime();
  const plannedNow: LiveCardItem[] = [];
  const plannedCompleted: LiveCardItem[] = [];
  const pending: LiveCardItem[] = [];

  for (const item of items) {
    const b = plannedBucketForItem(nowMs, item);
    if (b === "now") plannedNow.push(item);
    else if (b === "pending") pending.push(item);
    else plannedCompleted.push(item);
  }

  pending.sort((a, b) => a.effectiveStartMs - b.effectiveStartMs);

  if (pending.length === 0) {
    return { now: plannedNow, next: [], later: [], completed: plannedCompleted };
  }

  const first = pending[0];
  const gid = first.parallelGroupId;

  let next: LiveCardItem[];
  let later: LiveCardItem[];

  if (gid) {
    next = pending.filter((i) => i.parallelGroupId === gid);
    later = pending.filter((i) => i.parallelGroupId !== gid);
  } else {
    next = [first];
    later = pending.slice(1);
  }

  return { now: plannedNow, next, later, completed: plannedCompleted };
}
