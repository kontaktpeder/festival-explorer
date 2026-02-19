import { useParams, useNavigate } from "react-router-dom";
import gIcon from "@/assets/giggen-g-icon-red.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { generateSlug } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { cleanupSignedUrlCache } from "@/lib/media-helpers";

export default function VenueSettingsRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const selectedPersonaId = useSelectedPersonaId();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    city: "",
    hero_image_url: "",
    logo_url: "",
    is_published: false,
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);

  // Fetch full venue
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue-room", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check permissions inline (same pattern as VenueRoom)
  const { data: canEdit } = useQuery({
    queryKey: ["venue-settings-can-edit", id, venue?.created_by, selectedPersonaId],
    queryFn: async () => {
      if (!venue) return false;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      if (venue.created_by === user.id) return true;

      const personaIds = selectedPersonaId ? [selectedPersonaId] : [];
      if (personaIds.length === 0) return false;

      const { data: staff } = await supabase
        .from("venue_staff")
        .select("can_edit_venue")
        .eq("venue_id", id!)
        .in("persona_id", personaIds);

      return staff?.some((s) => s.can_edit_venue) ?? false;
    },
    enabled: !!id && !!venue,
  });

  // Populate form from venue
  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || "",
        slug: venue.slug || "",
        description: venue.description || "",
        address: venue.address || "",
        city: venue.city || "",
        hero_image_url: venue.hero_image_url || "",
        logo_url: venue.logo_url || "",
        is_published: venue.is_published || false,
      });
      setHeroImageSettings(parseImageSettings(venue.hero_image_settings) || null);
    }
  }, [venue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("venues")
        .update({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          description: formData.description || null,
          address: formData.address || null,
          city: formData.city || null,
          hero_image_url: formData.hero_image_url || null,
          hero_image_settings: heroImageSettings as any,
          logo_url: formData.logo_url || null,
          is_published: formData.is_published,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-room", id] });
      queryClient.invalidateQueries({ queryKey: ["venue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-my-venues"] });
      cleanupSignedUrlCache(true);
      toast({ title: "Endringene er lagret" });
    },
    onError: (error: Error) => {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!venue || !id)
    return <p className="p-8 text-muted-foreground">Scene ikke funnet.</p>;

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/venue/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE · Innstillinger
            </span>
          </div>
          <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 max-w-2xl">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">
          Grunninfo for {venue.name}
        </h2>

        {!canEdit ? (
          <p className="text-sm text-muted-foreground">
            Du har ikke tilgang til å redigere denne scenen.
          </p>
        ) : (
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
                  placeholder="Scenens navn"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>URL-slug</Label>
                <p className="text-xs text-muted-foreground font-mono">
                  /venue/{formData.slug || "..."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Beskrivelse av scenen..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Gateadresse"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="Oslo"
                />
              </div>

              <div className="space-y-2">
                <Label>Hero-bilde</Label>
                <InlineMediaPickerWithCrop
                  value={formData.hero_image_url}
                  imageSettings={heroImageSettings}
                  onChange={(url) =>
                    setFormData((prev) => ({ ...prev, hero_image_url: url }))
                  }
                  onSettingsChange={setHeroImageSettings}
                  cropMode="hero"
                  placeholder="Velg hero-bilde"
                  useNaturalAspect
                />
              </div>

              <div className="space-y-2">
                <Label>Publisering</Label>
                <Select
                  value={formData.is_published ? "true" : "false"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_published: v === "true",
                    }))
                  }
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

            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
