/**
 * Kronologisk sortering for tidslinje-hendelser (eldst først).
 * Bruker eksakt dato/klokkeslett og year/year_to.
 */
export type TimelineEventLike = {
  date?: string | null;
  date_to?: string | null;
  year?: number | null;
  year_to?: number | null;
};

function getSortKey(e: TimelineEventLike): number {
  if (e.date) {
    const t = new Date(e.date).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (e.date_to) {
    const t = new Date(e.date_to).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (e.year != null) return e.year;
  if (e.year_to != null) return e.year_to;
  return Number.MAX_SAFE_INTEGER;
}

export function sortTimelineEventsChronological<T extends TimelineEventLike>(events: T[]): T[] {
  return [...events].sort((a, b) => getSortKey(a) - getSortKey(b));
}
