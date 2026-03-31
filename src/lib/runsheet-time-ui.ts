/** Kalenderdag + klokkeslett (lokal) → Date */
export function combineAnchorDateWithTime(anchorIso: string, timeHHmm: string): Date {
  const base = new Date(anchorIso);
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/** HH:mm fra ISO-streng (lokal tid) */
export function isoToLocalTimeHHmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** HH:mm:ss for Postgres `time` / `starts_at_local` (lokal tid fra ISO) */
export function isoToLocalTimeHHmmss(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

/** Hvis slutt ≤ start på samme kalenderdag → anta neste dag (overnight) */
export function adjustOvernightEnd(start: Date, end: Date): Date {
  if (end.getTime() > start.getTime()) return end;
  const out = new Date(end);
  out.setDate(out.getDate() + 1);
  return out;
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export type TimePairEditSource = "start" | "end" | "duration" | null;
