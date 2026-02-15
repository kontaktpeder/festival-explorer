import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { UnifiedTimelineManager } from "@/components/dashboard/UnifiedTimelineManager";
import { PERSONA_EVENT_TYPE_OPTIONS, VENUE_EVENT_TYPE_OPTIONS } from "@/lib/timeline-config";
import { useUpdateTeamMember, useSetEntityTeamPersona, useTransferEntityOwnership, useLeaveEntity, useRemoveTeamMember } from "@/hooks/useEntityMutations";
import { useMyPersonas } from "@/hooks/usePersona";
import { ProjectCreditFlow } from "@/components/dashboard/ProjectCreditFlow";
import { SocialLinksEditor } from "@/components/ui/SocialLinksEditor";
import { 
  UserPlus, 
  ExternalLink, 
  Users, 
  Info, 
  Trash2,
  ChevronDown,
  Clock,
  AlertTriangle,
  Building2,
  Link2,
  MapPin,
  Shield,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EntityType, AccessLevel, ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { getPublicUrl } from "@/lib/utils";
import type { SocialLink } from "@/types/social";
import { LOCATION_TYPE_OPTIONS, type LocationType } from "@/types/location";

// Tydeligere prosjekt-type labels
const TYPE_LABELS: Record<EntityType, string> = {
  venue: "Scene",
  solo: "Artistprosjekt",
  band: "Band",
};

const TYPE_ICONS: Record<EntityType, string> = {
  venue: "",
  solo: "",
  band: "",
};

// Beskrivelser for header
const TYPE_SUBTITLES: Record<EntityType, string> = {
  venue: "Din scene på GIGGEN",
  solo: "Ditt artistprosjekt på GIGGEN",
  band: "Ditt band på GIGGEN",
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
    logo_url: "",
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);
  const [logoImageSettings, setLogoImageSettings] = useState<ImageSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  
  // Location fields
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<LocationType | "">("");

  // Collapsible states
  const [basicOpen, setBasicOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  // Transfer ownership dialog state
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  // Current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // My personas for persona selector
  const { data: myPersonas } = useMyPersonas();

  // Mutations
  const updateTeamMember = useUpdateTeamMember();
  const setEntityTeamPersona = useSetEntityTeamPersona();
  const transferOwnership = useTransferEntityOwnership();
  const leaveEntity = useLeaveEntity();
  const removeTeamMember = useRemoveTeamMember();

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
      
      // Always prefer entity_team.access; only fall back to created_by if no team row exists
      const isCreator = entity.created_by === user.id;
      const access = teamMember != null
        ? teamMember.access
        : (isCreator ? "owner" : null);

      if (!access) {
        throw new Error("No access to this entity");
      }

      return { ...entity, access: access as AccessLevel };
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch team members with personas (prefer entity-bound persona)
  const { data: teamMembers } = useQuery({
    queryKey: ["entity-team", id],
    queryFn: async () => {
      const { data: teamData, error } = await supabase
        .from("entity_team")
        .select("*")
        .eq("entity_id", id)
        .is("left_at", null)
        .order("joined_at", { ascending: true });
      
      if (error) throw error;
      
      const userIds = (teamData || []).map(m => m.user_id);
      if (userIds.length === 0) return [];

      // Fetch persona bindings for this entity
      const { data: bindings } = await supabase
        .from("entity_persona_bindings")
        .select("persona_id, role_label")
        .eq("entity_id", id!);

      const bindingPersonaIds = (bindings || []).map(b => b.persona_id);
      
      const { data: personasData } = await supabase
        .from("personas")
        .select("id, user_id, name, avatar_url, slug")
        .or(`user_id.in.(${userIds.join(",")}),id.in.(${bindingPersonaIds.join(",")})`);
      
      return (teamData || []).map(member => {
        // Prefer persona bound to this entity
        const boundBinding = (bindings || []).find(b => {
          const p = (personasData || []).find(p => p.id === b.persona_id);
          return p?.user_id === member.user_id;
        });
        const boundPersona = boundBinding 
          ? (personasData || []).find(p => p.id === boundBinding.persona_id) 
          : null;
        const fallbackPersona = (personasData || []).find(p => p.user_id === member.user_id);
        
        return {
          ...member,
          persona: boundPersona || fallbackPersona || null,
          bindingRoleLabel: boundBinding?.role_label || null,
        };
      });
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
        logo_url: (entityWithAccess as any).logo_url || "",
      });
      setHeroImageSettings(parseImageSettings(entityWithAccess.hero_image_settings) || null);
      setLogoImageSettings(parseImageSettings((entityWithAccess as any).logo_image_settings) || null);
      setSocialLinks(((entityWithAccess as any).social_links || []) as SocialLink[]);
      // Location fields
      setLocationName((entityWithAccess as any).location_name || "");
      setLocationType((entityWithAccess as any).location_type || "");
    }
  }, [entityWithAccess]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Prepare location data
      const locationData = locationName.trim()
        ? {
            location_name: locationName.trim(),
            location_type: locationType || null,
          }
        : {
            location_name: null,
            location_type: null,
          };

      const { error } = await supabase
        .from("entities")
        .update({
          name: formData.name,
          tagline: formData.tagline || null,
          description: formData.description || null,
          hero_image_url: formData.hero_image_url || null,
          hero_image_settings: heroImageSettings,
          logo_url: formData.logo_url || null,
          logo_image_settings: logoImageSettings,
          social_links: socialLinks,
          ...locationData,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canEdit) {
      saveMutation.mutate();
    }
  };

  const handleTransferOwnership = () => {
    if (!transferTargetId || !id) return;
    transferOwnership.mutate(
      { entityId: id, newOwnerEntityTeamId: transferTargetId },
      {
        onSuccess: async () => {
          setTransferTargetId(null);
          // Refetch to ensure fresh data before navigating
          await queryClient.refetchQueries({ queryKey: ["dashboard-entity", id] });
          await queryClient.refetchQueries({ queryKey: ["entity-team", id] });
          toast({ title: "Eierskap overført", description: "Du er nå admin for dette prosjektet." });
          navigate("/dashboard", { replace: true });
        },
        onError: (err: Error) => {
          toast({ title: "Feil", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleLeaveProject = () => {
    if (!id || !currentUser) return;
    const myTeamRow = teamMembers?.find(m => m.user_id === currentUser.id);
    if (!myTeamRow) return;
    leaveEntity.mutate(
      { id: myTeamRow.id, entityId: id },
      {
        onSuccess: () => {
          toast({ title: "Du har forlatt prosjektet" });
          navigate("/dashboard");
        },
        onError: (err: Error) => {
          toast({ title: "Feil", description: err.message, variant: "destructive" });
        },
      }
    );
  };

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
  const isOwner = userAccess === "owner";
  const isViewer = userAccess === "viewer";

  const typeConfig = {
    venue: { route: "/project" },
    solo: { route: "/project" },
    band: { route: "/project" },
  };

  const heroStyles = getCroppedImageStyles(heroImageSettings);

  // Other members for ownership transfer
  const otherMembers = teamMembers?.filter(m => m.user_id !== currentUser?.id) || [];
  const hasOtherMembers = otherMembers.length > 0;

  // Current user's team row
  const myTeamRow = teamMembers?.find(m => m.user_id === currentUser?.id);

  return (
    <div className="container max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header - matching PersonaEdit */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          GIGGEN BACKSTAGE
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Rediger prosjekt
        </h1>
        <p className="text-muted-foreground mt-1">
          {TYPE_SUBTITLES[entityWithAccess.type as EntityType]}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Status row - similar to visibility toggle in PersonaEdit */}
        <div className="flex items-center justify-between py-4 border-b border-accent/20">
          <div>
            <p className="font-medium flex items-center gap-2">
              {TYPE_ICONS[entityWithAccess.type as EntityType]} {TYPE_LABELS[entityWithAccess.type as EntityType]}
            </p>
            <p className="text-sm text-muted-foreground">
              {entityWithAccess.is_published ? "Publisert" : "Utkast"} · {ACCESS_LABELS[userAccess]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {entityWithAccess.is_published && (
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <a href={`${getPublicUrl()}${typeConfig[entityWithAccess.type as EntityType].route}/${entityWithAccess.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Se side
                </a>
              </Button>
            )}
            {canInvite && (
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to={`/dashboard/entities/${entityWithAccess.id}/invite`}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Inviter
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Grunnleggende - with hero image inline like PersonaEdit avatar */}
        <Collapsible open={basicOpen} onOpenChange={setBasicOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="font-medium">Grunnleggende</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${basicOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-5 border-b border-border/30">
            {/* Hero image section - inline like PersonaEdit avatar */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50 rounded-lg">
                <AvatarImage 
                  src={formData.hero_image_url || undefined} 
                  style={heroStyles}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs bg-secondary rounded-lg">
                  {formData.name ? formData.name.substring(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Hero-bilde</Label>
              </div>
              {canEdit && (
                <InlineMediaPickerWithCrop
                  value={formData.hero_image_url}
                  imageSettings={heroImageSettings}
                  onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
                  onSettingsChange={setHeroImageSettings}
                  cropMode="hero"
                  placeholder="Bytt"
                  useNaturalAspect
                  hidePreview
                />
              )}
            </div>

            {/* Projektlogo */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50 rounded-lg">
                {formData.logo_url ? (
                  <AvatarImage src={formData.logo_url} className="object-contain p-1" />
                ) : null}
                <AvatarFallback className="text-[10px] bg-secondary rounded-lg">LOGO</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Projektlogo</Label>
                <p className="text-xs text-muted-foreground">Vises på festivalsiden i stedet for navn.</p>
              </div>
              {canEdit && (
                <InlineMediaPickerWithCrop
                  value={formData.logo_url}
                  imageSettings={logoImageSettings}
                  onChange={(url) => setFormData((prev) => ({ ...prev, logo_url: url }))}
                  onSettingsChange={setLogoImageSettings}
                  cropMode="avatar"
                  placeholder="Velg logo"
                  hidePreview
                />
              )}
            </div>

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
              <Label htmlFor="description" className="text-muted-foreground text-xs uppercase tracking-wide">Bio</Label>
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

        {/* Lokasjon */}
        <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="font-medium">Lokasjon</span>
              {locationName && <span className="text-xs text-muted-foreground">({locationName})</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${locationOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
            <p className="text-sm text-muted-foreground">
              {isVenue ? "Hvor ligger scenen?" : "Hvor er prosjektet basert?"}
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Sted</Label>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="F.eks. Oslo, Norge eller Josefines gate 16"
                  disabled={!canEdit}
                  className="bg-transparent border-border/50 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Type (valgfritt)</Label>
                <Select value={locationType || "none"} onValueChange={(val) => setLocationType(val === "none" ? "" : val as LocationType)} disabled={!canEdit}>
                  <SelectTrigger className="w-full bg-transparent border-border/50">
                    <SelectValue placeholder="Velg type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ikke valgt</SelectItem>
                    {LOCATION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Sosiale lenker */}
        <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Link2 className="h-4 w-4 text-accent" />
              <span className="font-medium">Sosiale lenker</span>
              {socialLinks.length > 0 && <span className="text-xs text-muted-foreground">({socialLinks.length})</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${socialOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 border-b border-border/30">
            <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} disabled={!canEdit} />
          </CollapsibleContent>
        </Collapsible>

        {/* Historien / Timeline */}
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-accent" />
              <span className="font-medium">{isVenue ? "Historien" : "Min reise"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${timelineOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 border-b border-border/30">
            <UnifiedTimelineManager
              source={{ type: "entity", id: entityWithAccess.id }}
              canEdit={canEdit}
              eventTypeOptions={isVenue ? VENUE_EVENT_TYPE_OPTIONS : PERSONA_EVENT_TYPE_OPTIONS}
              title={isVenue ? "Historien" : "Tidslinje"}
              helperText={isVenue ? "Viktige hendelser i scenens historie" : "Viktige øyeblikk i prosjektets reise"}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Team-medlemmer */}
        {teamMembers && teamMembers.length > 0 && (
          <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-medium">Team</span>
                <span className="text-xs text-muted-foreground">({teamMembers.length})</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${teamOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 space-y-2 border-b border-border/30">
              {teamMembers.map((member) => {
                const persona = member.persona as { id: string; name: string; avatar_url?: string; slug?: string } | null;
                const isCurrentUser = member.user_id === currentUser?.id;
                
                const displayName = persona?.name || "Ingen navn";
                const avatarUrl = persona?.avatar_url;
                const roleLabel = member.bindingRoleLabel || (member.role_labels?.length > 0 ? member.role_labels.join(", ") : null);
                
                return (
                  <div key={member.id} className="py-3 border-b border-border/20 last:border-0 space-y-2">
                    <div className="flex items-center justify-between">
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
                            {roleLabel && (
                              <span className="text-xs text-accent">{roleLabel}</span>
                            )}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">deg</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Role dropdown for other members (admin/owner only, not for owner role) */}
                        {canManagePersonas && !isCurrentUser && member.access !== 'owner' && (
                          <Select
                            value={member.access}
                            onValueChange={(value) => updateTeamMember.mutate({ id: member.id, access: value as AccessLevel })}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-transparent border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrer</SelectItem>
                              <SelectItem value="editor">Rediger</SelectItem>
                              <SelectItem value="viewer">Se</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canManagePersonas && (
                          <ProjectCreditFlow
                            memberId={member.id}
                            entityId={entityWithAccess?.id}
                            entityName={entityWithAccess?.name ?? ""}
                            personaId={persona?.id}
                            personaSlug={persona?.slug}
                            isPublic={!!member.is_public}
                          />
                        )}
                      </div>
                    </div>

                    {/* Persona selector for current user's own row */}
                    {isCurrentUser && myPersonas && myPersonas.length > 0 && id && (
                      <div className="ml-11 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Representert som:</span>
                        <Select
                          value={member.persona_id || ""}
                          onValueChange={(personaId) => {
                            if (personaId) {
                              setEntityTeamPersona.mutate({ entityId: id, personaId });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-transparent border-border/50 flex-1 max-w-[200px]">
                            <SelectValue placeholder="Velg persona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {myPersonas.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
            <CollapsibleContent className="py-5 space-y-6 border-b border-border/30">
              <p className="text-sm text-muted-foreground">
                Handlinger her kan ikke angres uten hjelp fra administrator.
              </p>

              {/* Transfer ownership (only for owner) */}
              {isOwner && hasOtherMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Overfør eierskap</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Velg et teammedlem som skal bli ny eier. Du vil bli admin.
                  </p>
                  <div className="flex items-center gap-2">
                    <Select value={transferTargetId || ""} onValueChange={setTransferTargetId}>
                      <SelectTrigger className="flex-1 h-9 text-sm bg-transparent border-border/50">
                        <SelectValue placeholder="Velg nytt eier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherMembers.map((m) => {
                          const p = m.persona as { name: string } | null;
                          return (
                            <SelectItem key={m.id} value={m.id}>
                              {p?.name || "Ukjent"} ({ACCESS_LABELS[m.access as AccessLevel]})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!transferTargetId || transferOwnership.isPending}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          {transferOwnership.isPending ? "Overfører..." : "Overfør"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Overfør eierskap?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Det valgte teammedlemmet vil bli ny eier av prosjektet. Du vil bli admin. Denne handlingen kan ikke angres.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleTransferOwnership}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Bekreft overføring
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {isOwner && !hasOtherMembers && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Overfør eierskap</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Du er eneste medlem. Inviter noen til teamet før du kan overføre eierskap.
                  </p>
                </div>
              )}

              {/* Leave project (for non-owners) */}
              {!isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Forlat prosjektet
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Forlat prosjektet?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Du vil miste tilgangen til "{formData.name}". En admin eller eier kan invitere deg tilbake senere.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLeaveProject}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={leaveEntity.isPending}
                      >
                        {leaveEntity.isPending ? "Forlater..." : "Forlat"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Request deletion (for owner/editor) */}
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

        {/* Bottom buttons - matching PersonaEdit exactly */}
        {canEdit && (
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saveMutation.isPending ? "Lagrer..." : "Lagre endringer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="sm:w-auto"
            >
              Avbryt
            </Button>
          </div>
        )}
      </form>

      {/* Info alert at bottom */}
      {!entityWithAccess.is_published && (
        <Alert className="mt-8 bg-muted/50 border-border/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong>Utkast:</strong> Dette prosjektet er ikke publisert ennå. 
            Kontakt en administrator for å få det publisert.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
