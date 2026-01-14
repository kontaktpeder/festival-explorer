import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Eye, EyeOff, GripVertical, ImageIcon, X, Monitor, Smartphone, Settings, Save, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { generateSlug } from "@/lib/utils";
const SECTION_TYPES = [
  { 
    value: "hero", 
    label: "Hero",
    supports_events: false,
    supports_artists: false,
    supports_venue: false
  },
  { 
    value: "program", 
    label: "Program",
    supports_events: true,
    supports_artists: false,
    supports_venue: false
  },
  { 
    value: "om", 
    label: "Om Giggen",
    supports_events: false,
    supports_artists: false,
    supports_venue: false
  },
  { 
    value: "artister", 
    label: "Artister",
    supports_events: false,
    supports_artists: true,
    supports_venue: false
  },
  { 
    value: "venue-plakat", 
    label: "Venue-plakat",
    supports_events: false,
    supports_artists: false,
    supports_venue: true
  },
  { 
    value: "praktisk", 
    label: "Praktisk",
    supports_events: false,
    supports_artists: false,
    supports_venue: false
  },
  { 
    value: "footer", 
    label: "Footer",
    supports_events: false,
    supports_artists: false,
    supports_venue: false
  }
] as const;

// Helper functions for content_json structure
function getSectionContent(section: { content_json?: unknown }) {
  const contentJson = section.content_json as Record<string, unknown> | null;
  if (!contentJson) {
    return { 
      events: [] as string[],
      artists: [] as string[],
      venue: null as string | null,
    };
  }
  
  // New structure: {content: {...}}
  if (contentJson.content) {
    const content = contentJson.content as Record<string, unknown>;
    return {
      events: (content.events as string[]) || [],
      artists: (content.artists as string[]) || [],
      venue: (content.venue as string) || null,
    };
  }
  
  // Legacy structure
  return {
    events: (contentJson.events as string[]) || [],
    artists: (contentJson.artists as string[]) || [],
    venue: (contentJson.venue as string) || null,
  };
}

function buildContentJson(content: { events: string[]; artists: string[]; venue: string | null }) {
  return {
    content_json: {
      content
    }
  };
}

type MediaPickerState = {
  sectionId: string;
  type: "desktop" | "mobile" | "legacy";
} | null;

