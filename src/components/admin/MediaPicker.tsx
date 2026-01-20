import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ImageIcon,
  Search,
  Check,
  Video,
  Music,
  FileText,
  ExternalLink,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { MediaUpload } from "./MediaUpload";

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mediaId: string, publicUrl: string) => void;
  fileType?: "image" | "video" | "audio" | "document";
  userOnly?: boolean; // Vis kun brukerens egne filer
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  fileType,
  userOnly = false,
}: MediaPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>(fileType || "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  const { data: media, isLoading } = useQuery({
    queryKey: ["admin-media", selectedType, search, userOnly],
    queryFn: async () => {
      let query = supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Filtrer på brukerens egne filer hvis userOnly er aktivert
      if (userOnly) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("created_by", user.id);
        }
      }

      if (selectedType !== "all") {
        query = query.eq("file_type", selectedType);
      }

      if (fileType) {
        query = query.eq("file_type", fileType);
      }

      if (search) {
        query = query.or(
          `original_filename.ilike.%${search}%,alt_text.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleSelect = () => {
    if (!selectedId) return;
    const selected = media?.find((m) => m.id === selectedId);
    if (selected) {
      onSelect(selected.id, selected.external_url || selected.public_url);
      onOpenChange(false);
      setSelectedId(null);
    }
  };

  const handleUploadComplete = (mediaId: string, publicUrl: string) => {
    onSelect(mediaId, publicUrl);
    onOpenChange(false);
    setSelectedId(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-8 h-8 text-muted-foreground" />;
      case "video":
        return <Video className="w-8 h-8 text-muted-foreground" />;
      case "audio":
        return <Music className="w-8 h-8 text-muted-foreground" />;
      case "document":
        return <FileText className="w-8 h-8 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Velg fil fra filbank</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "library" | "upload")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Filbibliotek
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Last opp ny
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex gap-2 mb-4">
              {!fileType && (
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    <SelectItem value="image">Bilder</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Lyd</SelectItem>
                    <SelectItem value="document">Dokumenter</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Søk i filer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  Laster filer...
                </div>
              ) : media?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p>Ingen filer funnet</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("upload")}
                    className="mt-2"
                  >
                    Last opp din første fil
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {media?.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedId === item.id
                          ? "border-accent ring-2 ring-accent/50"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {item.file_type === "image" ? (
                        <img
                          src={item.public_url}
                          alt={item.alt_text || item.original_filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-1">
                          {getIcon(item.file_type)}
                          {item.external_provider && (
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground truncate px-2 max-w-full">
                            {item.original_filename}
                          </span>
                        </div>
                      )}
                      {selectedId === item.id && (
                        <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-accent" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSelect} disabled={!selectedId}>
                Velg fil
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 mt-4">
            <MediaUpload
              fileType={fileType}
              onUploadComplete={handleUploadComplete}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
