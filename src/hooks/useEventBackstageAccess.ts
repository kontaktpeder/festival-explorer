import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities } from "@/hooks/useEntity";
import { inferEntityKind, getEventHostId } from "@/lib/role-model-helpers";

export type FestivalContextRow = {
  festival_id: string;
  festival: { id?: string; slug?: string; name?: string } | null;
} | null;

export type InheritedFestivalTeamItem = {
  participant_kind: string;
  participant_id: string;
  entity: Record<string, unknown> | null;
  persona: Record<string, unknown> | null;
  role_label: string | null;
};

export type InheritedFestivalTeam = {
  festival: { slug?: string; name?: string } | null;
  backstage: InheritedFestivalTeamItem[];
  hostRoles: InheritedFestivalTeamItem[];
} | null;

export function useEventBackstageAccess(eventId: string | undefined) {
  const enabled = !!eventId;
  const [isTicketAdmin, setIsTicketAdmin] = useState(false);
  const { data: myEntities } = useMyEntities();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("is_ticket_admin");
      setIsTicketAdmin(!!data);
    })();
  }, []);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["admin-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled,
    retry: 1,
  });

  const hostEntities = (myEntities ?? []).filter((e) => inferEntityKind(e) === "host");
  const eventHostId = event ? getEventHostId(event) : null;

  const { data: canEditEventRpc } = useQuery({
    queryKey: ["can-edit-event", eventId],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_edit_event", { p_event_id: eventId });
      return data ?? false;
    },
    enabled,
  });

  const canEdit =
    isTicketAdmin ||
    canEditEventRpc === true ||
    (!!eventHostId && hostEntities.some((h) => h.id === eventHostId));

  const { data: festivalContext } = useQuery({
    queryKey: ["event-festival-context", eventId],
    enabled: !!event && enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_events")
        .select("festival_id, festival:festivals(id, slug, name)")
        .eq("event_id", event!.id)
        .maybeSingle();
      return data as FestivalContextRow;
    },
  });

  const { data: festivalTeam } = useQuery({
    queryKey: ["admin-event-festival-team", eventId],
    enabled: !!event && enabled,
    queryFn: async (): Promise<InheritedFestivalTeam> => {
      const { data: festivalEvent } = await supabase
        .from("festival_events")
        .select("festival_id, festival:festivals(slug, name)")
        .eq("event_id", event!.id)
        .maybeSingle();
      if (!festivalEvent?.festival_id) return null;

      const { data: festivalParticipants } = await supabase
        .from("festival_participants")
        .select("*")
        .eq("festival_id", festivalEvent.festival_id)
        .in("zone", ["backstage", "host"])
        .order("zone")
        .order("sort_order");

      if (!festivalParticipants?.length) {
        return { festival: festivalEvent.festival as any, backstage: [], hostRoles: [] };
      }

      const personaIds = festivalParticipants
        .filter((p) => p.participant_kind === "persona")
        .map((p) => p.participant_id);
      const entityIds = festivalParticipants
        .filter((p) => p.participant_kind !== "persona")
        .map((p) => p.participant_id);

      const [personasRes, entitiesRes] = await Promise.all([
        personaIds.length
          ? supabase.from("personas").select("id, name, avatar_url, slug, is_public").in("id", personaIds)
          : Promise.resolve({ data: [] as any[] }),
        entityIds.length
          ? supabase.from("entities").select("id, name, slug, type, hero_image_url, is_published").in("id", entityIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const personaMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));
      const entityMap = new Map((entitiesRes.data || []).map((e: any) => [e.id, e]));

      const backstage: InheritedFestivalTeamItem[] = [];
      const hostRoles: InheritedFestivalTeamItem[] = [];

      festivalParticipants.forEach((p) => {
        const resolved =
          p.participant_kind === "persona"
            ? personaMap.get(p.participant_id)
            : entityMap.get(p.participant_id);
        if (!resolved) return;
        const item: InheritedFestivalTeamItem = {
          participant_kind: p.participant_kind,
          participant_id: p.participant_id,
          entity: p.participant_kind !== "persona" ? resolved : null,
          persona: p.participant_kind === "persona" ? resolved : null,
          role_label: p.role_label,
        };
        if (p.zone === "backstage") backstage.push(item);
        else if (p.zone === "host") hostRoles.push(item);
      });

      return { festival: festivalEvent.festival as any, backstage, hostRoles };
    },
  });

  return { event, isLoading: eventLoading, canEdit, festivalContext, festivalTeam };
}
