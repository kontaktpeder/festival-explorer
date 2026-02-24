import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

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
}

export function FestivalMediaUpload({ festivalId, onUploadComplete }: FestivalMediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");
      if (!file) throw new Error("Velg en fil");

      const ft = detectFileType(file);
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `festival/${festivalId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(storagePath);

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
        })
        .select("id, public_url")
        .single();
      if (insertError) throw insertError;
      return row;
    },
    onSuccess: (data) => {
      toast({ title: "Fil lastet opp" });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploadComplete?.(data.id, data.public_url);
    },
    onError: (e: Error) => {
      toast({ title: "Feil ved opplasting", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="festival-file">Fil</Label>
        <Input
          id="festival-file"
          ref={inputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button
        onClick={() => uploadMutation.mutate()}
        disabled={!file || uploadMutation.isPending}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploadMutation.isPending ? "Laster opp..." : "Last opp"}
      </Button>
    </div>
  );
}
