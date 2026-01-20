import { useParams, Link } from "react-router-dom";
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

export default function AdminEventLineup() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState("");
  
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

  // Fetch lineup from event_entities (NEW)
  const { data: lineup, isLoading } = useQuery({
    queryKey: ["admin-event-lineup", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_entities")
        .select("*, entity:entities(*)")
        .eq("event_id", id)
        .order("billing_order", { ascending: true });
      return data || [];
    },
  });

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

  // Add to lineup mutation
  const addToLineup = useMutation({
    mutationFn: async (entityId: string) => {
      const maxOrder = lineup?.length || 0;
      const { error } = await supabase.from("event_entities").insert({
        event_id: id,
        entity_id: entityId,
        billing_order: maxOrder,
        is_featured: false,
        feature_order: 0,
      });
      if (error) throw error;
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

  // Remove from lineup mutation
  const removeFromLineup = useMutation({
    mutationFn: async (entityId: string) => {
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

  // Toggle featured mutation
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

  // Move in lineup mutation
  const moveInLineup = useMutation({
    mutationFn: async ({ entityId, direction }: { entityId: string; direction: "up" | "down" }) => {
      const currentItem = lineup?.find((l) => l.entity_id === entityId);
      if (!currentItem || !lineup) return;

      const currentOrder = currentItem.billing_order;
      const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapItem = lineup.find((l) => l.billing_order === newOrder);

      if (!swapItem) return;

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

  if (isLoading) {
    return <LoadingState message="Laster lineup..." />;
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
          <h1 className="text-3xl font-bold text-foreground">Lineup</h1>
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
            <p>Ingen artister i lineup ennå.</p>
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
