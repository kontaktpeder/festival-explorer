import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import {
  LEAF_FOLDERS,
  ALL_FOLDERS,
  UNSTRUCTURED_FOLDER,
  deriveIsSigned,
  getDefaultFolderForFileType,
} from "@/lib/festival-folders";

type FileType = "image" | "video" | "audio" | "document";

function detectFileType(file: File): FileType {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (t.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((e) => n.endsWith(e))) return "image";
  if (t.startsWith("video/") || [".mp4", ".webm", ".mov"].some((e) => n.endsWith(e))) return "video";
  if (t.startsWith("audio/") || [".mp3", ".wav", ".ogg", ".m4a"].some((e) => n.endsWith(e))) return "audio";
  return "document";
}

interface FestivalMediaUploadProps {
  festivalId: string;
  onUploadComplete?: (mediaId: string, publicUrl: string) => void;
  initialFolderPath?: string | null;
}

export function FestivalMediaUpload({ festivalId, onUploadComplete, initialFolderPath }: FestivalMediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [folderPath, setFolderPath] = useState<string>(
    initialFolderPath && initialFolderPath !== ALL_FOLDERS && initialFolderPath !== UNSTRUCTURED_FOLDER
      ? initialFolderPath
      : UNSTRUCTURED_FOLDER
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");
      if (files.length === 0) throw new Error("Velg minst én fil");

      const results: { id: string; public_url: string }[] = [];

      for (const file of files) {
        const ft = detectFileType(file);
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `festival/${festivalId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(storagePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(storagePath);

        const chosenFolder = folderPath === UNSTRUCTURED_FOLDER ? null : folderPath;
        const isSigned = deriveIsSigned(chosenFolder, ft);

        const { data: row, error: insertError } = await supabase
          .from("festival_media")
          .insert({
            festival_id: festivalId,
            file_type: ft,
            original_filename: file.name,
            storage_path: storagePath,
            public_url: publicUrl,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            created_by: user.id,
            folder_path: chosenFolder,
            is_signed: isSigned,
          } as any)
          .select("id, public_url")
          .single();
        if (insertError) throw insertError;
        results.push(row);
      }
      return results;
    },
    onSuccess: (rows) => {
      toast({ title: `${rows.length} fil${rows.length > 1 ? "er" : ""} lastet opp` });
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      if (rows[0]) onUploadComplete?.(rows[0].id, rows[0].public_url);
    },
    onError: (e: Error) => {
      toast({ title: "Feil ved opplasting", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="festival-file">Fil(er)</Label>
        <Input
          id="festival-file"
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            setFiles(selected);
            if (selected[0] && folderPath === UNSTRUCTURED_FOLDER) {
              const ft = detectFileType(selected[0]);
              setFolderPath(getDefaultFolderForFileType(ft));
            }
          }}
        />
        {files.length > 1 && (
          <p className="text-xs text-muted-foreground">{files.length} filer valgt</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="festival-folder">Mappe</Label>
        <Select value={folderPath} onValueChange={setFolderPath}>
          <SelectTrigger id="festival-folder">
            <SelectValue placeholder="Velg mappe (valgfritt)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSTRUCTURED_FOLDER}>Ustrukturert</SelectItem>
            {LEAF_FOLDERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => uploadMutation.mutate()}
        disabled={files.length === 0 || uploadMutation.isPending}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploadMutation.isPending
          ? "Laster opp..."
          : files.length > 1
          ? `Last opp ${files.length} filer`
          : "Last opp"}
      </Button>
    </div>
  );
}
