import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, ArrowLeft, ExternalLink } from "lucide-react";
import { UniversalEditor } from "@/components/editor/UniversalEditor";
import { LivePreview } from "@/components/editor/LivePreview";
import { ThemeControls } from "@/components/editor/ThemeControls";
import { BackgroundControls } from "@/components/editor/BackgroundControls";
import { SectionControls } from "@/components/editor/SectionControls";
import { getDesignByEntity, saveDesign } from "@/lib/designs";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import type { Design, DesignTheme, BackgroundConfig, Section } from "@/types/design";
import { createDefaultDesign } from "@/types/design";
import { Separator } from "@/components/ui/separator";

export default function FestivalEditor() {
  const { id: festivalId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Design state
  const [design, setDesign] = useState<Design>(() => 
    createDefaultDesign("festival")
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch festival info
  const { data: festival, isLoading: isLoadingFestival } = useQuery({
    queryKey: ["admin-festival", festivalId],
    queryFn: async () => {
      if (!festivalId) return null;
      const { data, error } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .eq("id", festivalId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!festivalId,
  });

  // Fetch existing design for this festival
  const { data: existingDesign, isLoading: isLoadingDesign } = useQuery({
    queryKey: ["festival-design", festivalId],
    queryFn: async () => {
      if (!festivalId) return null;
      return getDesignByEntity("festival", festivalId);
    },
    enabled: !!festivalId,
  });

  // Load existing design when fetched
  useEffect(() => {
    if (existingDesign) {
      setDesign(existingDesign);
    } else if (festivalId) {
      // Set entity info for new design
      setDesign((prev) => ({
        ...prev,
        entity_type: "festival",
        entity_id: festivalId,
      }));
    }
  }, [existingDesign, festivalId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();
      return saveDesign(
        {
          ...design,
          entity_type: "festival",
          entity_id: festivalId,
        },
        user.id
      );
    },
    onSuccess: (savedDesign) => {
      setDesign(savedDesign);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["festival-design", festivalId] });
      toast({ title: "Design lagret!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Kunne ikke lagre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update handlers
  const updateTheme = useCallback((theme: DesignTheme) => {
    setDesign((prev) => ({ ...prev, theme }));
    setHasChanges(true);
  }, []);

  const updateBackground = useCallback((background: BackgroundConfig) => {
    setDesign((prev) => ({ ...prev, background }));
    setHasChanges(true);
  }, []);

  const updateSections = useCallback((sections: Section[]) => {
    setDesign((prev) => ({ ...prev, sections }));
    setHasChanges(true);
  }, []);

  if (isLoadingFestival || isLoadingDesign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!festivalId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Ingen festival valgt.</p>
        <Button onClick={() => navigate("/admin/festivals")} className="mt-4">
          Gå til festivaler
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/festivals/${festivalId}/sections`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Design Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              {festival?.name || "Festival"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {festival?.slug && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/festival/${festival.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Forhåndsvis
              </a>
            </Button>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Lagrer..." : "Lagre design"}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <UniversalEditor
          title={`Festival Design: ${festival?.name || ""}`}
          controlsContent={
            <div className="space-y-6">
              <ThemeControls theme={design.theme} onChange={updateTheme} />
              <Separator />
              <BackgroundControls
                background={design.background}
                onChange={updateBackground}
              />
              <Separator />
              <SectionControls
                sections={design.sections}
                onChange={updateSections}
                themeColor={design.theme.primaryColor}
              />
            </div>
          }
          previewContent={<LivePreview design={design} mode="desktop" />}
          mobilePreviewContent={<LivePreview design={design} mode="mobile" />}
        />
      </div>
    </div>
  );
}
