import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, UserPlus, ExternalLink, Users, Sparkles, Info } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EntityTimelineManager } from "@/components/dashboard/EntityTimelineManager";
import { EntityPersonaBindingsEditor } from "@/components/admin/EntityPersonaBindingsEditor";
import type { EntityType, AccessLevel, ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

// Tydeligere prosjekt-type labels med ikoner
const TYPE_LABELS: Record<EntityType, string> = {
  venue: "🏛️ Scene",
  solo: "🎤 Artistprosjekt",
  band: "🎸 Band",
};

// Beskrivelser for hver prosjekt-type
const TYPE_DESCRIPTIONS: Record<EntityType, string> = {
  venue: "En scene eller venue hvor events arrangeres.",
  solo: "Dette er det du opptrer som. Publikum ser dette navnet.",
  band: "Et band eller kollektiv du er del av.",
};

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
};

export default function EntityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    hero_image_url: "",
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);

  // Fetch entity with user's access level
  const { data: entityWithAccess, isLoading, error } = useQuery({
    queryKey: ["dashboard-entity", id],
    queryFn: async () => {
      // First get the entity
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (entityError) throw entityError;
      if (!entity) return null;

      // Then get user's access level from entity_team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: teamMember, error: teamError } = await supabase
        .from("entity_team")
        .select("access")
        .eq("entity_id", id)
        .eq("user_id", user.id)
        .is("left_at", null)
        .maybeSingle();

      if (teamError) throw teamError;
      
      // If user is creator (owner) but not in entity_team, they're still the owner
      const isCreator = entity.created_by === user.id;
      const access = teamMember?.access || (isCreator ? "owner" : null);

      if (!access) {
        throw new Error("No access to this entity");
      }

      return { ...entity, access: access as AccessLevel };
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch team members with personas
  const { data: teamMembers } = useQuery({
    queryKey: ["entity-team", id],
    queryFn: async () => {
      const { data: teamData, error } = await supabase
        .from("entity_team")
        .select(`
          *,
          profile:profiles(id, display_name, handle, avatar_url)
        `)
        .eq("entity_id", id)
        .is("left_at", null)
        .order("joined_at", { ascending: true });
      
      if (error) throw error;
      
      // Fetch personas for each team member
      const userIds = teamData?.map(m => m.user_id) || [];
      if (userIds.length === 0) return [];
      
      const { data: personasData } = await supabase
        .from("personas")
        .select("id, user_id, name, avatar_url, slug")
        .in("user_id", userIds);
      
      // Map personas to team members
      return (teamData || []).map(member => ({
        ...member,
        persona: personasData?.find(p => p.user_id === member.user_id) || null
      }));
    },
    enabled: !!id,
  });

  // Populate form when entity data loads
  useEffect(() => {
    if (entityWithAccess) {
      setFormData({
        name: entityWithAccess.name || "",
        tagline: entityWithAccess.tagline || "",
        description: entityWithAccess.description || "",
        hero_image_url: entityWithAccess.hero_image_url || "",
      });
      // Parse hero_image_settings from JSONB
      setHeroImageSettings(parseImageSettings(entityWithAccess.hero_image_settings) || null);
    }
  }, [entityWithAccess]);

  // Save mutation - includes hero_image_settings JSONB
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("entities")
        .update({
          name: formData.name,
          tagline: formData.tagline || null,
          description: formData.description || null,
          hero_image_url: formData.hero_image_url || null,
          hero_image_settings: heroImageSettings,
        } as Record<string, unknown>)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-entity", id] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      toast({ title: "Endringene er lagret" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Redirect if no access
  useEffect(() => {
    if (error) {
      toast({ title: "Ingen tilgang", description: "Du har ikke tilgang til dette prosjektet.", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [error, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!entityWithAccess) {
    return null;
  }

  const isVenue = entityWithAccess.type === "venue";
  const userAccess = entityWithAccess.access;
  const canEdit = ["editor", "admin", "owner"].includes(userAccess);
  const canInvite = ["admin", "owner"].includes(userAccess);
  const canManagePersonas = ["admin", "owner"].includes(userAccess);
  const isReadOnly = !canEdit;
  const isViewer = userAccess === "viewer";

  // Viewers see limited fields - they're team members but not editors
  const viewerFields = ["name", "tagline", "description", "hero_image_url"];
  const showField = (fieldName: string) => {
    if (canEdit) return true;
    return viewerFields.includes(fieldName);
  };

  const typeConfig = {
    venue: { route: "/project" },
    solo: { route: "/project" },
    band: { route: "/project" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-foreground">
            GIGGEN
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Link>
          </Button>
        </div>

        {/* Entity header with badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {entityWithAccess.name}
            </h1>
            <Badge variant="secondary">{TYPE_LABELS[entityWithAccess.type as EntityType]}</Badge>
            <Badge variant="outline">{ACCESS_LABELS[userAccess]}</Badge>
            {!entityWithAccess.is_published && (
              <Badge variant="outline" className="text-muted-foreground">Utkast</Badge>
            )}
          </div>
          {isViewer && (
            <p className="text-sm text-muted-foreground">
              Du har lesetilgang til dette prosjektet.
            </p>
          )}
        </div>

        {/* Info-boks om prosjekt-typen */}
        <Alert className="bg-accent/5 border-accent/20">
          <Info className="h-4 w-4 text-accent" />
          <AlertDescription className="text-sm">
            <strong className="text-foreground">{TYPE_LABELS[entityWithAccess.type as EntityType]}</strong>
            <span className="text-muted-foreground"> – {TYPE_DESCRIPTIONS[entityWithAccess.type as EntityType]}</span>
          </AlertDescription>
        </Alert>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {entityWithAccess.is_published && (
            <Button asChild variant="outline" size="sm">
              <Link to={`${typeConfig[entityWithAccess.type as EntityType].route}/${entityWithAccess.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Se offentlig side
              </Link>
            </Button>
          )}
          {canInvite && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/entities/${entityWithAccess.id}/invite`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Link>
            </Button>
          )}
        </div>

        {/* Edit form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canEdit) {
              saveMutation.mutate();
            }
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            {showField("name") && (
              <div className="space-y-2">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isVenue ? "Venue navn" : "Artist/band navn"}
                  disabled={isReadOnly}
                  required={canEdit}
                />
              </div>
            )}

            {showField("tagline") && (
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Kort beskrivelse (én linje)"
                  disabled={isReadOnly}
                />
              </div>
            )}

            {showField("description") && (
              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Full beskrivelse..."
                  rows={4}
                  disabled={isReadOnly}
                />
              </div>
            )}

            {showField("hero_image_url") && (
              <div className="space-y-2">
                <Label>Hero-bilde</Label>
                {canEdit ? (
                  <InlineMediaPickerWithCrop
                    value={formData.hero_image_url}
                    imageSettings={heroImageSettings}
                    onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
                    onSettingsChange={setHeroImageSettings}
                    cropMode="hero"
                    placeholder="Velg hero-bilde"
                    useNaturalAspect
                  />
                ) : (
                  formData.hero_image_url && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img 
                        src={formData.hero_image_url} 
                        alt="Hero preview" 
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )
                )}
                <p className="text-xs text-muted-foreground">
                  Velg bilde og juster fokuspunkt for beste visning
                </p>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Lagrer..." : "Lagre endringer"}
              </Button>
            </div>
          )}
        </form>

        {/* Timeline section - for editors, admins, owners */}
        <EntityTimelineManager
          entityId={entityWithAccess.id}
          canEdit={canEdit}
        />

        {/* Personer bak prosjektet – admin/owner only */}
        {canManagePersonas && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Personer bak prosjektet</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Velg hvilke profiler som skal vises offentlig på prosjektsiden.
            </p>
            <EntityPersonaBindingsEditor
              entityId={entityWithAccess.id}
              entityName={entityWithAccess.name}
            />
          </div>
        )}

        {/* Team members section */}
        {teamMembers && teamMembers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Team-medlemmer</h2>
            </div>
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const profile = member.profile as { id: string; display_name?: string; handle?: string; avatar_url?: string } | null;
                const persona = member.persona as { id: string; name: string; avatar_url?: string; slug?: string } | null;
                
                // Prioritize persona name, fallback to profile, then "Ingen navn"
                const displayName = persona?.name || profile?.display_name || profile?.handle || "Ingen navn";
                const avatarUrl = persona?.avatar_url || profile?.avatar_url;
                
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{displayName}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {ACCESS_LABELS[member.access as AccessLevel]}
                        </Badge>
                        {member.role_labels && member.role_labels.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {member.role_labels.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info about publishing */}
        {!entityWithAccess.is_published ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Utkast:</strong> Dette prosjektet er ikke publisert ennå. 
              Kontakt en administrator for å få det publisert.
            </p>
          </div>
        ) : (
          <Alert className="bg-accent/5 border-accent/20">
            <Info className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm text-muted-foreground">
              Dette prosjektet kan bli lagt til events av festivalen.
              Du trenger kun å holde prosjektet oppdatert med riktig informasjon, 
              bilder og beskrivelse. Festivalen setter sammen programmet.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
