import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, X, ChevronDown, Users, Trash2, User, Sparkles, Clock, Link2, MapPin, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail as MailIcon } from "lucide-react";
import { 
  usePersonaById, 
  useCreatePersona, 
  useUpdatePersona,
  PERSONA_CATEGORIES 
} from "@/hooks/usePersona";
import { useMyEntities } from "@/hooks/useEntity";
import { usePersonaEntityBindings, useCreatePersonaBinding, useDeletePersonaBinding } from "@/hooks/usePersonaBindings";
import { LoadingState } from "@/components/ui/LoadingState";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { PersonaTimelineManager } from "@/components/dashboard/PersonaTimelineManager";
import { SocialLinksEditor } from "@/components/ui/SocialLinksEditor";
import { parseImageSettings, type ImageSettings, type AccessLevel } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import type { SocialLink } from "@/types/social";
import { toast } from "sonner";
import { AVAILABLE_FOR_OPTIONS, type AvailableForKey } from "@/types/availability";
import { LOCATION_TYPE_OPTIONS, type LocationType } from "@/types/location";

export default function PersonaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { data: existingPersona, isLoading: isLoadingPersona } = usePersonaById(id);
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarImageSettings, setAvatarImageSettings] = useState<ImageSettings | null>(null);
  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [customTag, setCustomTag] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  
  // New fields: available_for and location
  const [availableFor, setAvailableFor] = useState<AvailableForKey[]>([]);
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<LocationType | "">("");
  
  // Contact visibility fields
  const [showEmail, setShowEmail] = useState(false);
  const [publicEmail, setPublicEmail] = useState("");

  // Collapsible states
  const [basicOpen, setBasicOpen] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  // Project bindings state
  const { data: personaBindings } = usePersonaEntityBindings(id);
  const { data: myEntities } = useMyEntities();
  const createPersonaBinding = useCreatePersonaBinding();
  const deletePersonaBinding = useDeletePersonaBinding();

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [bindingRoleLabel, setBindingRoleLabel] = useState("");
  const [bindingIsPublic, setBindingIsPublic] = useState(true);

  // Split entities by access level
  const editableEntities = (myEntities || []).filter((entity) => {
    const access = (entity as { access?: AccessLevel }).access;
    return access === "owner" || access === "admin" || access === "editor";
  });

  const viewerOnlyEntities = (myEntities || []).filter((entity) => {
    const access = (entity as { access?: AccessLevel }).access;
    return access === "viewer";
  });

  // Entities I can EDIT that this persona is NOT already bound to
  const availableEntitiesForBinding = editableEntities.filter(
    (entity) => !(personaBindings || []).some((b) => b.entity_id === entity.id)
  );

  const handleAddToProject = async () => {
    if (!id || !selectedEntityId) {
      toast.error("Velg et prosjekt først");
      return;
    }

    try {
      await createPersonaBinding.mutateAsync({
        entity_id: selectedEntityId,
        persona_id: id,
        is_public: bindingIsPublic,
        role_label: bindingRoleLabel || undefined,
      });
      toast.success("Profil lagt til i prosjekt");
      setSelectedEntityId("");
      setBindingRoleLabel("");
      setBindingIsPublic(true);
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke legge til i prosjekt");
    }
  };

  const handleRemoveFromProject = async (bindingId: string, entityId: string) => {
    if (!id) return;
    try {
      await deletePersonaBinding.mutateAsync({ id: bindingId, entityId, personaId: id });
      toast.success("Profil fjernet fra prosjekt");
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke fjerne fra prosjekt");
    }
  };

  // Load existing persona data
  useEffect(() => {
    if (existingPersona) {
      setName(existingPersona.name);
      setBio(existingPersona.bio || "");
      setAvatarUrl(existingPersona.avatar_url || "");
      setAvatarImageSettings(parseImageSettings(existingPersona.avatar_image_settings) || null);
      setCategoryTags(existingPersona.category_tags || []);
      setIsPublic(existingPersona.is_public);
      setSocialLinks(((existingPersona as any).social_links || []) as SocialLink[]);
      // New fields
      setAvailableFor(((existingPersona as any).available_for || []) as AvailableForKey[]);
      setLocationName((existingPersona as any).location_name || "");
      setLocationType((existingPersona as any).location_type || "");
      // Contact visibility
      setShowEmail((existingPersona as any).show_email || false);
      setPublicEmail((existingPersona as any).public_email || "");
    }
  }, [existingPersona]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Navn er påkrevd");
      return;
    }

    // Validate contact email if show_email is on
    if (showEmail) {
      if (!publicEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail.trim())) {
        toast.error("Offentlig e-post må være gyldig når kontaktknapp er aktivert");
        return;
      }
    }

    // Prepare location fields
    const locationData = locationName.trim() 
      ? {
          location_name: locationName.trim(),
          location_type: locationType || null,
        }
      : {
          location_name: null,
          location_type: null,
        };

    try {
      if (isEditing && id) {
        await updatePersona.mutateAsync({
          id,
          name: name.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          avatar_image_settings: avatarImageSettings,
          category_tags: categoryTags,
          is_public: isPublic,
          social_links: socialLinks,
          available_for: availableFor,
          show_email: showEmail,
          public_email: showEmail ? publicEmail.trim() : null,
          ...locationData,
        } as any);
        toast.success("Profil oppdatert");
      } else {
        await createPersona.mutateAsync({
          name: name.trim(),
          bio: bio.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          avatar_image_settings: avatarImageSettings,
          category_tags: categoryTags,
          is_public: isPublic,
          social_links: socialLinks.length > 0 ? socialLinks : undefined,
          available_for: availableFor,
          show_email: showEmail,
          public_email: showEmail ? publicEmail.trim() : null,
          ...locationData,
        } as any);
        toast.success("Profil opprettet");
      }
      navigate("/dashboard/personas");
    } catch (err: any) {
      toast.error(err.message || "Noe gikk galt");
    }
  };

  // Toggle available_for
  const toggleAvailableFor = (key: AvailableForKey) => {
    setAvailableFor(prev => 
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const toggleCategory = (category: string) => {
    setCategoryTags(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (tag && !categoryTags.includes(tag)) {
      setCategoryTags(prev => [...prev, tag]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setCategoryTags(prev => prev.filter(t => t !== tag));
  };

  const isSubmitting = createPersona.isPending || updatePersona.isPending;

  if (isEditing && isLoadingPersona) return <LoadingState />;

  return (
    <div className="container max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          GIGGEN BACKSTAGE
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {isEditing ? "Rediger profil" : "Lag din profil"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Din personlige identitet på GIGGEN
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Visibility Toggle - Always visible at top */}
        <div className="flex items-center justify-between py-4 border-b border-accent/20">
          <div>
            <p className="font-medium">Offentlig profil</p>
            <p className="text-sm text-muted-foreground">
              {isPublic ? "Alle kan se" : "Kun du"}
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* Grunnleggende */}
        <Collapsible open={basicOpen} onOpenChange={setBasicOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-accent" />
              <span className="font-medium">Grunnleggende</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${basicOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-5 border-b border-border/30">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-accent/30">
                <AvatarImage src={avatarUrl || undefined} style={getCroppedImageStyles(avatarImageSettings)} />
                <AvatarFallback className="text-xl bg-secondary">{name ? name.substring(0, 2).toUpperCase() : "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Profilbilde</Label>
                <InlineMediaPickerWithCrop
                  value={avatarUrl}
                  imageSettings={avatarImageSettings}
                  onChange={setAvatarUrl}
                  onSettingsChange={setAvatarImageSettings}
                  cropMode="avatar"
                  placeholder="Velg profilbilde"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground text-xs uppercase tracking-wide">Navn *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt fulle navn"
                required
                className="bg-transparent border-border/50 focus:border-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-muted-foreground text-xs uppercase tracking-wide">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Fortell litt om deg selv..."
                rows={4}
                className="bg-transparent border-border/50 focus:border-accent resize-none"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Kategorier */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="font-medium">Hva er du?</span>
              {categoryTags.length > 0 && <span className="text-xs text-muted-foreground">({categoryTags.length})</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
            <div className="flex flex-wrap gap-2">
              {PERSONA_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={categoryTags.includes(category) ? "default" : "outline"}
                  className={`cursor-pointer capitalize text-sm py-1.5 px-3 transition-colors ${
                    categoryTags.includes(category) ? "bg-accent text-accent-foreground border-accent" : "border-accent/30 hover:border-accent/60"
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
            {categoryTags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/20">
                {categoryTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize bg-secondary/50">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 hover:text-accent">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Egen kategori..."
                className="bg-transparent border-border/50 focus:border-accent"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              />
              <Button type="button" variant="outline" onClick={addCustomTag} className="border-accent/30 hover:border-accent">+</Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Tilgjengelig for */}
        <Collapsible open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-accent" />
              <span className="font-medium">Tilgjengelig for</span>
              {availableFor.length > 0 && <span className="text-xs text-muted-foreground">({availableFor.length})</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${availabilityOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
            <p className="text-sm text-muted-foreground">
              Et signal, ikke et løfte. Velg hva du generelt er åpen for.
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_FOR_OPTIONS.map((option) => (
                <Badge
                  key={option.key}
                  variant={availableFor.includes(option.key) ? "default" : "outline"}
                  className={`cursor-pointer text-sm py-1.5 px-3 transition-colors ${
                    availableFor.includes(option.key) 
                      ? "bg-secondary text-secondary-foreground border-secondary" 
                      : "border-border/50 hover:border-border text-muted-foreground"
                  }`}
                  onClick={() => toggleAvailableFor(option.key)}
                >
                  {option.label}
                </Badge>
              ))}
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
              Hvor er du basert? Dette vises på profilen din.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Sted</Label>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="F.eks. Oslo, Norge eller Josefines gate 16"
                  className="bg-transparent border-border/50 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Type (valgfritt)</Label>
                <Select value={locationType || "none"} onValueChange={(val) => setLocationType(val === "none" ? "" : val as LocationType)}>
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
            <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
          </CollapsibleContent>
        </Collapsible>

        {/* Kontaktvisning */}
        <Collapsible open={contactOpen} onOpenChange={setContactOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
            <div className="flex items-center gap-3">
              <MailIcon className="h-4 w-4 text-accent" />
              <span className="font-medium">Kontaktvisning</span>
              {showEmail && <span className="text-xs text-accent">Aktiv</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${contactOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Vis kontaktknapp på offentlig side</p>
                <p className="text-xs text-muted-foreground">
                  Aktiverer «Book / samarbeid»-knappen på personasiden
                </p>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>

            {showEmail && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Offentlig e-post *</Label>
                <Input
                  type="email"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  placeholder="epost@eksempel.no"
                  className="bg-transparent border-border/50 focus:border-accent"
                />
                <p className="text-xs text-muted-foreground">
                  Denne e-posten brukes i Book/Samarbeid-skjemaet. Kun synlig hvis kontaktknappen er aktiv.
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Min reise */}
        {isEditing && id && (
          <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-accent" />
                <span className="font-medium">Min reise</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${timelineOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 border-b border-border/30">
              <p className="text-sm text-muted-foreground mb-4">Milepæler i din karriere</p>
              <PersonaTimelineManager personaId={id} canEdit={true} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Prosjekter */}
        {isEditing && id && (
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-b border-border/30 hover:text-accent transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-medium">Bruk denne profilen i et prosjekt</span>
                {personaBindings && personaBindings.length > 0 && <span className="text-xs text-muted-foreground">({personaBindings.length})</span>}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${projectsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="py-5 space-y-4 border-b border-border/30">
              <p className="text-sm text-muted-foreground">
                Velg hvilke av prosjektene dine denne profilen skal stå bak.
              </p>
              {(personaBindings && personaBindings.length > 0) ? (
                <div className="space-y-2">
                  {personaBindings.map((binding) => (
                    <div key={binding.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                      <div className="space-y-0.5">
                        <p className="font-medium">{binding.entity?.name}</p>
                        {binding.role_label && <p className="text-xs text-muted-foreground">{binding.role_label}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${binding.is_public ? "text-accent" : "text-muted-foreground"}`}>
                          {binding.is_public ? "Offentlig" : "Skjult"}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromProject(binding.id, binding.entity_id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Ikke koblet til noen prosjekter ennå.</p>
              )}
              {availableEntitiesForBinding.length > 0 && (
                <div className="space-y-3 pt-4">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Legg til i prosjekt</Label>
                  <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                    <SelectTrigger className="w-full bg-transparent border-border/50">
                      <SelectValue placeholder="Velg prosjekt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntitiesForBinding.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Rolle (valgfritt)" value={bindingRoleLabel} onChange={(e) => setBindingRoleLabel(e.target.value)} className="bg-transparent border-border/50 focus:border-accent" />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Synlig på prosjektsiden</span>
                    <Switch checked={bindingIsPublic} onCheckedChange={setBindingIsPublic} />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddToProject} disabled={!selectedEntityId || createPersonaBinding.isPending} className="w-full border-accent/30 hover:border-accent hover:bg-accent/10">
                    {createPersonaBinding.isPending ? "Legger til..." : "Legg til i prosjekt"}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-8">
          <Button type="submit" disabled={isSubmitting} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Lagre endringer" : "Opprett profil"}
          </Button>
          <Button type="button" variant="outline" asChild className="border-border/50 hover:border-accent/50">
            <Link to="/dashboard/personas">Avbryt</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}