import { supabase } from "@/integrations/supabase/client";

export type EventHealth = "stable" | "at_risk" | "broken";

export function computeEventHealth(
  openIssues: { severity: string }[]
): EventHealth {
  if (openIssues.some((i) => i.severity === "critical")) return "broken";
  if (openIssues.some((i) => i.severity === "high")) return "at_risk";
  return "stable";
}

/** Generic domain owner resolver */
export async function getDomainOwnerUserId(
  festivalId: string,
  domainTag: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("festival_participants")
    .select("participant_id, participant_kind, domain_responsibilities")
    .eq("festival_id", festivalId)
    .contains("domain_responsibilities", [domainTag]);

  if (error || !data?.length) return null;

  const personaRow = data.find(
    (r: any) => r.participant_kind === "persona"
  );
  if (!personaRow) return null;

  const { data: persona } = await supabase
    .from("personas")
    .select("user_id")
    .eq("id", personaRow.participant_id)
    .maybeSingle();

  return persona?.user_id ?? null;
}

/** First festival participant with persona + 'lineup' in domain_responsibilities → user_id */
export async function getLineupOwnerUserId(
  festivalId: string
): Promise<string | null> {
  return getDomainOwnerUserId(festivalId, "lineup");
}

/** Fallback chain: lineup owner → event creator → festival creator */
export async function getDefaultIssueOwnerForSlot(params: {
  festivalId: string | null;
  eventId: string | null;
}): Promise<string | null> {
  if (params.festivalId) {
    const fromTag = await getLineupOwnerUserId(params.festivalId);
    if (fromTag) return fromTag;
  }

  if (params.eventId) {
    const { data: ev } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", params.eventId)
      .maybeSingle();
    if (ev?.created_by) return ev.created_by;
  }

  if (params.festivalId) {
    const { data: fest } = await supabase
      .from("festivals")
      .select("created_by")
      .eq("id", params.festivalId)
      .maybeSingle();
    if (fest?.created_by) return fest.created_by;
  }

  return null;
}

/**
 * When a concert slot is cancelled: open artist_cancelled issue (critical)
 * if performer_entity_id existed. Call after .update({ is_canceled: true }).
 */
export async function syncArtistCancelledIssueForSlot(slot: {
  id: string;
  festival_id: string | null;
  event_id: string | null;
  is_canceled: boolean;
  performer_entity_id: string | null;
}) {
  if (!slot.is_canceled) {
    // Un-cancel: remove any open artist_cancelled issue for this slot
    await supabase
      .from("event_issue" as any)
      .delete()
      .eq("related_program_slot_id", slot.id)
      .eq("type", "artist_cancelled")
      .eq("status", "open");
    return;
  }

  if (!slot.performer_entity_id) return;

  const owner = await getDefaultIssueOwnerForSlot({
    festivalId: slot.festival_id,
    eventId: slot.event_id,
  });

  // Delete any existing open cancel issue first (unique index will prevent dupes)
  await supabase
    .from("event_issue" as any)
    .delete()
    .eq("related_program_slot_id", slot.id)
    .eq("type", "artist_cancelled")
    .eq("status", "open");

  const { error } = await supabase.from("event_issue" as any).insert({
    festival_id: slot.festival_id,
    event_id: slot.event_id,
    type: "artist_cancelled",
    severity: "critical",
    status: "open",
    waiting_on: "organizer",
    owner_user_id: owner,
    related_program_slot_id: slot.id,
    payload: {},
  });

  if (error) {
    console.error("Failed to create artist_cancelled issue:", error);
    throw error;
  }
}

/** Complete "find replacement" flow: insert new slot, mark issue as handled */
export async function completeFindReplacementFlow(params: {
  issueId: string;
  newSlot: Record<string, unknown>;
}) {
  const ins = await supabase
    .from("event_program_slots" as any)
    .insert(params.newSlot)
    .select("id")
    .single();
  if (ins.error) throw ins.error;

  const { error } = await supabase
    .from("event_issue" as any)
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
    } as any)
    .eq("id", params.issueId);
  if (error) throw error;

  return ins.data;
}
