import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link2, UserPlus, Check, Building2, User, Users, Globe } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EntityType, AccessLevel, Entity } from "@/types/database";

const PLATFORM_ENTITY_SLUG = "giggen-platform";

type InviteMode = "platform" | "entity";

const TYPE_OPTIONS: { value: EntityType; label: string; icon: typeof Building2 }[] = [
  { value: "venue", label: "Venue", icon: Building2 },
  { value: "solo", label: "Solo", icon: User },
  { value: "band", label: "Band", icon: Users },
];

const ACCESS_OPTIONS: { value: Exclude<AccessLevel, 'owner'>; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full tilgang til å redigere og administrere" },
  { value: "editor", label: "Redaktør", description: "Kan redigere innhold" },
  { value: "viewer", label: "Leser", description: "Kun lesetilgang" },
];

// Helper function to get or create platform entity
async function getOrCreatePlatformEntity(userId: string): Promise<string> {
  // First, try to find existing platform entity
  const { data: existing } = await supabase
    .from("entities")
    .select("id")
    .eq("slug", PLATFORM_ENTITY_SLUG)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create platform entity if it doesn't exist
  const { data: created, error } = await supabase
    .from("entities")
    .insert({
      type: "venue" as EntityType,
      name: "GIGGEN Platform",
      slug: PLATFORM_ENTITY_SLUG,
      tagline: "Generell plattformtilgang",
      is_published: false,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Kunne ikke opprette platform-entity: ${error.message}`);
  }

  return created.id;
}

export default function AdminAccessGenerator() {
  const { toast } = useToast();
  const createInvitation = useCreateInvitation();

  const [inviteMode, setInviteMode] = useState<InviteMode>("platform");
  const [entityType, setEntityType] = useState<EntityType>("solo");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, 'owner'>>("admin");
  const [email, setEmail] = useState("");
  const [roleLabels, setRoleLabels] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch entities filtered by type (exclude platform entity)
  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["admin-entities-for-invite", entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type, tagline")
        .eq("type", entityType)
        .neq("slug", PLATFORM_ENTITY_SLUG)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Entity[];
    },
    enabled: inviteMode === "entity",
  });

  const selectedEntity = entities?.find((e) => e.id === selectedEntityId);

  const handleGenerate = async () => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ 
        title: "Ugyldig e-post", 
        description: "Skriv inn en gyldig e-postadresse", 
        variant: "destructive" 
      });
      return;
    }

    // For entity mode, require selected entity
    if (inviteMode === "entity" && !selectedEntityId) {
      toast({ 
        title: "Feil", 
        description: "Velg en entity", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const user = await getAuthenticatedUser();
      const roles = roleLabels
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      // Get entity ID - either selected or platform
      let entityIdToUse = selectedEntityId;
      if (inviteMode === "platform") {
        entityIdToUse = await getOrCreatePlatformEntity(user.id);
      }

      await createInvitation.mutateAsync({
        entityId: entityIdToUse,
        email,
        access: accessLevel,
        roleLabels: roles,
        invitedBy: user.id,
      });

      // Generate the invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/accept-invitation?email=${encodeURIComponent(email)}&entity_id=${entityIdToUse}`;
      setGeneratedLink(link);

      toast({ title: "Invitasjon opprettet!" });
    } catch (error: any) {
      toast({ 
        title: "Feil", 
        description: error.message || "Kunne ikke opprette invitasjon", 
        variant: "destructive" 
      });
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: "Lenke kopiert!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ 
        title: "Kunne ikke kopiere", 
        description: "Kopier lenken manuelt", 
        variant: "destructive" 
      });
    }
  };

  const resetForm = () => {
    setSelectedEntityId("");
    setEmail("");
    setRoleLabels("");
    setGeneratedLink(null);
    setCopied(false);
  };

  const canGenerate = email && (inviteMode === "platform" || selectedEntityId);

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
            Velg om du vil invitere til plattformen generelt eller en spesifikk entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite mode selector */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={inviteMode === "platform" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setInviteMode("platform");
                setSelectedEntityId("");
              }}
            >
              <Globe className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Generell invitasjon</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Tilgang til GIGGEN-plattformen
                </div>
              </div>
            </Button>
            <Button
              type="button"
              variant={inviteMode === "entity" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setInviteMode("entity")}
            >
              <Users className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Entity-invitasjon</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Tilgang til spesifikk entity
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entity selection (only for entity mode) */}
      {inviteMode === "entity" && (
        <Card>
          <CardHeader>
            <CardTitle>Velg entity</CardTitle>
            <CardDescription>
              Velg hvilken entity brukeren skal få tilgang til
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entity type selector */}
            <div className="space-y-2">
              <Label>Entity-type</Label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = entityType === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        setEntityType(option.value);
                        setSelectedEntityId("");
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Entity selector */}
            <div className="space-y-2">
              <Label htmlFor="entity">Velg entity</Label>
              {entitiesLoading ? (
                <LoadingState message="Laster..." />
              ) : (
                <Select
                  value={selectedEntityId}
                  onValueChange={setSelectedEntityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg entity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities?.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Ingen {entityType === 'venue' ? 'venues' : 'artister'} funnet
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
                  <Badge variant="outline">{selectedEntity.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    /{selectedEntity.type === 'venue' ? 'venue' : 'project'}/{selectedEntity.slug}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitation details */}
      <Card>
        <CardHeader>
          <CardTitle>Invitasjonsdetaljer</CardTitle>
          <CardDescription>
            Velg tilgangsnivå og mottakers e-post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Access level */}
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

          {/* Role labels */}
          <div className="space-y-2">
            <Label htmlFor="roles">Roller (valgfritt)</Label>
            <Input
              id="roles"
              value={roleLabels}
              onChange={(e) => setRoleLabels(e.target.value)}
              placeholder="bassist, fotograf, booking (komma-separert)"
            />
            <p className="text-xs text-muted-foreground">
              Valgfrie roller som vises på team-listen
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-postadresse</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bruker@example.com"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || createInvitation.isPending}
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {createInvitation.isPending ? "Genererer..." : "Generer invitasjonslenke"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {generatedLink && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-accent-foreground flex items-center gap-2">
              <Check className="h-5 w-5" />
              Invitasjonslenke generert!
            </CardTitle>
            <CardDescription>
              Kopier lenken og send den til {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={generatedLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                variant={copied ? "default" : "outline"}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Mottakeren kan bruke denne lenken for å opprette konto eller logge inn og få tilgang.
            </p>
            <Button variant="outline" onClick={resetForm} className="w-full">
              Generer ny invitasjon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
