import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import type { EffectiveTime } from "@/lib/runsheet-live";

export type LiveCardItem = {
  id: string;
  parallelGroupId: string | null;
  timeLabel: string;
  title: string;
  areaLabel: string | null;
  slotTypeLabel: string | null;
  shortNote: string | null;
  liveStatus: string;
  delayMinutes: number;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  durationMinutes: number | null;
  effectiveStartMs: number;
  effectiveEndMs: number | null;
  isCanceled: boolean;
  badges: {
    visibility?: "internal" | "public";
    hasTechRider?: boolean;
    hasHospRider?: boolean;
    hasContract?: boolean;
  };
};

function hhmm(iso?: string | null) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function trimNote(note?: string | null, max = 90) {
  if (!note) return null;
  const t = note.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function toLiveCardItem(
  slot: ExtendedEventProgramSlot,
  et?: EffectiveTime
): LiveCardItem {
  const effectiveStartIso = et?.effectiveStart?.toISOString() ?? slot.starts_at;
  const displayStart =
    slot.actual_started_at && slot.live_status !== "not_started"
      ? slot.actual_started_at
      : effectiveStartIso;

  const performer =
    slot.performer_entity?.name ||
    slot.performer_persona?.name ||
    slot.performer_name_override ||
    slot.title_override ||
    "Ukjent";

  return {
    id: slot.id,
    parallelGroupId: slot.parallel_group_id ?? null,
    timeLabel: hhmm(displayStart),
    title: performer,
    areaLabel: slot.stage_label ?? null,
    slotTypeLabel: slot.slot_type ?? slot.slot_kind ?? null,
    shortNote: trimNote(slot.internal_note),
    liveStatus: slot.live_status ?? "not_started",
    delayMinutes: slot.delay_minutes ?? 0,
    actualStartedAt: slot.actual_started_at ?? null,
    actualEndedAt: slot.actual_ended_at ?? null,
    durationMinutes: slot.duration_minutes ?? null,
    badges: {
      visibility: slot.visibility as "internal" | "public",
      hasTechRider: !!slot.tech_rider_media_id,
      hasHospRider: !!slot.hosp_rider_media_id,
      hasContract: !!slot.contract_media_id,
    },
  };
}
