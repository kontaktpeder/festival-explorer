import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import { FileText, X, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FestivalMediaPickerDialog } from "./FestivalMediaPickerDialog";

interface FestivalDocumentsProps {
  festivalId: string;
}

const DOCUMENT_FIELDS = [
  { key: "contract_media_id" as const, label: "Kontrakt" },
  { key: "tech_rider_media_id" as const, label: "Tech rider" },
  { key: "hosp_rider_media_id" as const, label: "Hosp rider" },
];

export function FestivalDocuments({ festivalId }: FestivalDocumentsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pickingField, setPickingField] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["festival-documents", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("id, contract_media_id, tech_rider_media_id, hosp_rider_media_id")
        .eq("id", festivalId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch filenames for linked media
  const mediaIds = data
    ? [data.contract_media_id, data.tech_rider_media_id, data.hosp_rider_media_id].filter(Boolean)
    : [];

  const { data: mediaFiles } = useQuery({
    queryKey: ["festival-doc-files", ...mediaIds],
    queryFn: async () => {
      if (mediaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("festival_media")
        .select("id, original_filename, public_url")
        .in("id", mediaIds);
      if (error) throw error;
      return data || [];
    },
    enabled: mediaIds.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string | null>) => {
      const { error } = await supabase
        .from("festivals")
        .update(payload)
        .eq("id", festivalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-documents", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festival-doc-files"] });
      toast({ title: "Oppdatert" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !data) {
    return <LoadingState message="Laster..." />;
  }

  const getFileName = (mediaId: string | null) => {
    if (!mediaId || !mediaFiles) return null;
    return mediaFiles.find((f: any) => f.id === mediaId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Dokumenter
      </h3>
      <p className="text-xs text-muted-foreground/70">
        Koble standard kontrakt, tech rider og hosp rider fra filbanken.
      </p>

      <div className="space-y-3">
        {DOCUMENT_FIELDS.map((field) => {
          const mediaId = (data as any)[field.key] as string | null;
          const file = getFileName(mediaId);

          return (
            <div
              key={field.key}
              className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/20 bg-card/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block">
                    {field.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 truncate block">
                    {file
                      ? (file as any).original_filename
                      : "Ingen fil koblet"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {mediaId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Fjern kobling"
                    onClick={() =>
                      updateMutation.mutate({ [field.key]: null })
                    }
                  >
                    <X className="h-3 w-3 text-destructive/60" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 border-border/20"
                  onClick={() => setPickingField(field.key)}
                >
                  <LinkIcon className="h-3 w-3" />
                  {mediaId ? "Endre" : "Koble fil"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Picker dialog */}
      {pickingField && (
        <FestivalMediaPickerDialog
          festivalId={festivalId}
          open={!!pickingField}
          onOpenChange={(open) => !open && setPickingField(null)}
          onSelect={async (mediaId) => {
            await updateMutation.mutateAsync({ [pickingField]: mediaId });
            setPickingField(null);
          }}
        />
      )}
    </div>
  );
}
