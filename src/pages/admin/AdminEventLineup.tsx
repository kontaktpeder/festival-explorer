import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { useState } from "react";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { getEntityTypeConfig, getDefaultEntityTypeConfig } from "@/lib/entity-types";
import { EntityTypeIcon } from "@/components/ui/EntityTypeIcon";
import { PersonaSearchList } from "@/components/persona/PersonaSearchList";
import type { EntityType } from "@/types/database";

type Zone = "on_stage" | "backstage" | "host";

const ZONE_LABELS: Record<Zone, string> = {
  on_stage: "På scenen",
  backstage: "Bak scenen",
  host: "Arrangør",
};

export default function AdminEventLineup() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState("");
  const [activeZone, setActiveZone] = useState<Zone>("on_stage");
  const [personaSearch, setPersonaSearch] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const { data: canViewLineup, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["can-view-event-lineup", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_view_event_lineup", { p_event_id: id });
      return data ?? false;
    },
    enabled: !!id,
  });

  const { data: entityTypes } = useEntityTypes();

  const getConfig = (type: EntityType) => {
    return entityTypes?.length
      ? getEntityTypeConfig(type, entityTypes) || getDefaultEntityTypeConfig(type)
      : getDefaultEntityTypeConfig(type);
  };

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

  // Fetch ALL participants for this event (all zones)
  const { data: allParticipants, isLoading } = useQuery({
    queryKey: ["admin-event-participants-all", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", id)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  // Resolve persona and entity data
  const participantIds = allParticipants?.map((p) => p.participant_id) || [];
  const personaIds = allParticipants?.filter((p) => p.participant_kind === "persona").map((p) => p.participant_id) || [];
  const entityIds = allParticipants?.filter((p) => p.participant_kind === "entity").map((p) => p.participant_id) || [];

  const { data: resolvedPersonas } = useQuery({
    queryKey: ["resolved-personas", personaIds],
    queryFn: async () => {
      if (personaIds.length === 0) return [];
      const { data } = await supabase.from("personas").select("id, name, slug, avatar_url, category_tags").in("id", personaIds);
      return data || [];
    },
    enabled: personaIds.length > 0,
  });

  const { data: resolvedEntities } = useQuery({
    queryKey: ["resolved-entities-lineup", entityIds],
    queryFn: async () => {
      if (entityIds.length === 0) return [];
      const { data } = await supabase.from("entities").select("id, name, slug, type, tagline").in("id", entityIds);
      return data || [];
    },
    enabled: entityIds.length > 0,
  });

  const personaMap = new Map((resolvedPersonas || []).map((p) => [p.id, p]));
  const entityMap = new Map((resolvedEntities || []).map((e) => [e.id, e]));

  // Legacy on_stage lineup (for fallback display)
  const { data: legacyLineup } = useQuery({
    queryKey: ["admin-event-legacy-lineup", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_entities")
        .select("*, entity:entities(*)")
        .eq("event_id", id)
        .order("billing_order", { ascending: true });
      return data || [];
    },
  });

  // Get participants for current zone
  const zoneParticipants = (allParticipants || []).filter((p) => p.zone === activeZone);

  // For on_stage: if no participants, show legacy
  const onStageHasParticipants = (allParticipants || []).some((p) => p.zone === "on_stage");
  const showLegacyFallback = activeZone === "on_stage" && !onStageHasParticipants && (legacyLineup || []).length > 0;

  // All entities for on_stage adding
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

  // All personas for backstage/host adding
  const { data: searchablePersonas } = useQuery({
    queryKey: ["searchable-personas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("personas")
        .select("id, name, slug, avatar_url, category_tags")
        .eq("is_public", true)
        .order("name");
      return data || [];
    },
  });

  // Add participant
  const addParticipant = useMutation({
    mutationFn: async ({ participantId, kind, zone }: { participantId: string; kind: string; zone: Zone }) => {
      // Check duplicates
      const existing = (allParticipants || []).find(
        (p) => p.event_id === id && p.zone === zone && p.participant_kind === kind && p.participant_id === participantId
      );
      if (existing) {
        throw new Error("Allerede lagt til");
      }

      const maxOrder = Math.max(0, ...(allParticipants || []).filter((p) => p.zone === zone).map((p) => p.sort_order));

      const { error } = await supabase.from("event_participants").insert({
        event_id: id,
        participant_id: participantId,
        participant_kind: kind,
        zone,
        sort_order: maxOrder + 1,
        is_public: true,
        role_label: roleLabel || null,
      });
      if (error) throw error;

      // Also write to legacy event_entities for on_stage backward compatibility
      if (zone === "on_stage" && kind === "entity") {
        await supabase.from("event_entities").insert({
          event_id: id,
          entity_id: participantId,
          billing_order: maxOrder + 1,
          is_featured: false,
          feature_order: 0,
        }).then(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-participants-all", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-event-legacy-lineup", id] });
      setSelectedEntity("");
      setRoleLabel("");
      toast({ title: "Lagt til" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Remove participant
  const removeParticipant = useMutation({
    mutationFn: async ({ participantId, zone }: { participantId: string; zone: Zone }) => {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", id)
        .eq("participant_id", participantId)
        .eq("zone", zone);
      if (error) throw error;

      // Also remove from legacy if on_stage
      if (zone === "on_stage") {
        await supabase.from("event_entities").delete().eq("event_id", id).eq("entity_id", participantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-participants-all", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-event-legacy-lineup", id] });
      toast({ title: "Fjernet" });
    },
  });

  // Move participant
  const moveParticipant = useMutation({
    mutationFn: async ({ participantId, direction, zone }: { participantId: string; direction: "up" | "down"; zone: Zone }) => {
      const zoneItems = (allParticipants || []).filter((p) => p.zone === zone).sort((a, b) => a.sort_order - b.sort_order);
      const currentIndex = zoneItems.findIndex((p) => p.participant_id === participantId);
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= zoneItems.length) return;

      const current = zoneItems[currentIndex];
      const swap = zoneItems[swapIndex];

      await Promise.all([
        supabase.from("event_participants").update({ sort_order: swap.sort_order }).eq("id", current.id),
        supabase.from("event_participants").update({ sort_order: current.sort_order }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-participants-all", id] });
    },
  });

  // Toggle featured (on_stage only, via legacy event_entities)
  const toggleFeatured = useMutation({
    mutationFn: async ({ entityId, isFeatured }: { entityId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("event_entities")
        .update({ is_featured: isFeatured })
        .eq("event_id", id)
        .eq("entity_id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-legacy-lineup", id] });
    },
  });

  const availableEntities = allEntities?.filter(
    (e) => !zoneParticipants.some((p) => p.participant_id === e.id)
  ) || [];

  if (isLoading || isLoadingAccess) {
    return <LoadingState message="Laster medvirkende..." />;
  }

  if (canViewLineup === false) {
    return <Navigate to="/admin" replace />;
  }

  const renderParticipantRow = (item: typeof allParticipants[0], index: number, list: typeof allParticipants) => {
    const persona = personaMap.get(item.participant_id);
    const entity = entityMap.get(item.participant_id);
    const displayName = item.participant_kind === "persona" ? persona?.name : entity?.name;
    const displayRole = item.role_label || (item.participant_kind === "persona" && persona?.category_tags?.[0]) || null;

    return (
      <div key={item.id} className="bg-card border border-border rounded-lg p-3 md:p-4 flex items-center gap-3 md:gap-4">
        <span className="text-muted-foreground w-6 text-center text-sm">{index + 1}</span>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{displayName || "Ukjent"}</p>
          {displayRole && (
            <p className="text-xs text-muted-foreground truncate">{displayRole}</p>
          )}
        </div>

        <Badge variant="outline" className="text-[10px] shrink-0">
          {item.participant_kind === "persona" ? "Persona" : "Entitet"}
        </Badge>

        {/* Move buttons */}
        <div className="flex gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveParticipant.mutate({ participantId: item.participant_id, direction: "up", zone: activeZone })} disabled={index === 0}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveParticipant.mutate({ participantId: item.participant_id, direction: "down", zone: activeZone })} disabled={index === list.length - 1}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
          if (confirm(`Fjern ${displayName} fra ${ZONE_LABELS[activeZone]}?`)) {
            removeParticipant.mutate({ participantId: item.participant_id, zone: activeZone });
          }
        }}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medvirkende</h1>
          <p className="text-muted-foreground text-sm">{event?.title}</p>
        </div>
      </div>

      <Tabs value={activeZone} onValueChange={(v) => setActiveZone(v as Zone)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="on_stage">På scenen</TabsTrigger>
          <TabsTrigger value="backstage">Bak scenen</TabsTrigger>
          <TabsTrigger value="host">Arrangør</TabsTrigger>
        </TabsList>

        {/* On Stage tab */}
        <TabsContent value="on_stage" className="space-y-4 mt-4">
          {/* Add entity to on_stage */}
          <div className="flex gap-2">
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
            <Button onClick={() => selectedEntity && addParticipant.mutate({ participantId: selectedEntity, kind: "entity", zone: "on_stage" })} disabled={!selectedEntity}>
              <Plus className="h-4 w-4 mr-1" />
              Legg til
            </Button>
          </div>

          {/* On_stage list */}
          <div className="space-y-2">
            {zoneParticipants.map((item, index) => renderParticipantRow(item, index, zoneParticipants))}
            {showLegacyFallback && legacyLineup?.map((item, index) => {
              const config = item.entity ? getConfig(item.entity.type as EntityType) : null;
              return (
                <div key={item.entity_id} className="bg-card border border-border rounded-lg p-3 md:p-4 flex items-center gap-3 md:gap-4 opacity-60">
                  <span className="text-muted-foreground w-6 text-center text-sm">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.entity?.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Legacy</Badge>
                </div>
              );
            })}
            {zoneParticipants.length === 0 && !showLegacyFallback && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                <p>Ingen artister på scenen ennå.</p>
                <p className="text-sm mt-2">Velg en artist fra listen over for å legge til.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Backstage + Host tabs share persona-based adding */}
        {(["backstage", "host"] as Zone[]).map((zone) => (
          <TabsContent key={zone} value={zone} className="space-y-4 mt-4">
            {/* Add persona */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Rolle (valgfritt)"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="border border-border rounded-lg overflow-hidden max-h-[300px]">
                <PersonaSearchList
                  personas={
                    (searchablePersonas || []).filter(
                      (p) => !(allParticipants || []).some(
                        (ap) => ap.zone === zone && ap.participant_id === p.id
                      )
                    ) as any
                  }
                  onSelect={(personaId) => {
                    addParticipant.mutate({ participantId: personaId, kind: "persona", zone });
                  }}
                  placeholder="Søk etter persona..."
                  emptyMessage="Ingen personas funnet"
                />
              </div>
            </div>

            {/* Zone list */}
            <div className="space-y-2">
              {(allParticipants || []).filter((p) => p.zone === zone).map((item, index, list) => renderParticipantRow(item, index, list))}
              {(allParticipants || []).filter((p) => p.zone === zone).length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p>Ingen {ZONE_LABELS[zone].toLowerCase()} ennå.</p>
                  <p className="text-sm mt-2">Søk og velg en persona fra listen over.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
