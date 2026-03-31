import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Zone config ───
export const ACTOR_ZONES = [
  { key: "lineup", label: "Lineup" },
  { key: "crew", label: "Crew" },
  { key: "technical", label: "Teknikk" },
  { key: "other", label: "Andre" },
] as const;

export type ActorZoneKey = (typeof ACTOR_ZONES)[number]["key"];

const NEW_ZONE_KEYS = new Set<string>(["lineup", "crew", "technical", "other"]);

/** Map old or null zones to new zone keys for display */
export function getEffectiveZone(zone: string | null | undefined): ActorZoneKey {
  if (!zone) return "other";
  if (NEW_ZONE_KEYS.has(zone)) return zone as ActorZoneKey;
  // Legacy mapping
  if (zone === "on_stage") return "lineup";
  if (zone === "backstage") return "crew";
  return "other";
}

/** Default live_role per zone */
export function defaultLiveRoleForZone(zone: ActorZoneKey): string {
  switch (zone) {
    case "lineup": return "viewer";
    case "crew": return "crew";
    case "technical": return "editor";
    case "other": return "viewer";
  }
}

// ─── Types ───
export interface ActorParticipant {
  id: string;
  event_id: string;
  zone: string | null;
  participant_kind: string;
  participant_id: string;
  role_label: string | null;
  sort_order: number;
  live_role: string;
  can_view_runsheet: boolean;
  can_operate_runsheet: boolean;
  is_public: boolean;
  // Resolved
  name?: string;
  slug?: string | null;
  avatar_url?: string | null;
  type?: string | null;
}

export interface ActorInvitation {
  id: string;
  event_id: string;
  email: string | null;
  name: string | null;
  zone: string | null;
  status: string;
  token: string | null;
  expires_at: string | null;
  message: string | null;
  created_at: string;
  // entity-based invitations
  entity_id: string | null;
  entity?: { id: string; name: string; slug?: string } | null;
}

export type ActorItem = 
  | { type: "participant"; data: ActorParticipant; status: "active" | "offline" }
  | { type: "invitation"; data: ActorInvitation; status: "invited" | "declined" | "revoked" };

