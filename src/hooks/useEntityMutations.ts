import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, EntityType, EntityTeam, AccessLevel } from "@/types/database";

// ============================================
// Entity CRUD Mutations
// ============================================

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entity: {
      type: EntityType;
      name: string;
      slug: string;
      tagline?: string;
      description?: string;
      hero_image_url?: string;
      address?: string;
      city?: string;
      is_published?: boolean;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("entities")
        .insert(entity)
        .select()
        .single();
      if (error) throw error;
      return data as Entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Entity> & { id: string }) => {
      const { data, error } = await supabase
        .from("entities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Entity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", data.slug] });
      queryClient.invalidateQueries({ queryKey: ["entity-edit", data.id] });
      queryClient.invalidateQueries({ queryKey: ["entity-by-id", data.id] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entities")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
    },
  });
}

export function useToggleEntityPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { data, error } = await supabase
        .from("entities")
        .update({ is_published })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
    },
  });
}

// ============================================
// Entity Team Mutations
// ============================================

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityId,
      userId,
      access = 'viewer',
      roleLabels = [],
      isPublic = false,
    }: {
      entityId: string;
      userId: string;
      access?: AccessLevel;
      roleLabels?: string[];
      isPublic?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("entity_team")
        .insert({
          entity_id: entityId,
          user_id: userId,
          access,
          role_labels: roleLabels,
          is_public: isPublic,
        })
        .select(`
          *,
          profile:profiles(*)
        `)
        .single();
      if (error) throw error;
      return data as EntityTeam;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity-edit", variables.entityId] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      access,
      roleLabels,
      isPublic,
    }: {
      id: string;
      access?: AccessLevel;
      roleLabels?: string[];
      isPublic?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (access !== undefined) updates.access = access;
      if (roleLabels !== undefined) updates.role_labels = roleLabels;
      if (isPublic !== undefined) updates.is_public = isPublic;

      const { data, error } = await supabase
        .from("entity_team")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          profile:profiles(*)
        `)
        .single();
      if (error) throw error;
      return data as EntityTeam;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entity-edit", data.entity_id] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityId }: { id: string; entityId: string }) => {
      // Soft delete by setting left_at
      const { error } = await supabase
        .from("entity_team")
        .update({ left_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity-edit", variables.entityId] });
    },
  });
}

// ============================================
// Access Invitations
// ============================================

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityId,
      email,
      access,
      roleLabels = [],
      invitedBy,
    }: {
      entityId: string;
      email: string;
      access: AccessLevel;
      roleLabels?: string[];
      invitedBy: string;
    }) => {
      // Generate a random token
      const token = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from("access_invitations")
        .insert({
          entity_id: entityId,
          email,
          access,
          role_labels: roleLabels,
          token,
          invited_by: invitedBy,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity-invitations", variables.entityId] });
    },
  });
}

export function useEntityInvitations(entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from("access_invitations")
        .select("*")
        .eq("entity_id", entityId)
        .order("invited_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityId }: { id: string; entityId: string }) => {
      const { error } = await supabase
        .from("access_invitations")
        .update({ status: 'revoked' })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity-invitations", variables.entityId] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      // Get invitation
      const { data: invitation, error: fetchError } = await supabase
        .from("access_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();
      
      if (fetchError) throw fetchError;
      if (!invitation) throw new Error("Invitation not found or expired");
      
      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error("Invitation has expired");
      }
      
      // Check if user is already a team member
      const { data: existingMember } = await supabase
        .from("entity_team")
        .select("id, access")
        .eq("entity_id", invitation.entity_id)
        .eq("user_id", userId)
        .is("left_at", null)
        .maybeSingle();
      
      if (existingMember) {
        // User already has access - just mark invitation as accepted
        console.log("User already has access to entity, skipping team insert");
      } else {
        // Add user to team
        const { error: teamError } = await supabase
          .from("entity_team")
          .insert({
            entity_id: invitation.entity_id,
            user_id: userId,
            access: invitation.access,
            role_labels: invitation.role_labels,
            is_public: false,
          });
        
        if (teamError) throw teamError;
      }
      
      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("access_invitations")
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);
      
      if (updateError) throw updateError;
      
      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
    },
  });
}
