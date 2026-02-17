import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for managing event invitations from the arranger side.
 * Lists all invitations for an event and allows creating new ones.
 */
export function useEventInvitations(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["event-invitations", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_invitations")
        .select(`
          *,
          entity:entities(id, name, slug, hero_image_url),
          inviter_persona:personas!event_invitations_invited_by_fkey(id, name, slug)
        `)
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async ({
      entityId,
      invitedByPersonaId,
      message,
      accessOnAccept = "viewer",
    }: {
      entityId: string;
      invitedByPersonaId: string;
      message?: string;
      accessOnAccept?: "viewer" | "editor" | "admin";
    }) => {
      const { error } = await supabase
        .from("event_invitations")
        .insert({
          event_id: eventId!,
          entity_id: entityId,
          invited_by: invitedByPersonaId,
          status: "pending",
          access_on_accept: accessOnAccept,
          message: message || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
    },
  });

  return { invitations, isLoading, createInvitation: createMutation };
}

/**
 * Hook for viewing and responding to event invitations from the entity (project) side.
 * Shows pending invitations for an entity and allows accept/decline.
 */
export function useEntityEventInvitations(entityId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["entity-event-invitations", entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_invitations")
        .select(`
          *,
          event:events(id, title, slug),
          inviter_persona:personas!event_invitations_invited_by_fkey(id, name, slug)
        `)
        .eq("entity_id", entityId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc("accept_event_invitation", {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-event-invitations", entityId] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("event_invitations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-event-invitations", entityId] });
    },
  });

  return {
    invitations,
    isLoading,
    accept: acceptMutation,
    decline: declineMutation,
  };
}
