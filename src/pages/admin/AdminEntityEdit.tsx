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
import { ArrowLeft, Save, ImageIcon, Users } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { generateSlug } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EntityPersonaBindingsEditor } from "@/components/admin/EntityPersonaBindingsEditor";
import type { EntityType, AccessLevel } from "@/types/database";

const TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "venue", label: "Venue" },
  { value: "solo", label: "Solo" },
  { value: "band", label: "Band" },
];

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Admin",
  editor: "Redaktør",
  viewer: "Leser",
};

export default function AdminEntityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    type: "solo" as EntityType,
    hero_image_url: "",
    address: "",
    city: "",
    is_published: false,
  });
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Fetch entity data
  const { data: entity, isLoading } = useQuery({
    queryKey: ["admin-entity", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  // Fetch team members
  const { data: team } = useQuery({
    queryKey: ["admin-entity-team", id],
    queryFn: async () => {
      if (isNew) return [];
      const { data, error } = await supabase
        .from("entity_team")
        .select(`
          *,
          profile:profiles(id, display_name, handle, avatar_url)
        `)
        .eq("entity_id", id)
        .is("left_at", null)
        .order("access", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !isNew,
  });

  // Populate form when entity data loads
  useEffect(() => {
    if (entity) {
      setFormData({
        name: entity.name || "",
        slug: entity.slug || "",
        tagline: entity.tagline || "",
        description: entity.description || "",
        type: entity.type || "solo",
        hero_image_url: entity.hero_image_url || "",
        address: entity.address || "",
        city: entity.city || "",
        is_published: entity.is_published || false,
      });
    }
  }, [entity]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      const payload = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        tagline: formData.tagline || null,
        description: formData.description || null,
        hero_image_url: formData.hero_image_url || null,
        address: formData.address || null,
        city: formData.city || null,
        is_published: formData.is_published,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("entities")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("entities")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entity", id] });
      toast({ title: isNew ? "Entity opprettet" : "Entity oppdatert" });
      if (isNew && data) {
        navigate(`/admin/entities/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  if (isLoading) {
    return <LoadingState message="Laster entity..." />;
  }

  const isVenue = formData.type === "venue";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/entities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Ny entity" : "Rediger entity"}
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
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: EntityType) => setFormData((prev) => ({ ...prev, type: value }))}
              disabled={!isNew}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isNew && (
              <p className="text-xs text-muted-foreground">Type kan ikke endres etter opprettelse</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Navn</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={isVenue ? "Venue navn" : "Artist/band navn"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <span>{isVenue ? "/venue/" : "/project/"}</span>
              <span className="text-foreground font-mono">{formData.slug || "..."}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Genereres automatisk fra navn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="Kort beskrivelse (én linje)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Full beskrivelse..."
              rows={4}
            />
          </div>

          {/* Venue-specific fields */}
          {isVenue && (
            <>
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
                  placeholder="By"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="hero_image_url">Hero-bilde</Label>
            <div className="flex gap-2">
              <Input
                id="hero_image_url"
                value={formData.hero_image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, hero_image_url: e.target.value }))}
                placeholder="https://... eller velg fra filbank"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setMediaPickerOpen(true)}
                className="flex-shrink-0"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Velg fra filbank
              </Button>
            </div>
            {mediaPickerOpen && (
              <MediaPicker
                open={mediaPickerOpen}
                onOpenChange={(open) => !open && setMediaPickerOpen(false)}
                onSelect={(mediaId, publicUrl) => {
                  setFormData((prev) => ({ ...prev, hero_image_url: publicUrl }));
                  setMediaPickerOpen(false);
                }}
                fileType="image"
              />
            )}
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

      {/* Persona Bindings section (only for existing entities) */}
      {!isNew && entity && (
        <div className="mt-8 pt-6 border-t border-border">
          <EntityPersonaBindingsEditor entityId={entity.id} entityName={entity.name} />
        </div>
      )}

      {/* Team section (only for existing entities) */}
      {!isNew && team && team.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team ({team.length})
          </h2>
          <div className="space-y-2">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(member.profile?.display_name || member.profile?.handle || "?").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {member.profile?.display_name || member.profile?.handle || "Ingen navn"}
                    </p>
                    {member.role_labels && member.role_labels.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {member.role_labels.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.access === 'owner' ? 'default' : 'secondary'}>
                    {ACCESS_LABELS[member.access as AccessLevel] || member.access}
                  </Badge>
                  {member.is_public && (
                    <Badge variant="outline" className="text-xs">Offentlig</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
