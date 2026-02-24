import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "@/components/admin/MediaUpload";
import {
  Search,
  Trash2,
  ImageIcon,
  Video,
  Music,
  FileText,
  Upload,
  Download,
  FolderOpen,
  User,
} from "lucide-react";
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
import { FestivalMediaUpload } from "@/components/admin/FestivalMediaUpload";
import { downloadFile } from "@/lib/download-helpers";

const CATEGORIES = [
  { value: "all", label: "Alle typer" },
  { value: "image", label: "Bilder" },
  { value: "video", label: "Video" },
  { value: "document", label: "Filer" },
  { value: "audio", label: "Lyd" },
] as const;

function getIcon(type: string) {
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
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + ["B", "KB", "MB", "GB"][i];
}

export default function FestivalFilbankPage() {
  const { id: festivalId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeRoom, setActiveRoom] = useState<"privat" | "festival">("festival");
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSource, setDeleteSource] = useState<"media" | "festival_media">("media");
  const [showUploadPrivat, setShowUploadPrivat] = useState(false);
  const [showUploadFestival, setShowUploadFestival] = useState(false);

  // --- Permissions ---
  const { data: permissions, isLoading: permLoading } = useQuery({
    queryKey: ["festival-filbank-permissions", festivalId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !festivalId) return { canAccess: false, canEdit: false };
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) return { canAccess: true, canEdit: true };
      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", user.id);
      if (!personas?.length) return { canAccess: false, canEdit: false };
      const ids = personas.map((p) => p.id);
      const { data: fp } = await supabase
        .from("festival_participants")
        .select("can_access_media, can_edit_festival_media")
        .eq("festival_id", festivalId)
        .eq("participant_kind", "persona")
        .in("participant_id", ids);
      return {
        canAccess: fp?.some((f) => f.can_access_media) ?? false,
        canEdit: fp?.some((f) => f.can_edit_festival_media) ?? false,
      };
    },
    enabled: !!festivalId,
  });

  // --- Private media ---
  const { data: privatMedia, isLoading: privatLoading } = useQuery({
    queryKey: ["filbank-privat", festivalId, selectedType, search],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      let q = supabase
        .from("media")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (selectedType !== "all") q = q.eq("file_type", selectedType);
      if (search)
        q = q.or(
          `original_filename.ilike.%${search}%,alt_text.ilike.%${search}%`
        );
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!festivalId && activeRoom === "privat",
  });

  // --- Festival media ---
  const { data: festivalMedia, isLoading: festivalLoading } = useQuery({
    queryKey: ["festival-media", festivalId, selectedType, search],
    queryFn: async () => {
      if (!festivalId) return [];
      let q = supabase
        .from("festival_media")
        .select("*")
        .eq("festival_id", festivalId)
        .order("created_at", { ascending: false });
      if (selectedType !== "all") q = q.eq("file_type", selectedType);
      if (search) q = q.or(`original_filename.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled:
      !!festivalId &&
      activeRoom === "festival" &&
      (permissions?.canAccess ?? false),
  });

  // --- Delete mutations ---
  const deletePrivatMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data: item } = await supabase
        .from("media")
        .select("storage_path")
        .eq("id", mediaId)
        .single();
      if (item?.storage_path && !item.storage_path.startsWith("http")) {
        await supabase.storage.from("media").remove([item.storage_path]);
      }
      const { error } = await supabase.from("media").delete().eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filbank-privat"] });
      toast({ title: "Fil slettet" });
      setDeleteId(null);
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const deleteFestivalMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data: item } = await supabase
        .from("festival_media")
        .select("storage_path")
        .eq("id", mediaId)
        .single();
      if (item?.storage_path) {
        await supabase.storage.from("media").remove([item.storage_path]);
      }
      const { error } = await supabase
        .from("festival_media")
        .delete()
        .eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-media"] });
      toast({ title: "Fil slettet" });
      setDeleteId(null);
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  // --- Render helpers ---
  function renderGrid(
    list: Array<{
      id: string;
      file_type: string;
      original_filename: string;
      public_url: string;
      size_bytes?: number;
      alt_text?: string | null;
    }>,
    loading: boolean,
    isPrivat: boolean
  ) {
    if (loading) return <LoadingState message="Laster filer..." />;
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {isPrivat
              ? "Ingen filer i privat filbank."
              : "Ingen filer i festivalfilbanken."}
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {list.map((item) => (
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
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadFile(item.public_url, item.original_filename)}
                title="Last ned"
              >
                <Download className="h-4 w-4" />
              </Button>
              {(isPrivat || (permissions?.canEdit ?? false)) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteId(item.id);
                    setDeleteSource(isPrivat ? "media" : "festival_media");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">
                {item.original_filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.size_bytes ?? 0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- Guards ---
  if (!festivalId) return null;
  if (permLoading) return <LoadingState message="Laster..." />;
  if (!permissions?.canAccess) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Du har ikke tilgang til festivalfilbanken.</p>
      </div>
    );
  }

  const canEditFestival = permissions?.canEdit ?? false;

  return (
    <div className="space-y-6">
      <Tabs
        value={activeRoom}
        onValueChange={(v) => setActiveRoom(v as "privat" | "festival")}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <TabsList>
            <TabsTrigger
              value="festival"
              className="flex items-center gap-1.5"
            >
              <FolderOpen className="h-4 w-4" />
              Festival
            </TabsTrigger>
            <TabsTrigger value="privat" className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Privat
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeRoom === "privat" && (
              <Button size="sm" onClick={() => setShowUploadPrivat(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Last opp
              </Button>
            )}
            {activeRoom === "festival" && canEditFestival && (
              <Button size="sm" onClick={() => setShowUploadFestival(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Last opp
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
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

        <TabsContent value="festival" className="mt-4">
          {renderGrid(festivalMedia ?? [], festivalLoading, false)}
        </TabsContent>
        <TabsContent value="privat" className="mt-4">
          {renderGrid(privatMedia ?? [], privatLoading, true)}
        </TabsContent>
      </Tabs>

      {/* Upload dialogs */}
      <Dialog open={showUploadPrivat} onOpenChange={setShowUploadPrivat}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Last opp til privat filbank</DialogTitle>
          </DialogHeader>
          <MediaUpload
            onUploadComplete={() => {
              setShowUploadPrivat(false);
              queryClient.invalidateQueries({ queryKey: ["filbank-privat"] });
              toast({ title: "Fil lastet opp" });
            }}
          />
        </DialogContent>
      </Dialog>

      {canEditFestival && (
        <Dialog open={showUploadFestival} onOpenChange={setShowUploadFestival}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Last opp til festivalfilbank</DialogTitle>
            </DialogHeader>
            <FestivalMediaUpload
              festivalId={festivalId}
              onUploadComplete={() => {
                setShowUploadFestival(false);
                queryClient.invalidateQueries({
                  queryKey: ["festival-media"],
                });
                toast({ title: "Fil lastet opp" });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteSource("media");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett fil?</AlertDialogTitle>
            <AlertDialogDescription>
              Handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                if (deleteSource === "festival_media")
                  deleteFestivalMutation.mutate(deleteId);
                else deletePrivatMutation.mutate(deleteId);
              }}
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
