import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Globe, Building2, Music, PartyPopper } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityTypes, usePlatformEntity } from "@/hooks/useEntityTypes";
import { getEntityTypeConfig, getDefaultEntityTypeConfig } from "@/lib/entity-types";
import { EntityTypeIcon } from "@/components/ui/EntityTypeIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessLevel, Entity } from "@/types/database";
import { ContextualInviteModal } from "@/components/invite/ContextualInviteModal";
import { inferEntityKind } from "@/lib/role-model-helpers";

type InviteMode = "platform" | "host" | "project" | "festival";

const ACCESS_OPTIONS: { value: Exclude<AccessLevel, 'owner'>; label: string; description: string }[] = [
  { value: "admin", label: "Administrer", description: "Full tilgang til å redigere og administrere" },
  { value: "editor", label: "Rediger", description: "Kan redigere innhold" },
  { value: "viewer", label: "Se", description: "Kun lesetilgang" },
];

export default function AdminAccessGenerator() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get("mode");
  const initialEntityId = searchParams.get("entityId");

  const [inviteMode, setInviteMode] = useState<InviteMode>(
    initialMode === "host" ? "host"
      : initialMode === "project" ? "project"
      : initialMode === "entity" ? "project"
      : initialMode === "festival" ? "festival"
      : "platform"
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntityId || "");
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, 'owner'>>("admin");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [initialEntityLoaded, setInitialEntityLoaded] = useState(!initialEntityId);

  const { data: entityTypes } = useEntityTypes();
  const { data: platformEntity } = usePlatformEntity();

  const getConfig = (type: string): ReturnType<typeof getDefaultEntityTypeConfig> => {
    if (entityTypes?.length) {
      const config = getEntityTypeConfig(type, entityTypes);
      if (config) return config;
    }
    const safeType = (type === 'venue' || type === 'solo' || type === 'band') ? type : 'solo';
    return getDefaultEntityTypeConfig(safeType);
  };

  // Load initial entity from URL param
  useEffect(() => {
    const loadInitialEntity = async () => {
      if (!initialEntityId) return;
      const { data, error } = await supabase
        .from("entities")
        .select("id, type, entity_kind")
        .eq("id", initialEntityId)
        .maybeSingle();
      if (!error && data) {
        setSelectedEntityId(data.id);
        const kind = inferEntityKind(data);
        setInviteMode(kind === "host" ? "host" : "project");
      }
      setInitialEntityLoaded(true);
    };
    loadInitialEntity();
  }, [initialEntityId]);

  // Fetch entities grouped by kind
  const activeEntityKind = inviteMode === "host" ? "host" : inviteMode === "project" ? "project" : null;

  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["admin-entities-for-invite", activeEntityKind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type, tagline, entity_kind")
        .eq("is_system", false)
        .order("name", { ascending: true });
      if (error) throw error;
      // Filter by inferred entity_kind
      return (data as (Entity & { entity_kind?: string | null })[]).filter(
        (e) => inferEntityKind(e) === activeEntityKind
      );
    },
    enabled: !!activeEntityKind && initialEntityLoaded,
  });

  // Fetch festivals
  const { data: festivals, isLoading: festivalsLoading } = useQuery({
    queryKey: ["admin-festivals-for-invite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: inviteMode === "festival",
  });

  const selectedEntity = entities?.find((e) => e.id === selectedEntityId);
  const selectedFestival = festivals?.find((f) => f.id === selectedFestivalId);

  // Build invite target
  const inviteTarget = (() => {
    if (inviteMode === "platform" && platformEntity) {
      return { entityId: platformEntity.id, label: "GIGGEN-plattformen" };
    }
    if ((inviteMode === "host" || inviteMode === "project") && selectedEntity) {
      return { entityId: selectedEntity.id, label: selectedEntity.name };
    }
    if (inviteMode === "festival" && selectedFestival) {
      return {
        entityId: "festival",
        label: selectedFestival.name,
        festivalId: selectedFestivalId,
        newUserInviteEntityId: platformEntity?.id ?? null,
      };
    }
    return null;
  })();

  const canOpenInvite = !!inviteTarget;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserPlus className="h-8 w-8" />
          Generer tilgangslenke
        </h1>
        <p className="text-muted-foreground mt-1">
          Opprett en invitasjonslenke for å gi noen tilgang
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitasjonstype</CardTitle>
          <CardDescription>
            Velg hva du vil invitere til
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={inviteMode === "platform" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setInviteMode("platform");
                setSelectedEntityId("");
                setSelectedFestivalId("");
              }}
            >
              <Globe className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Plattform</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Generell tilgang til GIGGEN
                </div>
              </div>
            </Button>
            <Button
              type="button"
              variant={inviteMode === "host" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setInviteMode("host");
                setSelectedEntityId("");
                setSelectedFestivalId("");
              }}
            >
              <Building2 className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Scene / Arrangør</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Tilgang til en host
                </div>
              </div>
            </Button>
            <Button
              type="button"
              variant={inviteMode === "project" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setInviteMode("project");
                setSelectedEntityId("");
                setSelectedFestivalId("");
              }}
            >
              <Music className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Prosjekt</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Tilgang til et prosjekt
                </div>
              </div>
            </Button>
            <Button
              type="button"
              variant={inviteMode === "festival" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setInviteMode("festival");
                setSelectedEntityId("");
                setSelectedFestivalId("");
              }}
            >
              <PartyPopper className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Festival</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Tilgang til et festival-team
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entity selection (host or project mode) */}
      {(inviteMode === "host" || inviteMode === "project") && (
        <Card>
          <CardHeader>
            <CardTitle>
              {inviteMode === "host" ? "Velg scene / arrangør" : "Velg prosjekt"}
            </CardTitle>
            <CardDescription>
              {inviteMode === "host"
                ? "Velg hvilken scene eller arrangør brukeren skal få tilgang til"
                : "Velg hvilket prosjekt brukeren skal få tilgang til"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entitiesLoading ? (
              <LoadingState message="Laster..." />
            ) : (
              <Select
                value={selectedEntityId}
                onValueChange={setSelectedEntityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={inviteMode === "host" ? "Velg scene / arrangør..." : "Velg prosjekt..."} />
                </SelectTrigger>
                <SelectContent>
                  {entities?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Ingen {inviteMode === "host" ? "scener/arrangører" : "prosjekter"} funnet
                    </div>
                  ) : (
                    entities?.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <div className="flex items-center gap-2">
                          <span>{entity.name}</span>
                          {entity.tagline && (
                            <span className="text-muted-foreground text-xs">
                              – {entity.tagline}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedEntity && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{getConfig(selectedEntity.type).label_nb}</Badge>
                <span className="text-sm text-muted-foreground">
                  {getConfig(selectedEntity.type).public_route_base}/{selectedEntity.slug}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Festival selection */}
      {inviteMode === "festival" && (
        <Card>
          <CardHeader>
            <CardTitle>Velg festival</CardTitle>
            <CardDescription>
              Velg hvilken festival brukeren skal få tilgang til
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {festivalsLoading ? (
              <LoadingState message="Laster..." />
            ) : (
              <Select
                value={selectedFestivalId}
                onValueChange={setSelectedFestivalId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg festival..." />
                </SelectTrigger>
                <SelectContent>
                  {festivals?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Ingen festivaler funnet
                    </div>
                  ) : (
                    festivals?.map((festival) => (
                      <SelectItem key={festival.id} value={festival.id}>
                        {festival.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedFestival && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">Festival</Badge>
                <span className="text-sm text-muted-foreground">
                  /festival/{selectedFestival.slug}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite action */}
      <Card>
        <CardHeader>
          <CardTitle>Inviter</CardTitle>
          <CardDescription>
            Velg tilgangsnivå, så åpne invitasjonsflyten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="access">Tilgangsnivå</Label>
            <Select
              value={accessLevel}
              onValueChange={(value) => setAccessLevel(value as Exclude<AccessLevel, 'owner'>)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        – {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setInviteModalOpen(true)}
            disabled={!canOpenInvite}
            className="w-full gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Åpne invitasjonsflyt
          </Button>
        </CardContent>
      </Card>

      {inviteTarget && (
        <ContextualInviteModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          target={inviteTarget}
          accessLevel={accessLevel}
        />
      )}
    </div>
  );
}
