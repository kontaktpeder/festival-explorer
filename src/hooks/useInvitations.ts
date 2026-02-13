import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessInvitation, Entity } from "@/types/database";

// Re-export mutation hooks from useEntityMutations
export { useCreateInvitation, useAcceptInvitation, useRevokeInvitation } from "./useEntityMutations";

// Fetch invitation by token or email+entity_id (for accept-invitation page)
export function useInvitation(params: { email?: string; entityId?: string; token?: string }) {
  return useQuery({
    queryKey: ["invitation", params],
    queryFn: async () => {
      // Preferred: fetch by unguessable token (works before login)
      if (params.token) {
        const { data, error } = await supabase.rpc("get_invitation_by_token", {
          p_token: params.token,
        });
        if (error) throw error;

        // RPC returns `jsonb` (typed as `Json` in generated types). Cast via `unknown` first.
        const raw: unknown = data;
        return (raw as (AccessInvitation & { entity: Partial<Entity> | null })) ?? null;
      }

      // Fallback: fetch by email+entityId (requires auth via RLS in most cases)
      let query = supabase
        .from("access_invitations")
        .select(`
          *,
          entity:entities(id, name, slug, type, hero_image_url)
        `)
        .eq("status", "pending");

      if (params.email && params.entityId) {
        query = query.eq("email", params.email).eq("entity_id", params.entityId);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as unknown as (AccessInvitation & { entity: Partial<Entity> | null }) | null;
    },
    enabled: !!(params.token || (params.email && params.entityId)),
  });
}

// Fetch all invitations for an entity (admin view)
export function useEntityInvitations(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-invitations", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from("access_invitations")
        .select("*")
        .eq("entity_id", entityId)
        .order("invited_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });
}

// Fetch pending invitations for the current user (in-app invitations)
export function useMyPendingInvitations() {
  return useQuery({
    queryKey: ["my-pending-invitations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("access_invitations")
        .select(`
          id,
          entity_id,
          access,
          role_labels,
          invited_at,
          expires_at,
          invited_user_id,
          entity:entities(id, name, slug, type)
        `)
        .eq("status", "pending")
        .not("invited_user_id", "is", null)
        .order("invited_at", { ascending: false });

      if (error) throw error;
      // RLS filters to only show invitations where invited_user_id = auth.uid()
      return data ?? [];
    },
  });
}

// Accept invitation by ID (in-app, when invited_user_id is set)
export function useAcceptInvitationById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const { data, error } = await supabase.rpc("accept_invitation_by_id", {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
      if (!data) throw new Error("Invitation not found or expired");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
    },
  });
}

// Decline invitation by updating status to 'revoked' (for invited_user_id invitations)
export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const { error } = await supabase
        .from("access_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
    },
  });
}

// Check if email already has an account
export async function checkEmailExists(email: string): Promise<boolean> {
  return false;
}
