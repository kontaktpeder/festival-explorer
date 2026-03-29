import type { ExtendedEventProgramSlot } from "@/types/program-slots";

/** Neste starttid for ny post: etter forrige slutt, eller +15 min, eller scopeStartAt, eller avrundet nå. */
export function computeNextSlotStartsAt(
  slots: ExtendedEventProgramSlot[],
  scopeStartAt?: string | null
): Date {
  if (!slots.length) {
    if (scopeStartAt) return new Date(scopeStartAt);
    const d = new Date();
    const m = d.getMinutes();
    d.setMinutes(Math.ceil(m / 5) * 5, 0, 0);
    return d;
  }
  const sorted = [...slots].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const last = sorted[sorted.length - 1];
  const start = new Date(last.starts_at).getTime();
  if (last.ends_at) return new Date(last.ends_at);
  if (last.duration_minutes != null && last.duration_minutes > 0) {
    return new Date(start + last.duration_minutes * 60000);
  }
  return new Date(start + 15 * 60000);
}

/** Should the "Advanced" collapsible be open initially for this slot? */
export function shouldOpenAdvancedInitially(slot: ExtendedEventProgramSlot): boolean {
  if (slot.slot_kind !== "custom") return true;
  const hasPerformer =
    !!slot.performer_entity_id ||
    !!slot.performer_persona_id ||
    (slot.performer_kind === "text" && !!slot.performer_name_override?.trim());
  if (hasPerformer) return true;
  if (slot.visibility === "public") return true;
  if (slot.is_visible_public) return true;
  if (slot.is_canceled) return true;
  if (slot.slot_type) return true;
  if (slot.event_id) return true;
  if (slot.internal_status === "canceled") return true;
  return false;
}

export function customRowTitle(slot: ExtendedEventProgramSlot): string {
  const t = slot.title_override?.trim();
  if (t) return t;
  return "Legg til hva som skjer";
}
