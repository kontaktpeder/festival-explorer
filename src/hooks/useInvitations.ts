import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessInvitation, Entity } from "@/types/database";

// Re-export mutation hooks from useEntityMutations
export { useCreateInvitation, useAcceptInvitation, useRevokeInvitation } from "./useEntityMutations";

// Fetch invitation by token or email+entity_id (for accept-invitation page)
export function useInvitation(params: { email?: string; entityId?: string; token?: string }) {
  return useQuery({
    queryKey: ["invitation", params],
    queryFn: async () => {
      let query = supabase
        .from("access_invitations")
        .select(`
          *,
          entity:entities(id, name, slug, type, hero_image_url)
        `)
        .eq("status", "pending");

      if (params.token) {
        query = query.eq("token", params.token);
      } else if (params.email && params.entityId) {
        query = query.eq("email", params.email).eq("entity_id", params.entityId);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as (AccessInvitation & { entity: Entity | null }) | null;
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

// Check if email already has an account
export async function checkEmailExists(email: string): Promise<boolean> {
  // We can't directly check auth.users, but we can check profiles by looking up
  // Note: This is a simplified check - in production you might use a Supabase function
  // For now, we'll handle this in the accept flow by trying to sign in first
  return false;
}
