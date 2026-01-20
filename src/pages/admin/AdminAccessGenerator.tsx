import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link2, UserPlus, Check, Building2, User, Users } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EntityType, AccessLevel, Entity } from "@/types/database";

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

export default function AdminAccessGenerator() {
  const { toast } = useToast();
  const createInvitation = useCreateInvitation();

  const [entityType, setEntityType] = useState<EntityType>("solo");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, 'owner'>>("admin");
  const [email, setEmail] = useState("");
  const [roleLabels, setRoleLabels] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch entities filtered by type
  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["admin-entities-for-invite", entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type, tagline")
        .eq("type", entityType)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Entity[];
    },
  });

  const selectedEntity = entities?.find((e) => e.id === selectedEntityId);

  const handleGenerate = async () => {
    if (!selectedEntityId || !email) {
      toast({ 
        title: "Feil", 
        description: "Velg en entity og fyll inn e-post", 
        variant: "destructive" 
      });
      return;
    }

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

    try {
      const user = await getAuthenticatedUser();
      const roles = roleLabels
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const invitation = await createInvitation.mutateAsync({
        entityId: selectedEntityId,
        email,
        access: accessLevel,
        roleLabels: roles,
        invitedBy: user.id,
      });

      // Generate the invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/accept-invitation?email=${encodeURIComponent(email)}&entity_id=${selectedEntityId}`;
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserPlus className="h-8 w-8" />
          Generer tilgangslenke
        </h1>
        <p className="text-muted-foreground mt-1">
          Opprett en invitasjonslenke for å gi noen tilgang til en entity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitasjonsdetaljer</CardTitle>
          <CardDescription>
            Velg entity, tilgangsnivå og mottakers e-post
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
              placeholder="artist@example.com"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedEntityId || !email || createInvitation.isPending}
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {createInvitation.isPending ? "Genererer..." : "Generer invitasjonslenke"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {generatedLink && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
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
              Mottakeren kan bruke denne lenken for å opprette konto eller logge inn og få tilgang til entity.
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
