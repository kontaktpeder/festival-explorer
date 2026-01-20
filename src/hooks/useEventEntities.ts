import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventEntity, Entity } from "@/types/database";

/**
 * Fetch lineup (entities) for an event
 */
export function useEventLineup(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-lineup", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("event_entities")
        .select(`
          *,
          entity:entities(*)
        `)
        .eq("event_id", eventId)
        .order("billing_order", { ascending: true });

      if (error) throw error;
      return (data || []) as EventEntity[];
    },
    enabled: !!eventId,
  });
}

/**
 * Fetch events that an entity is part of
 */
export function useEntityEvents(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-events", entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from("event_entities")
        .select(`
          *,
          event:events(
            *,
            venue:venues(*)
          )
        `)
        .eq("entity_id", entityId)
        .order("billing_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });
}

// ============================================
// Mutations for managing event lineup
// ============================================

export function useAddEntityToEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      entityId, 
      billingOrder = 0,
      isFeatured = false 
    }: { 
      eventId: string; 
      entityId: string; 
      billingOrder?: number;
      isFeatured?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("event_entities")
        .insert({
          event_id: eventId,
          entity_id: entityId,
          billing_order: billingOrder,
          is_featured: isFeatured,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-lineup", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["entity-events", variables.entityId] });
    },
  });
}

export function useRemoveEntityFromEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, entityId }: { eventId: string; entityId: string }) => {
      const { error } = await supabase
        .from("event_entities")
        .delete()
        .eq("event_id", eventId)
        .eq("entity_id", entityId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-lineup", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["entity-events", variables.entityId] });
    },
  });
}

export function useUpdateEventEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      entityId, 
      billingOrder,
      isFeatured,
      featureOrder,
    }: { 
      eventId: string; 
      entityId: string; 
      billingOrder?: number;
      isFeatured?: boolean;
      featureOrder?: number;
    }) => {
      const updates: Record<string, unknown> = {};
      if (billingOrder !== undefined) updates.billing_order = billingOrder;
      if (isFeatured !== undefined) updates.is_featured = isFeatured;
      if (featureOrder !== undefined) updates.feature_order = featureOrder;

      const { data, error } = await supabase
        .from("event_entities")
        .update(updates)
        .eq("event_id", eventId)
        .eq("entity_id", entityId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-lineup", variables.eventId] });
    },
  });
}

export function useReorderEventLineup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      orderedEntityIds 
    }: { 
      eventId: string; 
      orderedEntityIds: string[];
    }) => {
      // Update each entity's billing_order
      const updates = orderedEntityIds.map((entityId, index) => 
        supabase
          .from("event_entities")
          .update({ billing_order: index })
          .eq("event_id", eventId)
          .eq("entity_id", entityId)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-lineup", variables.eventId] });
    },
  });
}
