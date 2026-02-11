import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { Search, Trash2, ImageIcon, Video, Music, FileText, Upload, ExternalLink, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Check media access permission
  const { data: canAccess } = useQuery({
    queryKey: ["can-access-media-page"],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_access_media_any");
      return data ?? false;
    },
  });

  // Admin media page - show own files + files from entities user is member of

  // Admin media page - show own files + files from entities user is member of
  const { data: media, isLoading } = useQuery({
    queryKey: ["admin-media", selectedType, search],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      // Check if admin - admins see all files
      const { data: isAdmin } = await supabase.rpc("is_admin");
      
      let query = supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });

      // Non-admins: only see own files + files from entities they're members of
      if (!isAdmin) {
        // Get all entities where user is a team member
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

      if (search) {
        query = query.or(
          `original_filename.ilike.%${search}%,alt_text.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data: mediaItem } = await supabase
        .from("media")
        .select("storage_path")
        .eq("id", mediaId)
        .single();

      if (mediaItem?.storage_path && !mediaItem.storage_path.startsWith("http")) {
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove([mediaItem.storage_path]);
        if (storageError) console.error("Storage delete error:", storageError);
      }

      const { error } = await supabase
        .from("media")
        .delete()
        .eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      toast({ title: "Fil slettet" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Feil ved sletting", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
      case "video":
        return <Video className="h-8 w-8 text-muted-foreground" />;
      case "audio":
        return <Music className="h-8 w-8 text-muted-foreground" />;
      case "document":
        return <FileText className="h-8 w-8 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (canAccess === false) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Filbank</h1>
          <p className="text-muted-foreground">
            Administrer alle mediefiler i systemet
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Last opp fil
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typer</SelectItem>
            <SelectItem value="image">Bilder</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Lyd</SelectItem>
            <SelectItem value="document">Dokumenter</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter filer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Media grid */}
      {isLoading ? (
        <LoadingState message="Laster filer..." />
      ) : media?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Ingen filer funnet</p>
          <Button onClick={() => setShowUpload(true)} className="mt-4">
            Last opp din første fil
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media?.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card border border-border rounded-lg overflow-hidden"
            >
              {item.file_type === "image" ? (
                <img
                  src={item.public_url}
                  alt={item.alt_text || item.original_filename}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted">
                  {getIcon(item.file_type)}
                  {item.external_provider && (
                    <ExternalLink className="h-4 w-4 mt-2 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.original_filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.size_bytes || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Last opp fil</DialogTitle>
          </DialogHeader>
          <MediaUpload
            onUploadComplete={() => {
              setShowUpload(false);
              queryClient.invalidateQueries({ queryKey: ["admin-media"] });
              toast({ title: "Fil lastet opp" });
            }}
            showQualitySelection={true}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett fil?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne filen? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
