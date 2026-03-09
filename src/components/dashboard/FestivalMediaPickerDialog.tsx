import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FestivalMediaPickerDialogProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mediaId: string) => void;
}

export function FestivalMediaPickerDialog({
  festivalId,
  open,
  onOpenChange,
  onSelect,
}: FestivalMediaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["festival-media-picker", festivalId, search],
    queryFn: async () => {
      let query = supabase
        .from("festival_media")
        .select("id, original_filename, file_type, folder_path, created_at")
        .eq("festival_id", festivalId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        query = query.ilike("original_filename", `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Velg fil fra filbanken
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Søk i filbank..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-0.5">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Laster...</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Ingen filer funnet.
            </p>
          ) : (
            files.map((file: any) => (
              <button
                key={file.id}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors",
                  selectedId === file.id
                    ? "bg-accent/10 border border-accent/30"
                    : "hover:bg-muted/30 border border-transparent"
                )}
                onClick={() => setSelectedId(file.id)}
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground truncate block">
                    {file.original_filename}
                  </span>
                  {file.folder_path && (
                    <span className="text-[10px] text-muted-foreground/50">
                      {file.folder_path}
                    </span>
                  )}
                </div>
                {selectedId === file.id && (
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Avbryt
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!selectedId}
            onClick={() => selectedId && onSelect(selectedId)}
          >
            Velg
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
