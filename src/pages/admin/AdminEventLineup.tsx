import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { useState } from "react";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { getEntityTypeConfig, getDefaultEntityTypeConfig } from "@/lib/entity-types";
import { EntityTypeIcon } from "@/components/ui/EntityTypeIcon";
import type { EntityType } from "@/types/database";

// NEW ROLE MODEL STEP 1.1: Read/write event_participants (on_stage zone) with fallback to event_entities

export default function AdminEventLineup() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState("");

  // Check if user can view this event's lineup
  const { data: canViewLineup, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["can-view-event-lineup", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_view_event_lineup", { p_event_id: id });
      return data ?? false;
    },
    enabled: !!id,
  });
  
  // Load entity types from database
  const { data: entityTypes } = useEntityTypes();

  // Get config for a type
  const getConfig = (type: EntityType) => {
    return entityTypes?.length
      ? getEntityTypeConfig(type, entityTypes) || getDefaultEntityTypeConfig(type)
      : getDefaultEntityTypeConfig(type);
  };

  // Fetch event info
  const { data: event } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug")
        .eq("id", id)
        .single();
      return data;
    },
  });

  // NEW ROLE MODEL STEP 1.1: Fetch lineup from event_participants first, fallback to event_entities
  const { data: lineup, isLoading } = useQuery({
    queryKey: ["admin-event-lineup", id],
    queryFn: async () => {
      // Try event_participants (on_stage zone) first
      const { data: participants } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", id)
        .eq("zone", "on_stage")
        .order("sort_order", { ascending: true });

      if (participants && participants.length > 0) {
        // Resolve entity data for participants
        const entityIds = participants
          .filter((p) => p.participant_kind === "project" || p.participant_kind === "entity")
          .map((p) => p.participant_id);

        const [entitiesResult, legacyResult] = await Promise.all([
          entityIds.length > 0
            ? supabase.from("entities").select("*").in("id", entityIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from("event_entities")
            .select("entity_id, is_featured")
            .eq("event_id", id),
        ]);

        const entitiesMap = new Map((entitiesResult.data || []).map((e: any) => [e.id, e]));
        const featuredByEntityId = new Map((legacyResult.data || []).map((r: any) => [r.entity_id, !!r.is_featured]));

        return participants.map((p) => ({
          _source: "participants" as const,
          participant_id: p.participant_id,
          entity_id: p.participant_id,
          event_id: p.event_id,
          billing_order: p.sort_order,
          is_featured: featuredByEntityId.get(p.participant_id) ?? false,
          feature_order: 0,
          entity: entitiesMap.get(p.participant_id) || null,
          role_label: p.role_label,
        }));
      }

      // Fallback: legacy event_entities
      const { data } = await supabase
        .from("event_entities")
        .select("*, entity:entities(*)")
        .eq("event_id", id)
        .order("billing_order", { ascending: true });
      return (data || []).map((d) => ({ ...d, _source: "legacy" as const }));
    },
  });

  // Detect which source we're using
  const isUsingParticipants = lineup && lineup.length > 0 && lineup[0]._source === "participants";

  // Fetch all entities (solo + band) for adding - exclude venues and system entities
  const { data: allEntities } = useQuery({
    queryKey: ["admin-all-entities-lineup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("entities")
        .select("id, name, type")
        .in("type", ["solo", "band"])
        .eq("is_system", false)
        .order("name");
      return data || [];
    },
  });

  // NEW ROLE MODEL STEP 1.1: Add to lineup writes to event_participants
  const addToLineup = useMutation({
    mutationFn: async (entityId: string) => {
      const maxOrder = lineup?.length || 0;
      
      // Always write to event_participants (new model)
      const { error: participantError } = await supabase.from("event_participants").insert({
        event_id: id,
        participant_id: entityId,
        participant_kind: "entity",
        zone: "on_stage",
        sort_order: maxOrder,
        is_public: true,
      });
      if (participantError) throw participantError;

      // Also write to legacy event_entities for backward compatibility
      const { error: legacyError } = await supabase.from("event_entities").insert({
        event_id: id,
        entity_id: entityId,
        billing_order: maxOrder,
        is_featured: false,
        feature_order: 0,
      });
      // Don't throw on legacy error (might be duplicate)
      if (legacyError) console.warn("Legacy event_entities insert failed:", legacyError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
      setSelectedEntity("");
      toast({ title: "Artist lagt til" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // NEW ROLE MODEL STEP 1.1: Remove from lineup
  const removeFromLineup = useMutation({
    mutationFn: async (entityId: string) => {
      // Remove from both tables
      await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", id)
        .eq("participant_id", entityId)
        .eq("zone", "on_stage");

      const { error } = await supabase
        .from("event_entities")
        .delete()
        .eq("event_id", id)
        .eq("entity_id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
      toast({ title: "Artist fjernet" });
    },
  });

  // Toggle featured mutation (still uses event_entities for now)
  const toggleFeatured = useMutation({
    mutationFn: async ({ entityId, isFeatured }: { entityId: string; isFeatured: boolean }) => {
      const featuredCount = lineup?.filter((l) => l.is_featured).length || 0;
      const { error } = await supabase
        .from("event_entities")
        .update({
          is_featured: isFeatured,
          feature_order: isFeatured ? featuredCount : 0,
        })
        .eq("event_id", id)
        .eq("entity_id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
    },
  });

  // NEW ROLE MODEL STEP 1.1: Move in lineup updates both tables
  const moveInLineup = useMutation({
    mutationFn: async ({ entityId, direction }: { entityId: string; direction: "up" | "down" }) => {
      const currentItem = lineup?.find((l) => l.entity_id === entityId);
      if (!currentItem || !lineup) return;

      const currentOrder = currentItem.billing_order;
      const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapItem = lineup.find((l) => l.billing_order === newOrder);

      if (!swapItem) return;

      // Update event_participants
      await supabase
        .from("event_participants")
        .update({ sort_order: newOrder })
        .eq("event_id", id)
        .eq("participant_id", entityId)
        .eq("zone", "on_stage");
      await supabase
        .from("event_participants")
        .update({ sort_order: currentOrder })
        .eq("event_id", id)
        .eq("participant_id", swapItem.entity_id)
        .eq("zone", "on_stage");

      // Update legacy event_entities
      await supabase
        .from("event_entities")
        .update({ billing_order: newOrder })
        .eq("event_id", id)
        .eq("entity_id", entityId);
      await supabase
        .from("event_entities")
        .update({ billing_order: currentOrder })
        .eq("event_id", id)
        .eq("entity_id", swapItem.entity_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
    },
  });

  // Available entities (not in lineup)
  const availableEntities = allEntities?.filter(
    (e) => !lineup?.some((l) => l.entity_id === e.id)
  ) || [];

  if (isLoading || isLoadingAccess) {
    return <LoadingState message="Laster på scenen..." />;
  }

  if (canViewLineup === false) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/events/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">På scenen</h1>
          <p className="text-muted-foreground">{event?.title}</p>
        </div>
      </div>

      {/* Add to lineup */}
      <div className="flex gap-3">
        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Velg artist..." />
          </SelectTrigger>
          <SelectContent>
            {availableEntities.map((entity) => {
              const config = getConfig(entity.type as EntityType);
              return (
                <SelectItem key={entity.id} value={entity.id}>
                  <span className="flex items-center gap-2">
                    <EntityTypeIcon iconKey={config.icon_key} />
                    {entity.name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          onClick={() => selectedEntity && addToLineup.mutate(selectedEntity)}
          disabled={!selectedEntity}
        >
          <Plus className="h-4 w-4 mr-2" />
          Legg til
        </Button>
      </div>

      {/* Lineup list */}
      <div className="space-y-2">
        {lineup?.map((item, index) => {
          const config = item.entity ? getConfig(item.entity.type as EntityType) : null;
          
          return (
            <div
              key={item.entity_id}
              className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
            >
              <span className="text-muted-foreground w-8 text-center">{index + 1}</span>
              
              <div className="flex items-center gap-2">
                {config && <EntityTypeIcon iconKey={config.icon_key} />}
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.entity?.name}</p>
                {item.entity?.tagline && (
                  <p className="text-sm text-muted-foreground">{item.entity.tagline}</p>
                )}
              </div>

              <Badge variant="secondary" className="text-xs">
                {config?.label_nb || item.entity?.type}
              </Badge>

              {/* Featured toggle */}
              <Button
                variant={item.is_featured ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleFeatured.mutate({
                  entityId: item.entity_id,
                  isFeatured: !item.is_featured,
                })}
              >
                <Star className={`h-4 w-4 ${item.is_featured ? "fill-current" : ""}`} />
              </Button>

              {/* Move buttons */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveInLineup.mutate({ entityId: item.entity_id, direction: "up" })}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveInLineup.mutate({ entityId: item.entity_id, direction: "down" })}
                  disabled={index === lineup.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Fjern fra lineup?")) {
                    removeFromLineup.mutate(item.entity_id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}

        {lineup?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p>Ingen artister på scenen ennå.</p>
            <p className="text-sm mt-2">Velg en artist fra listen over for å legge til.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <Star className="h-4 w-4 inline mr-1" /> = Featured artist (vises i festival-artister-seksjonen)
        </p>
      </div>
    </div>
  );
}
