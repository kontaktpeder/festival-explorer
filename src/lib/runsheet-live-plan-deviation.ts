import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveSelection } from "@/lib/runsheet-live-selection";
import { getLiveSlotPlannedEndMs } from "@/lib/live-display-time";

export type LivePlanDeviation =
  | { kind: "none" }
  | { kind: "nothing_live_but_plan"; planned: LiveCardItem[] }
  | { kind: "wrong_slot"; planned: LiveCardItem[]; actual: LiveCardItem[] }
  | { kind: "behind_plan_minutes"; minutes: number; label: string }
  | { kind: "overdue"; items: LiveCardItem[] }
  | { kind: "early_start"; items: LiveCardItem[] };

function idSet(list: LiveCardItem[]): Set<string> {
  return new Set(list.map((i) => i.id));
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function titles(list: LiveCardItem[]): string {
  return list.map((i) => i.title).filter(Boolean).join(" · ");
}

export function computeLivePlanDeviation(
  actual: LiveSelection,
  planned: LiveSelection,
  wallNow: Date
): LivePlanDeviation {
  const aNow = actual.now;
  const pNow = planned.now;
  const aIds = idSet(aNow);
  const pIds = idSet(pNow);
  const t = wallNow.getTime();

  if (pNow.length > 0 && aNow.length === 0) {
    return { kind: "nothing_live_but_plan", planned: pNow };
  }

  if (pNow.length > 0 && aNow.length > 0 && !setsEqual(aIds, pIds)) {
    return { kind: "wrong_slot", planned: pNow, actual: aNow };
  }

  if (aNow.length > 0 && setsEqual(aIds, pIds) && pNow.length > 0) {
    const overdueItems = aNow.filter((item) => t > getLiveSlotPlannedEndMs(item));
    if (overdueItems.length > 0) {
      return { kind: "overdue", items: overdueItems };
    }

    const early = aNow.filter((item) => {
      if (!item.actualStartedAt) return false;
      const started = new Date(item.actualStartedAt).getTime();
      return item.effectiveStartMs - started >= 2 * 60_000;
    });
    if (early.length > 0) {
      return { kind: "early_start", items: early };
    }
  }

  if (pNow.length > 0 && aNow.length > 0 && setsEqual(aIds, pIds)) {
    let maxBehind = 0;
    for (const item of aNow) {
      if (!item.actualStartedAt) continue;
      const started = new Date(item.actualStartedAt).getTime();
      const behind = Math.round((started - item.effectiveStartMs) / 60_000);
      if (behind > maxBehind) maxBehind = behind;
    }
    if (maxBehind >= 3) {
      return { kind: "behind_plan_minutes", minutes: maxBehind, label: titles(pNow) };
    }
  }

  return { kind: "none" };
}

export function deviationRequiresPrimaryAck(d: LivePlanDeviation): boolean {
  return (
    d.kind === "wrong_slot" ||
    d.kind === "nothing_live_but_plan" ||
    d.kind === "early_start"
  );
}

export function formatPlanClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
