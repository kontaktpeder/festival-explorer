import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { generateSlug, cn, isoToLocalDatetimeString } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";

export default function EventDetailsRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { event, isLoading, canEdit, festivalContext } = useEventBackstageAccess(id);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_at: "",
    end_at: "",
    venue_id: "",
    city: "",
    scene_id: "",
    hero_image_url: "",
    status: "draft" as "draft" | "submitted" | "published",
    age_limit: "",
    cloakroom_available: null as boolean | null,
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);

  const { data: venues } = useQuery({
    queryKey: ["admin-venues-list"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("id, name, city").order("name");
      return data || [];
    },
  });

  const { data: venueScenes = [] } = useQuery({
    queryKey: ["venue-scenes", formData.venue_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_scenes" as any)
        .select("id, name, sort_order")
        .eq("venue_id", formData.venue_id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; name: string; sort_order: number }[];
    },
    enabled: !!formData.venue_id,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || "",
        slug: event.slug || "",
        description: event.description || "",
        start_at: isoToLocalDatetimeString(event.start_at),
        end_at: isoToLocalDatetimeString(event.end_at),
        venue_id: event.venue_id || "",
        city: event.city || "",
        scene_id: (event as any).scene_id || "",
        hero_image_url: event.hero_image_url || "",
        status: event.status || "draft",
        age_limit: (event as any).age_limit ?? "",
        cloakroom_available: (event as any).cloakroom_available ?? null,
      });
      setHeroImageSettings(parseImageSettings(event.hero_image_settings) || null);
    }
  }, [event]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : new Date().toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        venue_id: formData.venue_id || null,
        scene_id: formData.scene_id || null,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        city: formData.city || null,
        age_limit: formData.age_limit?.trim() || null,
        cloakroom_available: formData.cloakroom_available,
      };

      const { error } = await supabase
        .from("events")
        .update(payload as never)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      toast({ title: "Event oppdatert" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <LoadingState message="Laster event..." />
      </div>
    );
  }

  if (!event || !canEdit) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">
          {!event ? "Event ikke funnet." : "Du har ikke tilgang til å redigere dette eventet."}
        </p>
        {event?.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/event/${event.slug}`}>Se publikumsvisning</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/events/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Detaljer
            </span>
            {festivalContext?.festival && (
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                / {(festivalContext.festival as any).name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {event.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/event/${event.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Se live
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-8 px-3 text-xs font-semibold"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saveMutation.isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant={formData.status === "published" ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {formData.status === "published" ? "Publisert" : "Utkast"}
              </Badge>
              <Select
                value={formData.status}
                onValueChange={(v: "draft" | "published") => setFormData((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="h-6 w-auto text-[10px] border-none bg-transparent shadow-none px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Utkast</SelectItem>
                  <SelectItem value="published">Publisert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Tittel"
              className="border-none bg-transparent text-3xl sm:text-4xl lg:text-5xl font-bold shadow-none px-0 h-auto py-1 placeholder:text-muted-foreground/30 focus-visible:ring-0 tracking-tight"
              required
            />
            <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">
              /event/{formData.slug || "..."}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl space-y-5">
          {/* Description */}
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Beskrivelse..."
            className="border-none bg-transparent shadow-none px-0 min-h-[70px] resize-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
            rows={3}
          />

          {/* Compact info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Start</Label>
              <Input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_at: e.target.value }))}
                className="h-8 text-xs bg-muted/20 border-border/20"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Slutt</Label>
              <Input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_at: e.target.value }))}
                className="h-8 text-xs bg-muted/20 border-border/20"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Venue</Label>
              <Popover open={venuePickerOpen} onOpenChange={setVenuePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-8 text-xs bg-muted/20 border-border/20"
                  >
                    <span className="truncate">
                      {formData.venue_id
                        ? venues?.find((v) => v.id === formData.venue_id)?.name
                        : "Velg..."}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Søk etter venue..." />
                    <CommandList>
                      <CommandEmpty>Ingen venue funnet.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, venue_id: "", scene_id: "" }));
                            setVenuePickerOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-3.5 w-3.5", !formData.venue_id ? "opacity-100" : "opacity-0")} />
                          Ingen venue
                        </CommandItem>
                        {venues?.map((venue) => (
                          <CommandItem
                            key={venue.id}
                            value={venue.name}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, venue_id: venue.id, scene_id: prev.venue_id !== venue.id ? "" : prev.scene_id }));
                              setVenuePickerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-3.5 w-3.5", formData.venue_id === venue.id ? "opacity-100" : "opacity-0")} />
                            {venue.name}
                            {venue.city && <span className="ml-2 text-muted-foreground text-xs">({venue.city})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {formData.venue_id && venueScenes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Scene</Label>
                <Select
                  value={formData.scene_id || "__none__"}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, scene_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/20">
                    <SelectValue placeholder="Velg..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ingen</SelectItem>
                    {venueScenes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">By</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Oslo"
                className="h-8 text-xs bg-muted/20 border-border/20"
              />
            </div>
          </div>

          {/* Secondary row */}
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="space-y-1 w-28">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Alder</Label>
              <Input
                value={formData.age_limit}
                onChange={(e) => setFormData((prev) => ({ ...prev, age_limit: e.target.value }))}
                placeholder="18+"
                className="h-8 text-xs bg-muted/20 border-border/20"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="cloakroom_available"
                checked={formData.cloakroom_available === true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cloakroom_available: e.target.checked ? true : null,
                  }))
                }
                className="h-3.5 w-3.5 rounded border-border"
              />
              <Label htmlFor="cloakroom_available" className="text-xs font-normal cursor-pointer text-muted-foreground">
                Garderobe
              </Label>
            </div>
            <div className="flex items-center gap-2 pb-1 ml-auto">
              {formData.hero_image_url && (
                <img
                  src={formData.hero_image_url}
                  alt="Hero"
                  className="h-8 w-12 rounded object-cover border border-border/20"
                />
              )}
              <InlineMediaPickerWithCrop
                value={formData.hero_image_url}
                imageSettings={heroImageSettings}
                onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
                onSettingsChange={setHeroImageSettings}
                cropMode="hero"
                placeholder="Hero-bilde"
                showAllForAdmin
                useNaturalAspect
                hidePreview
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
