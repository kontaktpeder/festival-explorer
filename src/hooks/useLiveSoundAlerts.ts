import { useRef, useEffect } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveSelection } from "@/lib/runsheet-live-selection";
import { playPreset } from "@/lib/live-sound-engine";

export type SoundMode = "off" | "critical" | "all";

interface Opts {
  scopeKey: string;
  mode: SoundMode;
  unlocked: boolean;
  liveItems: LiveCardItem[];
  plannedBuckets: LiveSelection;
  now: Date;
}

type Snap = Record<string, { liveStatus: string; delayMinutes: number; isCanceled: boolean }>;

function buildSnap(items: LiveCardItem[]): Snap {
  const s: Snap = {};
  for (const i of items) {
    s[i.id] = { liveStatus: i.liveStatus, delayMinutes: i.delayMinutes, isCanceled: i.isCanceled };
  }
  return s;
}

export function useLiveSoundAlerts({ scopeKey, mode, unlocked, liveItems, plannedBuckets, now }: Opts) {
  const prevSnap = useRef<Snap | null>(null);
  const dedupe = useRef<Set<string>>(new Set());
  const prevScopeKey = useRef(scopeKey);

  // Reset on scope change
  useEffect(() => {
    if (prevScopeKey.current !== scopeKey) {
      prevSnap.current = null;
      dedupe.current = new Set();
      prevScopeKey.current = scopeKey;
    }
  }, [scopeKey]);

  useEffect(() => {
    if (mode === "off" || !unlocked) return;

    const next = buildSnap(liveItems);
    const prev = prevSnap.current;

    // First snapshot = baseline only, no sound
    if (!prev) {
      prevSnap.current = next;
      return;
    }

    // Edge detection
    for (const id of Object.keys(next)) {
      const n = next[id];
      const p = prev[id];
      if (!p) continue;

      // Canceled
      const cancelKey = `canceled:${id}`;
      if (
        (!p.isCanceled && n.isCanceled) ||
        (p.liveStatus !== "cancelled" && n.liveStatus === "cancelled")
      ) {
        if (!dedupe.current.has(cancelKey)) {
          dedupe.current.add(cancelKey);
          playPreset("canceled");
        }
      }

      // Delay increased
      if (n.delayMinutes > p.delayMinutes) {
        const delayKey = `delay:${id}:${n.delayMinutes}`;
        if (!dedupe.current.has(delayKey)) {
          dedupe.current.add(delayKey);
          playPreset("delay");
        }
      }
    }

    // Next soon (only in "all" mode)
    if (mode === "all" && plannedBuckets.next.length > 0) {
      const earliest = Math.min(...plannedBuckets.next.map((i) => i.effectiveStartMs));
      const msUntil = earliest - now.getTime();
      const FIVE_MIN = 5 * 60_000;
      const groupKey = plannedBuckets.next[0].parallelGroupId ?? plannedBuckets.next[0].id;
      const nextKey = `next5:${groupKey}`;

      // Check if we just crossed the 5-min boundary
      const prevEarliest = Math.min(
        ...plannedBuckets.next
          .map((i) => i.effectiveStartMs)
      );
      // Use simple threshold: <= 5 min and not yet deduped
      if (msUntil <= FIVE_MIN && msUntil > 0 && !dedupe.current.has(nextKey)) {
        dedupe.current.add(nextKey);
        playPreset("nextSoon");
      }

      // Clean up dedupe when group passed
      if (now.getTime() >= earliest) {
        dedupe.current.delete(nextKey);
      }
    }

    prevSnap.current = next;
  }, [liveItems, mode, unlocked, plannedBuckets, now]);

  return {
    resetDedupe: () => {
      dedupe.current = new Set();
    },
  };
}
