import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
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
  MoveRight,
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
import {
  ALL_FOLDERS,
  UNSTRUCTURED_FOLDER,
  FESTIVAL_FOLDERS,
  LEAF_FOLDERS,
  folderMatches,
  deriveIsSigned,
  type FolderSelection,
} from "@/lib/festival-folders";

const CATEGORIES = [
  { value: "all", label: "Alle typer" },
  { value: "image", label: "Bilder" },
  { value: "video", label: "Video" },
  { value: "document", label: "Filer" },
  { value: "audio", label: "Lyd" },
] as const;

function getIcon(type: string) {
  switch (type) {
    case "image": return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
    case "video": return <Video className="h-8 w-8 text-muted-foreground" />;
    case "audio": return <Music className="h-8 w-8 text-muted-foreground" />;
    case "document": return <FileText className="h-8 w-8 text-muted-foreground" />;
    default: return null;
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
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>(ALL_FOLDERS);
  const [moveItem, setMoveItem] = useState<null | {
    id: string;
    file_type: string;
    folder_path: string | null;
  }>(null);

  // --- Permissions ---
  const { data: permissions, isLoading: permLoading } = useQuery({
    queryKey: ["festival-filbank-permissions", festivalId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let q = supabase
        .from("media")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (selectedType !== "all") q = q.eq("file_type", selectedType);
      if (search) q = q.or(`original_filename.ilike.%${search}%,alt_text.ilike.%${search}%`);
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
    enabled: !!festivalId && activeRoom === "festival" && (permissions?.canAccess ?? false),
  });

  // --- Filtered festival media ---
  const filteredFestivalMedia = useMemo(
    () => (festivalMedia ?? []).filter((item: any) => folderMatches(item.folder_path ?? null, selectedFolder)),
    [festivalMedia, selectedFolder]
  );

  // --- Move mutation ---
  const moveMutation = useMutation({
    mutationFn: async ({ id, newFolder, fileType }: { id: string; newFolder: string | null; fileType: string }) => {
      const isSigned = deriveIsSigned(newFolder, fileType);
      const { error } = await supabase
        .from("festival_media")
        .update({ folder_path: newFolder, is_signed: isSigned } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-media"] });
      setMoveItem(null);
      toast({ title: "Fil flyttet" });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  // --- Delete mutations ---
  const deletePrivatMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data: item } = await supabase.from("media").select("storage_path").eq("id", mediaId).single();
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
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const deleteFestivalMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data: item } = await supabase.from("festival_media").select("storage_path").eq("id", mediaId).single();
      if (item?.storage_path) {
        await supabase.storage.from("media").remove([item.storage_path]);
      }
      const { error } = await supabase.from("festival_media").delete().eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-media"] });
      toast({ title: "Fil slettet" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
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
      folder_path?: string | null;
      is_signed?: boolean | null;
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
            {isPrivat ? "Ingen filer i privat filbank." : "Ingen filer i denne mappen."}
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {list.map((item) => (
          <div key={item.id} className="group relative bg-card border border-border rounded-lg overflow-hidden">
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
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 flex-wrap p-2">
              <Button variant="secondary" size="sm" onClick={() => downloadFile(item.public_url, item.original_filename)} title="Last ned">
                <Download className="h-4 w-4" />
              </Button>
              {!isPrivat && (permissions?.canEdit ?? false) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMoveItem({ id: item.id, file_type: item.file_type, folder_path: item.folder_path ?? null })} title="Flytt">
                    <MoveRight className="h-4 w-4" />
                  </Button>
                  {item.file_type === "document" && item.folder_path?.startsWith("Kontrakter/") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFolder = item.is_signed ? "Kontrakter/Ikke signert" : "Kontrakter/Signert";
                        moveMutation.mutate({ id: item.id, newFolder, fileType: item.file_type });
                      }}
                      title={item.is_signed ? "Marker som ikke signert" : "Marker som signert"}
                    >
                      {item.is_signed ? "✗" : "✓"}
                    </Button>
                  )}
                </>
              )}
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
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium text-foreground truncate">{item.original_filename}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(item.size_bytes ?? 0)}</p>
              {!isPrivat && (
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                    {item.folder_path || "Ustrukturert"}
                  </span>
                  {item.file_type === "document" && item.folder_path?.startsWith("Kontrakter/") && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                        item.is_signed ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {item.is_signed ? "Signert" : "Ikke signert"}
                    </span>
                  )}
                </div>
              )}
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
      <Tabs value={activeRoom} onValueChange={(v) => setActiveRoom(v as "privat" | "festival")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <TabsList>
            <TabsTrigger value="festival" className="flex items-center gap-1.5">
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
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Søk etter filer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <TabsContent value="festival" className="mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Folder tree (desktop) */}
            <div className="hidden md:block w-56 shrink-0 border border-border rounded-lg p-3 bg-card/40 self-start">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-[0.15em]">Mapper</p>
              <button
                className={`w-full text-left text-xs px-2 py-1.5 rounded ${selectedFolder === ALL_FOLDERS ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
                onClick={() => setSelectedFolder(ALL_FOLDERS)}
              >
                Alle filer
              </button>
              <button
                className={`w-full text-left text-xs px-2 py-1.5 rounded ${selectedFolder === UNSTRUCTURED_FOLDER ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
                onClick={() => setSelectedFolder(UNSTRUCTURED_FOLDER)}
              >
                Ustrukturert
              </button>
              <div className="mt-2 space-y-1">
                {FESTIVAL_FOLDERS.map((node) => (
                  <div key={node.value}>
                    <button
                      className={`w-full text-left text-xs px-2 py-1.5 rounded font-semibold ${selectedFolder === node.value ? "bg-accent/10 text-accent" : "text-foreground"}`}
                      onClick={() => setSelectedFolder(node.value)}
                    >
                      {node.label}
                    </button>
                    {node.children && (
                      <div className="mt-0.5 ml-3 space-y-0.5">
                        {node.children.map((child) => (
                          <button
                            key={child.value}
                            className={`w-full text-left text-[11px] px-2 py-1 rounded ${selectedFolder === child.value ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
                            onClick={() => setSelectedFolder(child.value)}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: dropdown + grid */}
            <div className="flex-1 min-w-0">
              <div className="md:hidden mb-3">
                <Select value={selectedFolder} onValueChange={(v) => setSelectedFolder(v as FolderSelection)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Velg mappe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FOLDERS}>Alle filer</SelectItem>
                    <SelectItem value={UNSTRUCTURED_FOLDER}>Ustrukturert</SelectItem>
                    {LEAF_FOLDERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {renderGrid(filteredFestivalMedia, festivalLoading, false)}
            </div>
          </div>
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
              initialFolderPath={
                selectedFolder === ALL_FOLDERS || selectedFolder === UNSTRUCTURED_FOLDER ? null : selectedFolder
              }
              onUploadComplete={() => {
                setShowUploadFestival(false);
                queryClient.invalidateQueries({ queryKey: ["festival-media"] });
                toast({ title: "Fil lastet opp" });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Move dialog */}
      <Dialog open={!!moveItem} onOpenChange={(open) => !open && setMoveItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Flytt til mappe</DialogTitle>
          </DialogHeader>
          {moveItem && (
            <div className="space-y-4">
              <Select
                value={moveItem.folder_path ?? ""}
                onValueChange={(v) => setMoveItem((prev) => (prev ? { ...prev, folder_path: v || null } : prev))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg mappe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ustrukturert</SelectItem>
                  {LEAF_FOLDERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={moveMutation.isPending}
                onClick={() => {
                  if (!moveItem) return;
                  moveMutation.mutate({ id: moveItem.id, newFolder: moveItem.folder_path, fileType: moveItem.file_type });
                }}
              >
                Flytt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteSource("media"); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett fil?</AlertDialogTitle>
            <AlertDialogDescription>Handlingen kan ikke angres.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                if (deleteSource === "festival_media") deleteFestivalMutation.mutate(deleteId);
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
