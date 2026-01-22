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
import { Loader2, X, Info, Clock } from "lucide-react";
import { 
  usePersonaById, 
  useCreatePersona, 
  useUpdatePersona,
  PERSONA_CATEGORIES 
} from "@/hooks/usePersona";
import { LoadingState } from "@/components/ui/LoadingState";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { parseImageSettings, type ImageSettings } from "@/types/database";
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
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Rediger profil" : "Lag din profil"}
        </h1>
        <p className="text-muted-foreground">
          {isEditing 
            ? "Oppdater hvem du er – din personlige identitet på GIGGEN"
            : "Fortell hvem du er – musiker, fotograf, DJ eller arrangør"
          }
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Profilen din er forskjellig fra prosjekter. Profilen er deg – prosjekter er det du lager og opptrer med.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar Preview + InlineMediaPickerWithCrop */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={avatarUrl || undefined} 
                  style={getCroppedImageStyles(avatarImageSettings)}
                />
                <AvatarFallback className="text-xl">
                  {name ? name.substring(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
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
          <CardHeader>
            <CardTitle>Kategorier</CardTitle>
            <CardDescription>
              Velg hva som beskriver deg best
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PERSONA_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={categoryTags.includes(category) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
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
              
              <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tidslinje-funksjonalitet for profiler kommer snart.</p>
                <p className="text-xs mt-1 opacity-70">
                  Du kan i mellomtiden legge til tidslinje på prosjektene dine.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Lagre endringer" : "Opprett profil"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/dashboard/personas">Avbryt</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}