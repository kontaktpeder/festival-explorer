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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Clock,
  AlertTriangle,
  Building2,
  Link2,
  MapPin,
  Shield,
  LogOut,
  ArrowLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EntityType, AccessLevel, ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { getPublicUrl } from "@/lib/utils";
import type { SocialLink } from "@/types/social";
import { LOCATION_TYPE_OPTIONS, type LocationType } from "@/types/location";

const TYPE_LABELS: Record<EntityType, string> = {
  venue: "Scene",
  solo: "Artistprosjekt",
  band: "Band",
};

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
};

type ActivePanel = null | "basic" | "location" | "social" | "timeline" | "danger";

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
  
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<LocationType | "">("");

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: myPersonas } = useMyPersonas();

  const updateTeamMember = useUpdateTeamMember();
  const setEntityTeamPersona = useSetEntityTeamPersona();
  const transferOwnership = useTransferEntityOwnership();
  const leaveEntity = useLeaveEntity();
  const removeTeamMember = useRemoveTeamMember();

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
      setLocationName((entityWithAccess as any).location_name || "");
      setLocationType((entityWithAccess as any).location_type || "");
    }
  }, [entityWithAccess]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const locationData = locationName.trim()
        ? { location_name: locationName.trim(), location_type: locationType || null }
        : { location_name: null, location_type: null };

      const updatePayload: Record<string, any> = {
        name: formData.name,
        tagline: formData.tagline || null,
        description: formData.description || null,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        logo_url: formData.logo_url || null,
        logo_image_settings: logoImageSettings,
        social_links: socialLinks,
        ...locationData,
      };

      const { data, error } = await supabase
        .from("entities")
        .update(updatePayload)
        .eq("id", id!)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-entity", id] });
      queryClient.invalidateQueries({ queryKey: ["entity", data?.id] });
      queryClient.invalidateQueries({ queryKey: ["entity-by-slug"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["my-entities-filtered"] });
      toast({ title: "Endringene er lagret" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const requestDeletion = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");
      const { error } = await supabase
        .from("deletion_requests")
        .insert({ entity_id: id!, entity_type: "entity", requested_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Forespørsel sendt", description: "Admin vil vurdere din forespørsel om sletting." });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (error) {
      toast({ title: "Ingen tilgang", description: "Du har ikke tilgang til dette prosjektet.", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [error, navigate, toast]);

  const handleTransferOwnership = () => {
    if (!transferTargetId || !id) return;
    transferOwnership.mutate(
      { entityId: id, newOwnerEntityTeamId: transferTargetId },
      {
        onSuccess: async () => {
          setTransferTargetId(null);
          await queryClient.refetchQueries({ queryKey: ["dashboard-entity", id] });
          await queryClient.refetchQueries({ queryKey: ["entity-team", id] });
          await queryClient.refetchQueries({ queryKey: ["my-entities"] });
          await queryClient.refetchQueries({ queryKey: ["my-entities-filtered"] });
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
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!entityWithAccess) return null;

  const isVenue = entityWithAccess.type === "venue";
  const userAccess = entityWithAccess.access;
  const canEdit = ["editor", "admin", "owner"].includes(userAccess);
  const canInvite = ["admin", "owner"].includes(userAccess);
  const canManagePersonas = ["admin", "owner"].includes(userAccess);
  const isOwner = userAccess === "owner";

  const typeConfig = {
    venue: { route: "/project" },
    solo: { route: "/project" },
    band: { route: "/project" },
  };

  const heroStyles = getCroppedImageStyles(heroImageSettings);
  const otherMembers = teamMembers?.filter(m => m.user_id !== currentUser?.id) || [];
  const hasOtherMembers = otherMembers.length > 0;

  const modules: { key: ActivePanel; title: string; description: string; icon: React.ElementType; danger?: boolean }[] = [
    { key: "basic", title: "Grunnleggende", description: "Navn, bio, bilder og logo", icon: Building2 },
    { key: "location", title: "Lokasjon", description: locationName || "Sted og type", icon: MapPin },
    { key: "social", title: "Sosiale lenker", description: `${socialLinks.length} lenke${socialLinks.length !== 1 ? "r" : ""}`, icon: Link2 },
    { key: "timeline", title: isVenue ? "Historien" : "Min reise", description: "Viktige hendelser og milepæler", icon: Clock },
    ...(canEdit ? [{ key: "danger" as ActivePanel, title: "Farlig sone", description: "Eierskap, forlat, slett", icon: AlertTriangle, danger: true }] : []),
  ];

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Sticky header – matching FestivalRoom */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE
            </span>
          </div>
          <div className="flex items-center gap-2">
            {entityWithAccess.is_published && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <a href={`${getPublicUrl()}${typeConfig[entityWithAccess.type as EntityType].route}/${entityWithAccess.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Se live
                </a>
              </Button>
            )}
            {canInvite && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/dashboard/entities/${entityWithAccess.id}/invite`}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Inviter
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant={entityWithAccess.is_published ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {entityWithAccess.is_published ? "Publisert" : "Utkast"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[entityWithAccess.type as EntityType]} · {ACCESS_LABELS[userAccess]}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
              {entityWithAccess.name}
            </h1>
            {entityWithAccess.tagline && (
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl">
                {entityWithAccess.tagline}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main
        className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6 sm:space-y-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        {/* Team – always visible at the top */}
        {teamMembers && teamMembers.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Team
            </h2>
            <div className="space-y-1">
              {teamMembers.map((member) => {
                const persona = member.persona as { id: string; name: string; avatar_url?: string; slug?: string } | null;
                const isCurrentUser = member.user_id === currentUser?.id;
                const displayName = persona?.name || "Ingen navn";
                const avatarUrl = persona?.avatar_url;
                const roleLabel = member.bindingRoleLabel || (member.role_labels?.length > 0 ? member.role_labels.join(", ") : null);

                return (
                  <div
                    key={member.id}
                    className="group relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-accent">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {ACCESS_LABELS[(isCurrentUser ? (entityWithAccess?.access ?? member.access) : member.access) as AccessLevel]}
                            </span>
                            {roleLabel && <span className="text-xs text-accent">{roleLabel}</span>}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">deg</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManagePersonas && !isCurrentUser && member.access !== 'owner' && (
                          <Select
                            value={member.access}
                            onValueChange={(value) => updateTeamMember.mutate({ id: member.id, access: value as AccessLevel })}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs bg-background border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrer</SelectItem>
                              <SelectItem value="editor">Rediger</SelectItem>
                              <SelectItem value="viewer">Se</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {isCurrentUser && (
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

                    {isCurrentUser && myPersonas && myPersonas.length > 0 && id && (
                      <div className="mt-3 ml-12 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Representert som:</span>
                        <Select
                          value={member.persona_id || ""}
                          onValueChange={(personaId) => {
                            if (personaId) {
                              setEntityTeamPersona.mutate({ entityId: id, personaId });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background border-border/50 flex-1 max-w-[240px] gap-2">
                            {(() => {
                              const selected = myPersonas.find((p) => p.id === (member.persona_id || ""));
                              return selected ? (
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="h-5 w-5 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {selected.avatar_url ? (
                                      <img src={selected.avatar_url} alt={selected.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-medium text-accent">{selected.name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </span>
                                  <span className="truncate">{selected.name}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Velg persona...</span>
                              );
                            })()}
                          </SelectTrigger>
                          <SelectContent>
                            {myPersonas.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span className="h-5 w-5 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {p.avatar_url ? (
                                      <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-medium text-accent">{p.name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </span>
                                  <span>{p.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Module grid */}
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Innstillinger
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.key}
                  onClick={() => setActivePanel(mod.key)}
                  className={`group relative rounded-xl border bg-card/60 backdrop-blur-sm p-4 text-left transition-all duration-300 cursor-pointer ${
                    mod.danger
                      ? "border-destructive/20 hover:border-destructive/40 hover:bg-card/80"
                      : "border-border/30 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      mod.danger
                        ? "bg-destructive/10 group-hover:bg-destructive/20"
                        : "bg-accent/10 group-hover:bg-accent/20"
                    }`}>
                      <Icon className={`h-5 w-5 transition-colors duration-300 ${
                        mod.danger ? "text-destructive/70" : "text-accent"
                      }`} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 ${mod.danger ? "text-destructive/70" : "text-foreground"}`}>
                    {mod.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Save button */}
        {canEdit && (
          <div className="pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saveMutation.isPending ? "Lagrer..." : "Lagre endringer"}
            </Button>
          </div>
        )}

        {/* Unpublished alert */}
        {!entityWithAccess.is_published && (
          <Alert className="bg-muted/50 border-border/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm text-muted-foreground">
              <strong>Utkast:</strong> Dette prosjektet er ikke publisert ennå.
              Kontakt en administrator for å få det publisert.
            </AlertDescription>
          </Alert>
        )}
      </main>

      {/* Panel dialogs for each module */}
      <Dialog open={activePanel === "basic"} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Grunnleggende
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50 rounded-lg">
                <AvatarImage src={formData.hero_image_url || undefined} style={heroStyles} className="object-cover" />
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
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50 rounded-lg">
                {formData.logo_url ? <AvatarImage src={formData.logo_url} className="object-contain p-1" /> : null}
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Navn *</Label>
              <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder={isVenue ? "Venue navn" : "Artist/band navn"} disabled={!canEdit} required={canEdit} className="bg-background border-border/50 focus:border-accent" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Tagline</Label>
              <Input value={formData.tagline} onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))} placeholder="Kort beskrivelse (én linje)" disabled={!canEdit} className="bg-background border-border/50 focus:border-accent" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Bio</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Full beskrivelse..." rows={4} disabled={!canEdit} className="bg-background border-border/50 focus:border-accent resize-none" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "location"} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Lokasjon
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {isVenue ? "Hvor ligger scenen?" : "Hvor er prosjektet basert?"}
            </p>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Sted</Label>
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="F.eks. Oslo, Norge eller Josefines gate 16" disabled={!canEdit} className="bg-background border-border/50 focus:border-accent" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Type (valgfritt)</Label>
              <Select value={locationType || "none"} onValueChange={(val) => setLocationType(val === "none" ? "" : val as LocationType)} disabled={!canEdit}>
                <SelectTrigger className="w-full bg-background border-border/50">
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
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "social"} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-accent" />
              Sosiale lenker
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} disabled={!canEdit} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "timeline"} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              {isVenue ? "Historien" : "Min reise"}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <UnifiedTimelineManager
              source={{ type: "entity", id: entityWithAccess.id }}
              canEdit={canEdit}
              eventTypeOptions={isVenue ? VENUE_EVENT_TYPE_OPTIONS : PERSONA_EVENT_TYPE_OPTIONS}
              title={isVenue ? "Historien" : "Tidslinje"}
              helperText={isVenue ? "Viktige hendelser i scenens historie" : "Viktige øyeblikk i prosjektets reise"}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "danger"} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Farlig sone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Handlinger her kan ikke angres uten hjelp fra administrator.
            </p>

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
                    <SelectTrigger className="flex-1 h-9 text-sm bg-background border-border/50">
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
                      <Button type="button" variant="outline" size="sm" disabled={!transferTargetId || transferOwnership.isPending} className="border-destructive/50 text-destructive hover:bg-destructive/10">
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
                        <AlertDialogAction onClick={handleTransferOwnership} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

            {!isOwner && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Du er ikke eier. Du kan når som helst forlate prosjektet.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
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
                      <AlertDialogAction onClick={handleLeaveProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={leaveEntity.isPending}>
                        {leaveEntity.isPending ? "Forlater..." : "Forlat"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

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
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={() => requestDeletion.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={requestDeletion.isPending}>
                    {requestDeletion.isPending ? "Sender..." : "Send forespørsel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
