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
  userOnly?: boolean; // Vis kun brukerens egne filer (default: true for sikkerhet)
  showAllForAdmin?: boolean; // Tillat admin å se alle filer
  /** Show quality selection for image uploads (only for admins) */
  showQualitySelection?: boolean;
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  fileType,
  userOnly = true, // Default til true for sikkerhet
  showAllForAdmin = false, // Admin må eksplisitt aktivere for å se alle
  showQualitySelection = false,
}: MediaPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>(fileType || "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  const { data: media, isLoading } = useQuery({
    queryKey: ["admin-media", selectedType, search, userOnly, showAllForAdmin],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Sjekk om bruker er admin
      const { data: isAdmin } = await supabase.rpc("is_admin");

      let query = supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Sikkerhetskontroll: Vis kun egne filer + prosjektfiler med mindre admin med showAllForAdmin
      if (isAdmin && showAllForAdmin) {
        // Admin kan se alle filer hvis eksplisitt aktivert
      } else if (userOnly || !isAdmin) {
        // Standard: kun egne filer + filer fra prosjekter brukeren er medlem av
        const { data: userEntities } = await supabase
          .from("entity_team")
          .select("entity_id, entity:entities(created_by)")
          .eq("user_id", user.id)
          .is("left_at", null);

        // Collect all user IDs whose files the user should see
        const allowedUserIds = new Set<string>([user.id]);
        
        if (userEntities) {
          userEntities.forEach((ue: any) => {
            if (ue.entity?.created_by) {
              allowedUserIds.add(ue.entity.created_by);
            }
          });
        }

        query = query.in("created_by", Array.from(allowedUserIds));
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
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-3 sm:p-4 gap-0">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg">Velg fil fra filbank</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "library" | "upload")}
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="library" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Filbibliotek</span>
              <span className="sm:hidden">Bibliotek</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Last opp ny</span>
              <span className="sm:hidden">Last opp</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-2 data-[state=inactive]:hidden">
            <div className="flex flex-col sm:flex-row gap-2 mb-2 flex-shrink-0">
              {!fileType && (
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full sm:w-36 h-8 text-xs sm:text-sm">
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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Søk i filer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  Laster filer...
                </div>
              ) : media?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                  <p className="text-xs sm:text-sm">Ingen filer funnet</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("upload")}
                    className="mt-1 text-xs sm:text-sm h-auto p-0"
                  >
                    Last opp din første fil
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
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
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate px-1 sm:px-2 max-w-full">
                            {item.original_filename}
                          </span>
                        </div>
                      )}
                      {selectedId === item.id && (
                        <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                          <Check className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border mt-2 flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none" size="sm">
                Avbryt
              </Button>
              <Button onClick={handleSelect} disabled={!selectedId} className="flex-1 sm:flex-none" size="sm">
                Velg fil
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <MediaUpload
              fileType={fileType}
              onUploadComplete={handleUploadComplete}
              showQualitySelection={showQualitySelection}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
