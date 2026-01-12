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
import { ArrowLeft, Save, Users } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AdminEventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_at: "",
    end_at: "",
    venue_id: "",
    city: "",
    hero_image_url: "",
    status: "draft" as "draft" | "submitted" | "published",
  });

  // Fetch event data
  const { data: event, isLoading } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !isNew,
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

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || "",
        slug: event.slug || "",
        description: event.description || "",
        start_at: event.start_at ? event.start_at.slice(0, 16) : "",
        end_at: event.end_at ? event.end_at.slice(0, 16) : "",
        venue_id: event.venue_id || "",
        city: event.city || "",
        hero_image_url: event.hero_image_url || "",
        status: event.status || "draft",
      });
    }
  }, [event]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : new Date().toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        venue_id: formData.venue_id || null,
        hero_image_url: formData.hero_image_url || null,
        city: formData.city || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      toast({ title: isNew ? "Event opprettet" : "Event oppdatert" });
      if (isNew && data) {
        navigate(`/admin/events/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isNew ? title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : prev.slug,
    }));
  };

  if (isLoading) {
    return <LoadingState message="Laster event..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Ny event" : "Rediger event"}
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
            <Label htmlFor="title">Tittel</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Event tittel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="event-slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Beskrivelse av eventen..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Start</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">Slutt (valgfritt)</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_id">Venue</Label>
            <Select
              value={formData.venue_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, venue_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg venue (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                {venues?.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="hero_image_url">Hero-bilde URL</Label>
            <Input
              id="hero_image_url"
              value={formData.hero_image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, hero_image_url: e.target.value }))}
              placeholder="https://..."
            />
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
              <Link to={`/admin/events/${id}/lineup`}>
                <Users className="h-4 w-4 mr-2" />
                Lineup
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
