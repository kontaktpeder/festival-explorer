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
import { ArrowLeft, Layers, Save } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AdminFestivalEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    start_at: "",
    end_at: "",
    venue_id: "",
    theme_id: "",
    status: "draft" as "draft" | "submitted" | "published",
  });

  // Fetch festival data
  const { data: festival, isLoading } = useQuery({
    queryKey: ["admin-festival", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("festivals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  // Fetch venues for dropdown
  const { data: venues } = useQuery({
    queryKey: ["admin-venues-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Fetch themes for dropdown
  const { data: themes } = useQuery({
    queryKey: ["admin-themes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("themes")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Populate form when festival data loads
  useEffect(() => {
    if (festival) {
      setFormData({
        name: festival.name || "",
        slug: festival.slug || "",
        description: festival.description || "",
        start_at: festival.start_at ? festival.start_at.split("T")[0] : "",
        end_at: festival.end_at ? festival.end_at.split("T")[0] : "",
        venue_id: festival.venue_id || "",
        theme_id: festival.theme_id || "",
        status: festival.status || "draft",
      });
    }
  }, [festival]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        venue_id: formData.venue_id || null,
        theme_id: formData.theme_id || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("festivals")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("festivals")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-festival", id] });
      toast({ title: isNew ? "Festival opprettet" : "Festival oppdatert" });
      if (isNew && data) {
        navigate(`/admin/festivals/${data.id}`);
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
    return <LoadingState message="Laster festival..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/festivals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Ny festival" : "Rediger festival"}
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
              placeholder="Festival navn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="festival-slug"
              required
            />
            <p className="text-xs text-muted-foreground">
              URL: /festival/{formData.slug || "..."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Kort beskrivelse av festivalen..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Startdato</Label>
              <Input
                id="start_at"
                type="date"
                value={formData.start_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">Sluttdato</Label>
              <Input
                id="end_at"
                type="date"
                value={formData.end_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_id">Venue</Label>
            <Select
              value={formData.venue_id || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, venue_id: value === "__none__" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg venue (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen venue</SelectItem>
                {venues?.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme_id">Theme</Label>
            <Select
              value={formData.theme_id || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, theme_id: value === "__none__" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg theme (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen theme</SelectItem>
                {themes?.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "draft" | "published") => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Utkast</SelectItem>
                <SelectItem value="published">Publisert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Lagrer..." : "Lagre"}
          </Button>
          
          {!isNew && (
            <Button asChild variant="outline">
              <Link to={`/admin/festivals/${id}/sections`}>
                <Layers className="h-4 w-4 mr-2" />
                Seksjoner
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
