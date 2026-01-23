import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { EntityTimelineManager } from "@/components/dashboard/EntityTimelineManager";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { generateSlug } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

export default function AdminVenueEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    city: "",
    hero_image_url: "",
    is_published: false,
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);

  // Fetch venue data
  const { data: venue, isLoading } = useQuery({
    queryKey: ["admin-venue", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  // Populate form when venue data loads
  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || "",
        slug: venue.slug || "",
        description: venue.description || "",
        address: venue.address || "",
        city: venue.city || "",
        hero_image_url: venue.hero_image_url || "",
        is_published: venue.is_published || false,
      });
      // Parse hero_image_settings from JSONB
      setHeroImageSettings(parseImageSettings(venue.hero_image_settings) || null);
    }
  }, [venue]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      const payload = {
        ...formData,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        address: formData.address || null,
        city: formData.city || null,
        description: formData.description || null,
      };

      if (isNew) {
        const insertPayload = { ...payload, created_by: user.id };
        const { data, error } = await supabase
          .from("venues")
          .insert(insertPayload as never)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("venues")
          .update(payload as never)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-venue", id] });
      toast({ title: isNew ? "Venue opprettet" : "Venue oppdatert" });
      if (isNew && data) {
        navigate(`/admin/venues/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Auto-generate slug from name (always)
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  if (isLoading) {
    return <LoadingState message="Laster venue..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/venues">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Nytt venue" : "Rediger venue"}
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Navn</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Venue navn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <span>/venue/</span>
              <span className="text-foreground font-mono">{formData.slug || "..."}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Genereres automatisk fra navn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Beskrivelse av venue..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Gateadresse"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">By</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Oslo"
            />
          </div>

          <div className="space-y-2">
            <Label>Hero-bilde</Label>
            <InlineMediaPickerWithCrop
              value={formData.hero_image_url}
              imageSettings={heroImageSettings}
              onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
              onSettingsChange={setHeroImageSettings}
              cropMode="hero"
              placeholder="Velg hero-bilde"
              showAllForAdmin
              useNaturalAspect
            />
            <p className="text-xs text-muted-foreground">
              Velg bilde og juster fokuspunkt for beste visning
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_published">Publisert</Label>
            <Select
              value={formData.is_published ? "true" : "false"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, is_published: value === "true" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Utkast</SelectItem>
                <SelectItem value="true">Publisert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </form>

      {/* Timeline for venue - only show for existing venues */}
      {!isNew && id && (
        <EntityTimelineManager 
          entityId={id} 
          entityType="venue"
          canEdit={true} 
        />
      )}
    </div>
  );
}
