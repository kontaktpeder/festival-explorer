import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Eye, EyeOff, GripVertical, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function AdminSections() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mediaPickerOpen, setMediaPickerOpen] = useState<string | null>(null);

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
      const maxOrder = sections?.length || 0;
      const { error } = await supabase.from("festival_sections").insert({
        festival_id: id,
        type: "hero",
        title: "Ny seksjon",
        sort_order: maxOrder,
        bg_mode: "scroll",
        is_enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-sections", id] });
      toast({ title: "Seksjon lagt til" });
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

      // Swap orders
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
  });

  if (isLoading) {
    return <LoadingState message="Laster seksjoner..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/festivals/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Experience Builder</h1>
          <p className="text-muted-foreground">{festival?.name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {sections?.length || 0} seksjoner
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/festival/${festival?.slug}`} target="_blank">
              Se live →
            </Link>
          </Button>
          <Button onClick={() => addSection.mutate()}>
            <Plus className="h-4 w-4 mr-2" />
            Legg til seksjon
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sections?.map((section, index) => (
          <div
            key={section.id}
            className={`bg-card border rounded-lg p-4 ${
              section.is_enabled ? "border-border" : "border-border/50 opacity-60"
            }`}
          >
            <div className="flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />

              {/* Type selector */}
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

              {/* Title input */}
              <Input
                value={section.title}
                onChange={(e) =>
                  updateSection.mutate({ sectionId: section.id, updates: { title: e.target.value } })
                }
                className="flex-1"
                placeholder="Seksjons-tittel"
              />

              {/* Background mode */}
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

              {/* Enable/disable toggle */}
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
                {section.is_enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>

              {/* Move buttons */}
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

              {/* Delete button */}
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
            </div>

            {/* Background image URL */}
            <div className="mt-3 pl-9">
              <div className="flex gap-2">
                <Input
                  value={section.bg_image_url || ""}
                  onChange={(e) =>
                    updateSection.mutate({
                      sectionId: section.id,
                      updates: { bg_image_url: e.target.value || null },
                    })
                  }
                  placeholder="Bakgrunnsbilde URL (valgfritt)"
                  className="text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(section.id)}
                  className="flex-shrink-0"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Velg fra filbank
                </Button>
              </div>
              {mediaPickerOpen === section.id && (
                <MediaPicker
                  open={true}
                  onOpenChange={(open) => !open && setMediaPickerOpen(null)}
                  onSelect={(mediaId, publicUrl) => {
                    updateSection.mutate({
                      sectionId: section.id,
                      updates: { bg_image_url: publicUrl },
                    });
                    setMediaPickerOpen(null);
                    toast({ title: "Bilde valgt fra filbank" });
                  }}
                  fileType="image"
                />
              )}
            </div>
          </div>
        ))}

        {sections?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p>Ingen seksjoner ennå.</p>
            <Button onClick={() => addSection.mutate()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Legg til første seksjon
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
