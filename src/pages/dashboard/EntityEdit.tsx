import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { EntityTimelineManager } from "@/components/dashboard/EntityTimelineManager";
import { EntityPersonaBindingsEditor } from "@/components/admin/EntityPersonaBindingsEditor";
import { 
  Save, 
  UserPlus, 
  ExternalLink, 
  Users, 
  Sparkles, 
  Info, 
  Trash2,
  ChevronDown,
  Image,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  // Collapsible states
  const [basicOpen, setBasicOpen] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  // Fetch entity with user's access level
  const { data: entityWithAccess, isLoading, error } = useQuery({
    queryKey: ["dashboard-entity", id],
    queryFn: async () => {
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (entityError) throw entityError;
      if (!entity) return null;

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
      
      const userIds = teamData?.map(m => m.user_id) || [];
      if (userIds.length === 0) return [];
      
      const { data: personasData } = await supabase
        .from("personas")
        .select("id, user_id, name, avatar_url, slug")
        .in("user_id", userIds);
      
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
      setHeroImageSettings(parseImageSettings(entityWithAccess.hero_image_settings) || null);
    }
  }, [entityWithAccess]);

  // Save mutation
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

  // Request deletion mutation
  const requestDeletion = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Ingen ID");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");
      
      const { error } = await supabase.from("deletion_requests").insert({
        entity_type: "entity",
        entity_id: id,
        requested_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Forespørsel sendt", description: "Admin vil vurdere din forespørsel om sletting." });
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
  const isViewer = userAccess === "viewer";

  const typeConfig = {
    venue: { route: "/project" },
    solo: { route: "/project" },
    band: { route: "/project" },
  };

  return (
    <div className="container max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          GIGGEN BACKSTAGE
        </p>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {entityWithAccess.name}
          </h1>
          <Badge variant="secondary" className="text-xs">{TYPE_LABELS[entityWithAccess.type as EntityType]}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{ACCESS_LABELS[userAccess]}</Badge>
          {!entityWithAccess.is_published && (
            <Badge variant="outline" className="text-xs text-warning border-warning/30">Utkast</Badge>
          )}
        </div>
        {isViewer && (
          <p className="text-sm text-muted-foreground mt-2">
            Du har lesetilgang til dette prosjektet.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-6">
        {entityWithAccess.is_published && (
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to={`${typeConfig[entityWithAccess.type as EntityType].route}/${entityWithAccess.slug}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Se offentlig side
            </Link>
          </Button>
        )}
        {canInvite && (
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to={`/dashboard/entities/${entityWithAccess.id}/invite`}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Inviter
            </Link>
          </Button>
        )}
        {canEdit && (
          <Button 
            variant="default" 
            size="sm" 
            className="text-xs"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? "Lagrer..." : "Lagre"}
          </Button>
        )}
      </div>

      {/* Info alert */}
      <Alert className="bg-accent/5 border-accent/20 mb-6">
        <Info className="h-4 w-4 text-accent" />
        <AlertDescription className="text-sm">
          <strong className="text-foreground">{TYPE_LABELS[entityWithAccess.type as EntityType]}</strong>
          <span className="text-muted-foreground"> – {TYPE_DESCRIPTIONS[entityWithAccess.type as EntityType]}</span>
        </AlertDescription>
      </Alert>

      <div className="space-y-0">
        {/* Grunnleggende */}
        <Collapsible open={basicOpen} onOpenChange={setBasicOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="font-medium">Grunnleggende</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${basicOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground text-xs uppercase tracking-wide">Navn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={isVenue ? "Venue navn" : "Artist/band navn"}
                disabled={!canEdit}
                required={canEdit}
                className="bg-transparent border-border/50 focus:border-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="text-muted-foreground text-xs uppercase tracking-wide">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                placeholder="Kort beskrivelse (én linje)"
                disabled={!canEdit}
                className="bg-transparent border-border/50 focus:border-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-muted-foreground text-xs uppercase tracking-wide">Beskrivelse</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Full beskrivelse..."
                rows={4}
                disabled={!canEdit}
                className="bg-transparent border-border/50 focus:border-accent resize-none"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Media / Hero-bilde */}
        <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Image className="h-4 w-4 text-accent" />
              <span className="font-medium">Hero-bilde</span>
              {formData.hero_image_url && <span className="text-xs text-muted-foreground">(valgt)</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mediaOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-3 border-b border-border/30">
            <p className="text-sm text-muted-foreground">
              Velg bilde og juster fokuspunkt for beste visning.
            </p>
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
          </CollapsibleContent>
        </Collapsible>

        {/* Historien / Timeline */}
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-accent" />
              <span className="font-medium">{isVenue ? "Historien" : "Milepæler"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${timelineOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 border-b border-border/30">
            <p className="text-sm text-muted-foreground mb-4">
              {isVenue ? "Viktige hendelser i scenens historie" : "Viktige øyeblikk i prosjektets reise"}
            </p>
            <EntityTimelineManager
              entityId={entityWithAccess.id}
              canEdit={canEdit}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Personer bak prosjektet */}
        {canManagePersonas && (
          <Collapsible open={peopleOpen} onOpenChange={setPeopleOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="font-medium">Personer bak prosjektet</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${peopleOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 border-b border-border/30">
              <EntityPersonaBindingsEditor
                entityId={entityWithAccess.id}
                entityName={entityWithAccess.name}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Team-medlemmer */}
        {teamMembers && teamMembers.length > 0 && (
          <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-medium">Team-medlemmer</span>
                <span className="text-xs text-muted-foreground">({teamMembers.length})</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${teamOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 space-y-2 border-b border-border/30">
              {teamMembers.map((member) => {
                const profile = member.profile as { id: string; display_name?: string; handle?: string; avatar_url?: string } | null;
                const persona = member.persona as { id: string; name: string; avatar_url?: string; slug?: string } | null;
                
                const displayName = persona?.name || profile?.display_name || profile?.handle || "Ingen navn";
                const avatarUrl = persona?.avatar_url || profile?.avatar_url;
                
                return (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{displayName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{ACCESS_LABELS[member.access as AccessLevel]}</span>
                          {member.role_labels && member.role_labels.length > 0 && (
                            <span className="text-xs text-accent">{member.role_labels.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Farlig sone */}
        {canEdit && (
          <Collapsible open={dangerOpen} onOpenChange={setDangerOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-destructive transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive/70" />
                <span className="font-medium text-destructive/70">Farlig sone</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dangerOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 border-b border-border/30">
              <p className="text-sm text-muted-foreground mb-4">
                Handlinger her kan ikke angres uten hjelp fra administrator.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Be om sletting av prosjekt
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Be om sletting?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil sende en forespørsel til admin om å slette prosjektet "{formData.name}".
                      <br /><br />
                      Admin vil vurdere forespørselen og du vil få beskjed når den er behandlet.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => requestDeletion.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={requestDeletion.isPending}
                    >
                      {requestDeletion.isPending ? "Sender..." : "Send forespørsel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Publishing info at bottom */}
      <div className="mt-8">
        {!entityWithAccess.is_published ? (
          <Alert className="bg-muted/50 border-border/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm text-muted-foreground">
              <strong>Utkast:</strong> Dette prosjektet er ikke publisert ennå. 
              Kontakt en administrator for å få det publisert.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-accent/5 border-accent/20">
            <Info className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm text-muted-foreground">
              Dette prosjektet kan bli lagt til events av festivalen.
              Du trenger kun å holde prosjektet oppdatert med riktig informasjon, 
              bilder og beskrivelse.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
