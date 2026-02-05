import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X, Info, Clock, Users, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { parseImageSettings, type ImageSettings, type AccessLevel } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { toast } from "sonner";

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
    }
  }, [existingPersona]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Navn er påkrevd");
      return;
    }

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
        });
        toast.success("Profil oppdatert");
      } else {
        await createPersona.mutateAsync({
          name: name.trim(),
          bio: bio.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          avatar_image_settings: avatarImageSettings,
          category_tags: categoryTags,
          is_public: isPublic,
        });
        toast.success("Profil opprettet");
      }
      navigate("/dashboard/personas");
    } catch (err: any) {
      toast.error(err.message || "Noe gikk galt");
    }
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
    <div className="container max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">
          {isEditing ? "Rediger profil" : "Lag din profil"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEditing 
            ? "Oppdater hvem du er – din personlige identitet på GIGGEN"
            : "Fortell hvem du er – musiker, fotograf, DJ eller arrangør"
          }
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Profilen din er forskjellig fra prosjekter. Profilen er deg – prosjekter er det du lager og opptrer med.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Grunnleggende info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {/* Avatar Preview + InlineMediaPickerWithCrop */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage 
                  src={avatarUrl || undefined} 
                  style={getCroppedImageStyles(avatarImageSettings)}
                />
                <AvatarFallback className="text-lg sm:text-xl">
                  {name ? name.substring(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full space-y-2">
                <Label>Profilbilde</Label>
                <InlineMediaPickerWithCrop
                  value={avatarUrl}
                  imageSettings={avatarImageSettings}
                  onChange={setAvatarUrl}
                  onSettingsChange={setAvatarImageSettings}
                  cropMode="avatar"
                  placeholder="Velg profilbilde"
                />
                <p className="text-xs text-muted-foreground">
                  Velg bilde og juster fokuspunkt for best resultat.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt artistnavn eller fullt navn"
                required
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Fortell litt om deg selv..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Kategorier</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Velg hva som beskriver deg best
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {PERSONA_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={categoryTags.includes(category) ? "default" : "outline"}
                  className="cursor-pointer capitalize text-xs sm:text-sm py-1 px-2 sm:py-1.5 sm:px-3"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Selected tags (including custom) */}
            {categoryTags.length > 0 && (
              <div className="pt-2 border-t">
                <Label className="text-sm text-muted-foreground">Valgte:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Custom tag input */}
            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Legg til egen kategori..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCustomTag}>
                Legg til
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synlighet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public">Offentlig profil</Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? "Alle kan se denne profilen"
                    : "Bare du kan se denne profilen"
                  }
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </CardContent>
        </Card>

        {/* Min reise (tidslinje) - vises kun ved redigering */}
        {isEditing && id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Min reise
              </CardTitle>
              <CardDescription>
                Legg til milepæler i din karriere – første låt, første gig, samarbeid, vendepunkter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-accent/5 border-accent/20">
                <Info className="h-4 w-4 text-accent" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Tidslinje viser din personlige reise som musiker, fotograf eller arrangør. 
                  Dette er forskjellig fra prosjekt-tidslinjer som viser prosjektets historie.
                </AlertDescription>
              </Alert>
              
              <PersonaTimelineManager 
                personaId={id} 
                canEdit={true} 
              />
            </CardContent>
          </Card>
        )}

        {/* Prosjekter denne profilen er med i */}
        {isEditing && id && (
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4" />
                Prosjekter denne profilen er med i
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Koble profilen din direkte til prosjekter du er en del av
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              {/* Existing bindings */}
              {(personaBindings && personaBindings.length > 0) ? (
                <div className="space-y-2">
                  {personaBindings.map((binding) => (
                    <div key={binding.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{binding.entity?.name}</p>
                        {binding.role_label && (
                          <p className="text-xs text-muted-foreground">
                            Rolle: {binding.role_label}
                          </p>
                        )}
                        <Badge variant={binding.is_public ? "default" : "secondary"} className="text-xs mt-1">
                          {binding.is_public ? "Offentlig" : "Skjult"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromProject(binding.id, binding.entity_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Denne profilen er ikke lagt til i noen prosjekter ennå.
                </p>
              )}

              {/* Info: viewer-only access */}
              {viewerOnlyEntities.length > 0 && editableEntities.length === 0 && (
                <Alert className="bg-muted/50 border-border/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Du har kun lesetilgang til noen prosjekter. Du kan se dem, men bare
                    eiere/administratorer kan legge til personer bak prosjektet.
                  </AlertDescription>
                </Alert>
              )}

              {/* Add to project - only where user has editor/admin/owner */}
              {availableEntitiesForBinding.length > 0 ? (
                <div className="space-y-3 pt-3 border-t border-border/30">
                  <Label className="text-sm font-medium">Legg til i prosjekt</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                      <SelectTrigger className="w-full sm:flex-1">
                        <SelectValue placeholder="Velg prosjekt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEntitiesForBinding.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Rolle (valgfritt)"
                      value={bindingRoleLabel}
                      onChange={(e) => setBindingRoleLabel(e.target.value)}
                      className="w-full sm:flex-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="binding-public" className="text-sm">Synlig offentlig</Label>
                      <p className="text-xs text-muted-foreground">
                        Vises som "bak prosjektet" på prosjektsiden
                      </p>
                    </div>
                    <Switch
                      id="binding-public"
                      checked={bindingIsPublic}
                      onCheckedChange={setBindingIsPublic}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddToProject}
                    disabled={!selectedEntityId || createPersonaBinding.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createPersonaBinding.isPending ? "Legger til..." : "Legg til i prosjekt"}
                  </Button>
                </div>
              ) : editableEntities.length > 0 ? (
                <p className="text-sm text-muted-foreground pt-3 border-t border-border/30">
                  Alle dine prosjekter er allerede koblet til denne profilen.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground pt-3 border-t border-border/30">
                  Du har ingen prosjekter med redigeringstilgang som denne profilen kan legges til i.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/dashboard/personas">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Lagre endringer" : "Opprett profil"}
          </Button>
        </div>
      </form>
    </div>
  );
}