// ─── Main hook ───
export function useEventActors(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["event-actors", eventId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!eventId) return { participants: [], invitations: [] };

      // Fetch participants
      const { data: pRows, error: pErr } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
      if (pErr) throw pErr;

      const participants = (pRows || []) as ActorParticipant[];

      // Resolve names
      const personaIds = participants.filter(p => p.participant_kind === "persona").map(p => p.participant_id);
      const entityIds = participants.filter(p => p.participant_kind === "entity").map(p => p.participant_id);

      const [personasRes, entitiesRes] = await Promise.all([
        personaIds.length > 0
          ? supabase.from("personas").select("id, name, slug, avatar_url, type").in("id", personaIds)
          : Promise.resolve({ data: [] as any[] }),
        entityIds.length > 0
          ? supabase.from("entities").select("id, name, slug, type, hero_image_url").in("id", entityIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const refMap = new Map<string, any>();
      (personasRes.data || []).forEach((p: any) => refMap.set(p.id, p));
      (entitiesRes.data || []).forEach((e: any) => refMap.set(e.id, e));

      participants.forEach(p => {
        const ref = refMap.get(p.participant_id);
        if (ref) {
          p.name = ref.name;
          p.slug = ref.slug;
          p.avatar_url = ref.avatar_url ?? ref.hero_image_url ?? null;
          p.type = ref.type;
        }
      });

      // Fetch invitations (both entity-based and email-based)
      const { data: iRows, error: iErr } = await supabase
        .from("event_invitations")
        .select(`
          *,
          entity:entities(id, name, slug)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (iErr) throw iErr;

      const invitations = (iRows || []) as ActorInvitation[];

      return { participants, invitations };
    },
    enabled: !!eventId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // ─── Add participant directly (platform user) ───
  const addParticipant = useMutation({
    mutationFn: async ({
      participantKind,
      participantId,
      zone,
      roleLabel,
    }: {
      participantKind: "persona" | "entity";
      participantId: string;
      zone: ActorZoneKey;
      roleLabel?: string;
    }) => {
      const maxSort = Math.max(0, ...(data?.participants || [])
        .filter(p => getEffectiveZone(p.zone) === zone)
        .map(p => p.sort_order || 0));

      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId!,
        zone,
        participant_kind: participantKind,
        participant_id: participantId,
        role_label: roleLabel || null,
        sort_order: maxSort + 1,
        live_role: defaultLiveRoleForZone(zone) as any,
        can_view_runsheet: zone === "technical" || zone === "crew",
        can_operate_runsheet: zone === "technical",
        is_public: zone === "lineup",
      });
      if (error) throw error;

      // Sync event_entities for lineup entities
      if (participantKind === "entity" && zone === "lineup") {
        await supabase.from("event_entities").upsert({
          event_id: eventId!,
          entity_id: participantId,
          billing_order: maxSort + 1,
        }, { onConflict: "event_id,entity_id" }).select();
      }
    },
    onSuccess: invalidate,
  });

  // ─── Add offline actor (no account) ───
  const addOfflineActor = useMutation({
    mutationFn: async ({
      name,
      zone,
      roleLabel,
    }: {
      name: string;
      zone: ActorZoneKey;
      roleLabel?: string;
    }) => {
      // For offline actors without accounts, we create a minimal participant
      // Using a generated UUID as participant_id with participant_kind = "offline"
      const offlineId = crypto.randomUUID();
      const maxSort = Math.max(0, ...(data?.participants || [])
        .filter(p => getEffectiveZone(p.zone) === zone)
        .map(p => p.sort_order || 0));

      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId!,
        zone,
        participant_kind: "persona", // Store as persona kind but with a name override via role_label
        participant_id: offlineId,
        role_label: roleLabel || name,
        sort_order: maxSort + 1,
        live_role: defaultLiveRoleForZone(zone) as any,
        is_public: false,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ─── Send email invitation ───
  const sendInvitation = useMutation({
    mutationFn: async ({
      email,
      name,
      zone,
      message,
    }: {
      email: string;
      name?: string;
      zone: ActorZoneKey;
      message?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke(
        "manage-event-invitation",
        {
          body: {
            action: "send",
            event_id: eventId!,
            zone,
            email,
            name,
            message,
          },
        }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: invalidate,
  });

  // ─── Resend invitation ───
  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data: result, error } = await supabase.functions.invoke(
        "manage-event-invitation",
        { body: { action: "resend", invitation_id: invitationId } }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: invalidate,
  });

  // ─── Revoke invitation ───
  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data: result, error } = await supabase.functions.invoke(
        "manage-event-invitation",
        { body: { action: "revoke", invitation_id: invitationId } }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: invalidate,
  });

  // ─── Remove participant ───
  const removeParticipant = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ─── Change zone ───
  const changeZone = useMutation({
    mutationFn: async ({ participantId, newZone }: { participantId: string; newZone: ActorZoneKey }) => {
      const { error } = await supabase
        .from("event_participants")
        .update({ zone: newZone })
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ─── Change live role ───
  const changeLiveRole = useMutation({
    mutationFn: async ({ participantId, role }: { participantId: string; role: string }) => {
      const { error } = await supabase
        .from("event_participants")
        .update({ live_role: role } as any)
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ─── Group by zone ───
  const participants = data?.participants || [];
  const invitations = data?.invitations || [];

  const actorsByZone: Record<ActorZoneKey, ActorItem[]> = {
    lineup: [],
    crew: [],
    technical: [],
    other: [],
  };

  // Add participants
  participants.forEach(p => {
    const zone = getEffectiveZone(p.zone);
    const hasAccount = !!p.name; // resolved name means we found the persona/entity
    actorsByZone[zone].push({
      type: "participant",
      data: p,
      status: hasAccount ? "active" : "offline",
    });
  });

  // Add pending/declined invitations
  invitations
    .filter(i => i.status === "pending" || i.status === "declined")
    .forEach(i => {
      const zone = getEffectiveZone(i.zone);
      actorsByZone[zone].push({
        type: "invitation",
        data: i,
        status: i.status === "pending" ? "invited" : i.status === "declined" ? "declined" : "revoked",
      });
    });

  return {
    actorsByZone,
    participants,
    invitations,
    isLoading: isLoading,
    addParticipant,
    addOfflineActor,
    sendInvitation,
    resendInvitation,
    revokeInvitation,
    removeParticipant,
    changeZone,
    changeLiveRole,
  };
}
