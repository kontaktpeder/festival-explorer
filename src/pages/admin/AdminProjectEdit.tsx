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
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";

export default function AdminProjectEdit() {
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
    type: "solo" as "solo" | "band",
    hero_image_url: "",
    is_published: false,
  });

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ["admin-project", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        slug: project.slug || "",
        tagline: project.tagline || "",
        description: project.description || "",
        type: project.type || "solo",
        hero_image_url: project.hero_image_url || "",
        is_published: project.is_published || false,
      });
    }
  }, [project]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      const payload = {
        ...formData,
        hero_image_url: formData.hero_image_url || null,
        tagline: formData.tagline || null,
        description: formData.description || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("projects")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-project", id] });
      toast({ title: isNew ? "Artist opprettet" : "Artist oppdatert" });
      if (isNew && data) {
        navigate(`/admin/projects/${data.id}`);
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
      slug: isNew ? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : prev.slug,
    }));
  };

  if (isLoading) {
    return <LoadingState message="Laster artist..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Ny artist" : "Rediger artist"}
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
              placeholder="Artist/band navn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="artist-slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "solo" | "band") => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="band">Band</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="hero_image_url">Hero-bilde URL</Label>
            <Input
              id="hero_image_url"
              value={formData.hero_image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, hero_image_url: e.target.value }))}
              placeholder="https://..."
            />
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
    </div>
  );
}
