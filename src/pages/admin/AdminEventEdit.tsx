import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Users, Check, ChevronsUpDown, Plus } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { generateSlug, cn } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

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
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);

  // Fetch event data
  const { data: event, isLoading } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("events")
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
        .select("id, name, city")
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
      // Parse hero_image_settings from JSONB
      setHeroImageSettings(parseImageSettings(event.hero_image_settings) || null);
    }
  }, [event]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : new Date().toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        venue_id: formData.venue_id || null,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        city: formData.city || null,
      };

      if (isNew) {
        const insertPayload = { ...payload, created_by: user.id };
        const { data, error } = await supabase
          .from("events")
          .insert(insertPayload as never)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("events")
          .update(payload as never)
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

  // Auto-generate slug from title (always)
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <span>/event/</span>
              <span className="text-foreground font-mono">{formData.slug || "..."}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Genereres automatisk fra tittel
            </p>
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
            <Label>Venue</Label>
            <Popover open={venuePickerOpen} onOpenChange={setVenuePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={venuePickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.venue_id
                    ? venues?.find((venue) => venue.id === formData.venue_id)?.name
                    : "Velg venue (valgfritt)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Søk etter venue..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-2 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Ingen venue funnet.</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={() => setVenuePickerOpen(false)}
                        >
                          <Link to="/admin/venues/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Opprett nytt venue
                          </Link>
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          setFormData((prev) => ({ ...prev, venue_id: "" }));
                          setVenuePickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !formData.venue_id ? "opacity-100" : "opacity-0")} />
                        Ingen venue
                      </CommandItem>
                      {venues?.map((venue) => (
                        <CommandItem
                          key={venue.id}
                          value={venue.name}
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, venue_id: venue.id }));
                            setVenuePickerOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.venue_id === venue.id ? "opacity-100" : "opacity-0")} />
                          {venue.name}
                          {venue.city && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({venue.city})
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Søk etter venue eller{" "}
              <Link to="/admin/venues/new" className="text-primary hover:underline">
                opprett nytt venue
              </Link>
            </p>
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