export default function AdminSections() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mediaPickerOpen, setMediaPickerOpen] = useState<MediaPickerState>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const [festivalFormExpanded, setFestivalFormExpanded] = useState(false);
  
  // Festival form state
  const [festivalFormData, setFestivalFormData] = useState({
    name: "",
    slug: "",
    description: "",
    start_at: "",
    end_at: "",
    venue_id: "",
    theme_id: "",
    status: "draft" as "draft" | "submitted" | "published",
    date_range_section_id: "",
    description_section_id: "",
    name_section_id: "",
  });

  // Fetch festival info with all fields
  const { data: festival, isLoading: isLoadingFestival } = useQuery({
    queryKey: ["admin-festival", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, description, start_at, end_at, venue_id, theme_id, status, date_range_section_id, description_section_id, name_section_id")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Populate festival form when data loads
  useEffect(() => {
    if (festival) {
      setFestivalFormData({
        name: festival.name || "",
        slug: festival.slug || "",
        description: festival.description || "",
        start_at: festival.start_at ? festival.start_at.split("T")[0] : "",
        end_at: festival.end_at ? festival.end_at.split("T")[0] : "",
        venue_id: festival.venue_id || "",
        theme_id: festival.theme_id || "",
        status: (festival.status as "draft" | "submitted" | "published") || "draft",
        date_range_section_id: festival.date_range_section_id || "",
        description_section_id: festival.description_section_id || "",
        name_section_id: festival.name_section_id || "",
      });
    }
  }, [festival]);

  // Fetch sections
  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ["admin-festival-sections", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_sections")
        .select("*")
        .eq("festival_id", id)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!id,
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

  // Fetch festival events for selection
  const { data: festivalEvents } = useQuery({
    queryKey: ["admin-festival-events", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("festival_events")
        .select(`
          event_id,
          event:events(id, title, slug, start_at)
        `)
        .eq("festival_id", id)
        .order("sort_order");
      return data?.map((fe: { event: unknown }) => fe.event).filter(Boolean) || [];
    },
    enabled: !!id,
  });

  // Fetch featured artists for selection (from festival events)
  const { data: featuredArtists } = useQuery({
    queryKey: ["admin-festival-artists", id],
    queryFn: async () => {
      if (!id) return [];
      const { data: events } = await supabase
        .from("festival_events")
        .select(`
          event:events(
            id,
            event_projects(
              project:projects(id, name, slug)
            )
          )
        `)
        .eq("festival_id", id);
      
      const artistMap = new Map<string, { id: string; name: string; slug: string }>();
      events?.forEach((fe: { event?: { event_projects?: Array<{ project?: { id: string; name: string; slug: string } | null }> } | null }) => {
        fe.event?.event_projects?.forEach((ep) => {
          if (ep.project) {
            artistMap.set(ep.project.id, ep.project);
          }
        });
      });
      
      return Array.from(artistMap.values());
    },
    enabled: !!id,
  });

  // Save festival mutation
  const saveFestivalMutation = useMutation({
    mutationFn: async () => {
      await getAuthenticatedUser();

      const payload: Record<string, unknown> = {
        name: festivalFormData.name,
        slug: festivalFormData.slug,
        description: festivalFormData.description,
        status: festivalFormData.status,
        start_at: festivalFormData.start_at ? new Date(festivalFormData.start_at).toISOString() : null,
        end_at: festivalFormData.end_at ? new Date(festivalFormData.end_at).toISOString() : null,
        venue_id: festivalFormData.venue_id || null,
        theme_id: festivalFormData.theme_id || null,
        date_range_section_id: festivalFormData.date_range_section_id || null,
        description_section_id: festivalFormData.description_section_id || null,
        name_section_id: festivalFormData.name_section_id || null,
      };

      const { data, error } = await supabase
        .from("festivals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      toast({ title: "Festival oppdatert" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Auto-generate slug from name
  const handleFestivalNameChange = (name: string) => {
    setFestivalFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  // Add section mutation
  const addSection = useMutation({
    mutationFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Du må være innlogget for å legge til seksjoner.");
      }

      const maxOrder = sections?.length || 0;
      const { error } = await supabase.from("festival_sections").insert({
        festival_id: id,
        type: "hero",
        title: "Ny seksjon",
        sort_order: maxOrder,
        bg_mode: "scroll",
        is_enabled: true,
      });
      
      if (error) {
        console.error("Feil ved opprettelse av seksjon:", error);
        if (error.code === "42501") {
          throw new Error("Du har ikke tilgang til å redigere denne festivalen.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-sections", id] });
      toast({ title: "Seksjon lagt til" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Kunne ikke legge til seksjon", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update section mutation
  const updateSection = useMutation({
    mutationFn: async ({ sectionId, updates }: { sectionId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("festival_sections")
        .update(updates)
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-sections", id] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Kunne ikke oppdatere seksjon", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Move section mutation
  const moveSection = useMutation({
    mutationFn: async ({ sectionId, direction }: { sectionId: string; direction: "up" | "down" }) => {
      const currentSection = sections?.find((s) => s.id === sectionId);
      if (!currentSection || !sections) return;

      const currentOrder = currentSection.sort_order;
      const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapSection = sections.find((s) => s.sort_order === newOrder);

      if (!swapSection) return;

      await supabase
        .from("festival_sections")
        .update({ sort_order: newOrder })
        .eq("id", sectionId);

      await supabase
        .from("festival_sections")
        .update({ sort_order: currentOrder })
        .eq("id", swapSection.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-sections", id] });
    },
  });

  // Delete section mutation
  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from("festival_sections")
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-sections", id] });
      toast({ title: "Seksjon slettet" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Kunne ikke slette seksjon", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (isLoadingFestival || isLoadingSections) {
    return <LoadingState message="Laster festival..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/admin/festivals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Festivaler
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{festival?.name || "Festival"}</h1>
          <p className="text-sm text-muted-foreground">Experience Builder</p>
        </div>
      </div>

      {/* Festival Settings Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setFestivalFormExpanded(!festivalFormExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <h2 className="text-lg font-semibold text-foreground">Festival-innstillinger</h2>
              <p className="text-sm text-muted-foreground">Navn, datoer, venue og visningsvalg</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {festivalFormExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {festivalFormExpanded && (
          <div className="border-t border-border p-4 space-y-6 bg-muted/20">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="festival-name">Navn</Label>
                <Input
                  id="festival-name"
                  value={festivalFormData.name}
                  onChange={(e) => handleFestivalNameChange(e.target.value)}
                  placeholder="Festival navn"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="festival-slug">URL-slug</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  <span>/festival/</span>
                  <span className="text-foreground font-mono">{festivalFormData.slug || "..."}</span>
                </div>
                <p className="text-xs text-muted-foreground">Genereres automatisk fra navn</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="festival-description">Beskrivelse</Label>
                <Textarea
                  id="festival-description"
                  value={festivalFormData.description}
                  onChange={(e) => setFestivalFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Kort beskrivelse av festivalen..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="festival-start_at">Startdato</Label>
                  <Input
                    id="festival-start_at"
                    type="date"
                    value={festivalFormData.start_at}
                    onChange={(e) => setFestivalFormData((prev) => ({ ...prev, start_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="festival-end_at">Sluttdato</Label>
                  <Input
                    id="festival-end_at"
                    type="date"
                    value={festivalFormData.end_at}
                    onChange={(e) => setFestivalFormData((prev) => ({ ...prev, end_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="festival-venue_id">Venue</Label>
                  <Select
                    value={festivalFormData.venue_id || undefined}
                    onValueChange={(value) => setFestivalFormData((prev) => ({ ...prev, venue_id: value === "__none__" ? "" : value }))}
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
                  <Label htmlFor="festival-theme_id">Theme</Label>
                  <Select
                    value={festivalFormData.theme_id || undefined}
                    onValueChange={(value) => setFestivalFormData((prev) => ({ ...prev, theme_id: value === "__none__" ? "" : value }))}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="festival-status">Status</Label>
                <Select
                  value={festivalFormData.status}
                  onValueChange={(value: "draft" | "submitted" | "published") => setFestivalFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Utkast</SelectItem>
                    <SelectItem value="submitted">Innsendt</SelectItem>
                    <SelectItem value="published">Publisert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section selection for festival details */}
            {sections && sections.length > 0 && (
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Vis festivaldetaljer i seksjoner</h3>
                <p className="text-sm text-muted-foreground">Velg hvilke seksjoner som skal vise festivalnavn, dato og beskrivelse.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_section_id">Festivalnavn</Label>
                    <Select
                      value={festivalFormData.name_section_id || undefined}
                      onValueChange={(value) => setFestivalFormData((prev) => ({ ...prev, name_section_id: value === "__none__" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg seksjon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ikke vis</SelectItem>
                        {sections?.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title} ({section.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_range_section_id">Datoer</Label>
                    <Select
                      value={festivalFormData.date_range_section_id || undefined}
                      onValueChange={(value) => setFestivalFormData((prev) => ({ ...prev, date_range_section_id: value === "__none__" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg seksjon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ikke vis</SelectItem>
                        {sections?.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title} ({section.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description_section_id">Beskrivelse</Label>
                    <Select
                      value={festivalFormData.description_section_id || undefined}
                      onValueChange={(value) => setFestivalFormData((prev) => ({ ...prev, description_section_id: value === "__none__" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg seksjon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ikke vis</SelectItem>
                        {sections?.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title} ({section.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="pt-2">
              <Button 
                onClick={() => saveFestivalMutation.mutate()}
                disabled={saveFestivalMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveFestivalMutation.isPending ? "Lagrer..." : "Lagre innstillinger"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {sections?.length || 0} seksjoner
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/festivals/${id}/program`}>
              <Calendar className="h-4 w-4 mr-2" />
              Program
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/festival/${festival?.slug}`} target="_blank">
              Se live →
            </Link>
          </Button>
          <Button onClick={() => addSection.mutate()} disabled={addSection.isPending} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {addSection.isPending ? "Legger til..." : "Legg til seksjon"}
          </Button>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-3">
        {sections?.map((section, index) => {
          const isExpanded = expandedSections.has(section.id);
          const contentJson = section.content_json as Record<string, unknown> | null;

          return (
            <div
              key={section.id}
              className={`bg-card border rounded-lg overflow-hidden ${
                section.is_enabled ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              {/* Section header - always visible */}
              <div className="p-3 md:p-4">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  {/* Row 1: Type + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(section.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <Select
                        value={section.type}
                        onValueChange={(value) =>
                          updateSection.mutate({ sectionId: section.id, updates: { type: value } })
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateSection.mutate({
                            sectionId: section.id,
                            updates: { is_enabled: !section.is_enabled },
                          })
                        }
                      >
                        {section.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSection.mutate({ sectionId: section.id, direction: "up" })}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSection.mutate({ sectionId: section.id, direction: "down" })}
                        disabled={index === sections.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (confirm("Slette seksjonen?")) {
                            deleteSection.mutate(section.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Title + bg mode */}
                  <div className="flex gap-2">
                    <Input
                      value={section.title}
                      onChange={(e) =>
                        updateSection.mutate({ sectionId: section.id, updates: { title: e.target.value } })
                      }
                      className="flex-1 h-8 text-sm"
                      placeholder="Tittel"
                    />
                    <Select
                      value={section.bg_mode}
                      onValueChange={(value) =>
                        updateSection.mutate({ sectionId: section.id, updates: { bg_mode: value } })
                      }
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scroll">Scroll</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expand button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(section.id)}
                    className="w-full h-8 text-xs"
                  >
                    {isExpanded ? "Skjul innstillinger" : "Vis innstillinger"}
                  </Button>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:flex items-center gap-4">
                  <button
                    onClick={() => toggleExpanded(section.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-pointer" />
                  </button>

                  <Select
                    value={section.type}
                    onValueChange={(value) =>
                      updateSection.mutate({ sectionId: section.id, updates: { type: value } })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSection.mutate({ sectionId: section.id, updates: { title: e.target.value } })
                    }
                    className="flex-1"
                    placeholder="Seksjons-tittel"
                  />

                  <Select
                    value={section.bg_mode}
                    onValueChange={(value) =>
                      updateSection.mutate({ sectionId: section.id, updates: { bg_mode: value } })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scroll">Scroll</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateSection.mutate({
                        sectionId: section.id,
                        updates: { is_enabled: !section.is_enabled },
                      })
                    }
                  >
                    {section.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSection.mutate({ sectionId: section.id, direction: "up" })}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSection.mutate({ sectionId: section.id, direction: "down" })}
                      disabled={index === sections.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Er du sikker på at du vil slette denne seksjonen?")) {
                        deleteSection.mutate(section.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(section.id)}
                  >
                    {isExpanded ? "Lukk" : "Rediger"}
                  </Button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (() => {
                const sectionType = SECTION_TYPES.find(t => t.value === section.type);
                const content = getSectionContent(section);

                return (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                    {/* Events (hvis støttet) */}
                    {sectionType?.supports_events && festivalEvents && festivalEvents.length > 0 && (
                      <div className="space-y-2">
                        <Label>Velg events</Label>
                        <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded p-2">
                          {festivalEvents.map((event: { id: string; title: string; start_at?: string }) => {
                            const isSelected = content.events.includes(event.id);
                            return (
                              <label key={event.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newEvents = e.target.checked
                                      ? [...content.events, event.id]
                                      : content.events.filter((id: string) => id !== event.id);
                                    updateSection.mutate({
                                      sectionId: section.id,
                                      updates: buildContentJson({ ...content, events: newEvents })
                                    });
                                  }}
                                  className="rounded border-border"
                                />
                                <span className="text-sm">{event.title}</span>
                                {event.start_at && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(event.start_at).toLocaleDateString('nb-NO')}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Artister (hvis støttet) */}
                    {sectionType?.supports_artists && featuredArtists && featuredArtists.length > 0 && (
                      <div className="space-y-2">
                        <Label>Velg artister</Label>
                        <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded p-2">
                          {featuredArtists.map((artist: { id: string; name: string }) => {
                            const isSelected = content.artists.includes(artist.id);
                            return (
                              <label key={artist.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newArtists = e.target.checked
                                      ? [...content.artists, artist.id]
                                      : content.artists.filter((id: string) => id !== artist.id);
                                    updateSection.mutate({
                                      sectionId: section.id,
                                      updates: buildContentJson({ ...content, artists: newArtists })
                                    });
                                  }}
                                  className="rounded border-border"
                                />
                                <span className="text-sm">{artist.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Venue (hvis støttet) */}
                    {sectionType?.supports_venue && venues && venues.length > 0 && (
                      <div className="space-y-2">
                        <Label>Velg venue</Label>
                        <Select
                          value={content.venue || ""}
                          onValueChange={(value) => {
                            updateSection.mutate({
                              sectionId: section.id,
                              updates: buildContentJson({ ...content, venue: value === "__none__" ? null : value })
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Velg venue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Ingen venue</SelectItem>
                            {venues.map((venue) => (
                              <SelectItem key={venue.id} value={venue.id}>
                                {venue.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Bakgrunnsbilder */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Bakgrunn desktop
                        </label>
                        {(section.bg_image_url_desktop || section.bg_image_url) && (
                          <div className="relative w-full h-20 rounded border border-border overflow-hidden bg-muted">
                            <img
                              src={section.bg_image_url_desktop || section.bg_image_url || ""}
                              alt="Desktop bakgrunn"
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 bg-background/90 hover:bg-background border border-border"
                              onClick={() =>
                                updateSection.mutate({
                                  sectionId: section.id,
                                  updates: { bg_image_url_desktop: null },
                                })
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMediaPickerOpen({ sectionId: section.id, type: "desktop" })}
                          className="w-full"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {section.bg_image_url_desktop ? "Endre" : "Velg"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Bakgrunn mobil
                        </label>
                        {section.bg_image_url_mobile && (
                          <div className="relative w-full h-20 rounded border border-border overflow-hidden bg-muted">
                            <img
                              src={section.bg_image_url_mobile}
                              alt="Mobil bakgrunn"
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 bg-background/90 hover:bg-background border border-border"
                              onClick={() =>
                                updateSection.mutate({
                                  sectionId: section.id,
                                  updates: { bg_image_url_mobile: null },
                                })
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMediaPickerOpen({ sectionId: section.id, type: "mobile" })}
                          className="w-full"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {section.bg_image_url_mobile ? "Endre" : "Velg"}
                        </Button>
                      </div>
                    </div>

                    {/* Image fit mode */}
                    <div className="space-y-2">
                      <Label>Bildevisning</Label>
                      <Select
                        value={(section as { image_fit_mode?: string }).image_fit_mode || 'cover'}
                        onValueChange={(value) =>
                          updateSection.mutate({
                            sectionId: section.id,
                            updates: { image_fit_mode: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cover">Dekk hele området</SelectItem>
                          <SelectItem value="contain">Vis hele bildet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}

              {/* Media picker */}
              {mediaPickerOpen?.sectionId === section.id && (
                <MediaPicker
                  open={true}
                  onOpenChange={(open) => !open && setMediaPickerOpen(null)}
                  onSelect={(mediaId, publicUrl) => {
                    const fieldName = 
                      mediaPickerOpen.type === "desktop" ? "bg_image_url_desktop" :
                      mediaPickerOpen.type === "mobile" ? "bg_image_url_mobile" :
                      "bg_image_url";
                    
                    updateSection.mutate({
                      sectionId: section.id,
                      updates: { [fieldName]: publicUrl },
                    });
                    setMediaPickerOpen(null);
                    toast({ title: "Bilde valgt fra filbank" });
                  }}
                  fileType="image"
                />
              )}
            </div>
          );
        })}

        {sections?.length === 0 && (
          <div className="text-center py-8 md:py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p className="text-sm">Ingen seksjoner ennå.</p>
            <Button onClick={() => addSection.mutate()} className="mt-4" size="sm" disabled={addSection.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {addSection.isPending ? "Legger til..." : "Legg til første seksjon"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
