import type { LiveCardItem } from "@/lib/runsheet-live-view-model";

export function roundLocalTimeToNearestFiveMinutes(date: Date): Date {
  const d = new Date(date.getTime());
  const totalMinutesFloat =
    d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60_000;
  const rounded = Math.round(totalMinutesFloat / 5) * 5;
  const normalized = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function displayRoundedPlanTime(item: LiveCardItem): string {
  return formatHHMM(roundLocalTimeToNearestFiveMinutes(new Date(item.effectiveStartMs)));
}

export function formatMinutesUntil(effectiveStartMs: number, wallNow: Date): string | null {
  const diffMin = Math.round((effectiveStartMs - wallNow.getTime()) / 60_000);
  if (diffMin <= 0) return null;
  if (diffMin >= 24 * 60) return null;
  return `om ${diffMin} min`;
}

export function shouldShowSlotKindTag(label: string | null | undefined): boolean {
  if (!label || !String(label).trim()) return false;
  return String(label).trim().toLowerCase() !== "custom";
}

export function getLiveSlotStartMs(item: LiveCardItem): number {
  return item.actualStartedAt ? new Date(item.actualStartedAt).getTime() : item.effectiveStartMs;
}

export function getLiveSlotPlannedEndMs(item: LiveCardItem): number {
  const startMs = getLiveSlotStartMs(item);
  const durationMs = (item.durationMinutes ?? 0) * 60_000;
  const delayMs = (item.delayMinutes ?? 0) * 60_000;
  if (durationMs <= 0 && delayMs <= 0) {
    if (item.effectiveEndMs != null) return item.effectiveEndMs;
    return startMs;
  }
  return startMs + durationMs + delayMs;
}

export function getLiveSlotTotalDurationMs(item: LiveCardItem): number {
  return (item.durationMinutes ?? 0) * 60_000 + (item.delayMinutes ?? 0) * 60_000;
}

export function progressThroughLiveSlot(wallNow: Date, item: LiveCardItem): number | null {
  const total = getLiveSlotTotalDurationMs(item);
  if (total <= 0) return null;
  const elapsed = wallNow.getTime() - getLiveSlotStartMs(item);
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function nowMarkerFraction(wallNow: Date, item: LiveCardItem): number | null {
  const start = getLiveSlotStartMs(item);
  const end = getLiveSlotPlannedEndMs(item);
  if (end <= start) return null;
  const t = (wallNow.getTime() - start) / (end - start);
  return Math.max(0, Math.min(1, t));
}

export function formatDurationLine(item: LiveCardItem): string | null {
  const dm = item.durationMinutes ?? 0;
  const add = item.delayMinutes ?? 0;
  if (dm <= 0 && add <= 0) return null;
  if (add > 0 && dm > 0) return `${dm} min + ${add} min utsett`;
  if (add > 0) return `+ ${add} min utsett`;
  return `${dm} min`;
}
