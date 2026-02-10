import { format } from "date-fns";
import { nb } from "date-fns/locale";

export type TimelineEventLike = {
  date?: string | null;
  date_to?: string | null;
  year?: number | null;
  year_to?: number | null;
};

/**
 * Format a single date string (YYYY-MM-DD or ISO).
 * Day 1 without time = month-only → "juni 2024".
 * Full date → "15. jun 2024".
 * Avoids timezone issues by parsing YYYY-MM-DD components directly.
 */
export function formatTimelineDateSingle(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const part = dateStr.slice(0, 10);
  const match = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, y, m, d] = match;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  const hasTime = dateStr.length > 10 && /T\d{2}:\d{2}/.test(dateStr);

  // Day 1 without time = only month selected
  if (day === 1 && !hasTime) {
    return format(new Date(year, month, 1), "MMMM yyyy", { locale: nb });
  }

  const base = format(new Date(year, month, day), "d. MMM yyyy", { locale: nb });
  if (hasTime) {
    const tMatch = dateStr.match(/T(\d{2}):(\d{2})/);
    if (tMatch) return `${base} kl. ${tMatch[1]}:${tMatch[2]}`;
  }
  return base;
}

/**
 * Format a timeline event for display (backstage + public).
 */
export function formatTimelineEventDate(event: TimelineEventLike): string | null {
  if (event.date) {
    const from = formatTimelineDateSingle(event.date);
    if (!from) return event.year?.toString() ?? null;
    if (event.date_to) {
      const to = formatTimelineDateSingle(event.date_to);
      if (to && to !== from) return `${from} – ${to}`;
    }
    return from;
  }
  if (event.year != null) {
    if (event.year_to != null && event.year_to !== event.year) {
      return `${event.year}–${event.year_to}`;
    }
    return event.year.toString();
  }
  return null;
}
