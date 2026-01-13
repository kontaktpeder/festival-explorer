import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Eye, EyeOff, GripVertical, ImageIcon, X, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { MediaPicker } from "@/components/admin/MediaPicker";

const SECTION_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "program", label: "Program" },
  { value: "om", label: "Om Giggen" },
  { value: "artister", label: "Artister" },
  { value: "venue-plakat", label: "Venue-plakat" },
  { value: "praktisk", label: "Praktisk" },
  { value: "footer", label: "Footer" },
] as const;

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

  // Fetch festival info
  const { data: festival } = useQuery({
    queryKey: ["admin-festival", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .eq("id", id)
        .single();
      return data;
    },
  });

  // Fetch sections
  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-festival-sections", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_sections")
        .select("*")
        .eq("festival_id", id)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

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

  if (isLoading) {
    return <LoadingState message="Laster seksjoner..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to={`/admin/festivals/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Experience Builder</h1>
          <p className="text-sm text-muted-foreground">{festival?.name}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {sections?.length || 0} seksjoner
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/festival/${festival?.slug}`} target="_blank">
              Se live →
            </Link>
          </Button>
          <Button onClick={() => addSection.mutate()} disabled={addSection.isPending} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {addSection.isPending ? "Legger til..." : "Legg til"}
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
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                  {/* Desktop/Mobile background images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Desktop image */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Bakgrunn desktop (landscape)
                      </label>
                      {(section.bg_image_url_desktop || section.bg_image_url) && (
                        <div className="relative w-full h-24 rounded border border-border overflow-hidden bg-muted">
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
                        {section.bg_image_url_desktop ? "Endre" : "Velg bilde"}
                      </Button>
                    </div>

                    {/* Mobile image */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Bakgrunn mobil (portrait)
                      </label>
                      {section.bg_image_url_mobile && (
                        <div className="relative w-full h-24 rounded border border-border overflow-hidden bg-muted">
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
                        {section.bg_image_url_mobile ? "Endre" : "Velg bilde"}
                      </Button>
                    </div>
                  </div>

                  {/* Content editor based on section type */}
                  {(section.type === "om" || section.type === "footer") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {section.type === "om" ? "Tekst" : "Beskrivelse"}
                      </label>
                      <Textarea
                        value={(contentJson?.text as string) || (contentJson?.description as string) || ""}
                        onChange={(e) => {
                          const key = section.type === "om" ? "text" : "description";
                          updateSection.mutate({
                            sectionId: section.id,
                            updates: {
                              content_json: {
                                ...contentJson,
                                [key]: e.target.value,
                              },
                            },
                          });
                        }}
                        placeholder={section.type === "om" ? "Skriv om festivalen..." : "Skriv beskrivelse..."}
                        className="min-h-[120px]"
                      />
                    </div>
                  )}

                  {section.type === "praktisk" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Praktisk info (én linje per punkt)</label>
                      <Textarea
                        value={
                          contentJson?.info && Array.isArray(contentJson.info)
                            ? (contentJson.info as string[]).join("\n")
                            : ""
                        }
                        onChange={(e) => {
                          const lines = e.target.value.split("\n").filter(Boolean);
                          updateSection.mutate({
                            sectionId: section.id,
                            updates: {
                              content_json: {
                                ...contentJson,
                                info: lines,
                              },
                            },
                          });
                        }}
                        placeholder="Dører åpner: 20:00&#10;Aldersgrense: 18 år&#10;Billetter: Kjøp på døren"
                        className="min-h-[120px]"
                      />
                    </div>
                  )}
                </div>
              )}

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
