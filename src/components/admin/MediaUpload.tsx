import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Video, Music, FileText, ExternalLink } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/admin-helpers";

interface MediaUploadProps {
  onUploadComplete?: (mediaId: string, publicUrl: string) => void;
  fileType?: "image" | "video" | "audio" | "document";
  accept?: string;
  maxSizeMB?: number;
}

type FileType = "image" | "video" | "audio" | "document";

export function MediaUpload({ 
  onUploadComplete, 
  fileType,
  accept,
  maxSizeMB = 10
}: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [detectedFileType, setDetectedFileType] = useState<FileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      // If external link (large videos)
      if (externalUrl && detectedFileType === "video") {
        const provider = detectVideoProvider(externalUrl);
        if (!provider) {
          throw new Error("Ugyldig video-URL. Støtter YouTube og Vimeo.");
        }

        const { data: mediaData, error } = await supabase
          .from("media")
          .insert({
            filename: "external-video",
            original_filename: externalUrl,
            mime_type: "video/external",
            file_type: "video",
            size_bytes: 0,
            storage_path: `external/${crypto.randomUUID()}`,
            public_url: externalUrl,
            external_url: externalUrl,
            external_provider: provider,
            alt_text: altText || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return mediaData;
      }

      // Direct file upload
      if (!file) throw new Error("Ingen fil valgt");

      // Check size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        throw new Error(`Filen er for stor (${fileSizeMB.toFixed(1)}MB). Maks ${maxSizeMB}MB.`);
      }

      const ft = detectedFileType || fileType || detectFileType(file);
      if (!ft) throw new Error("Ustøttet filtype");

      let processedFile: File = file;
      let dimensions: { width?: number; height?: number } = {};

      // Compress images
      if (ft === "image") {
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
        processedFile = compressed.file;
        dimensions = { width: compressed.width, height: compressed.height };
      }

      // Upload to storage
      const fileExt = processedFile.name.split(".").pop() || "bin";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${user.id}/${ft}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, processedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(storagePath);

      // Get video dimensions if needed
      if (ft === "video" && !dimensions.width) {
        dimensions = await getVideoDimensions(processedFile);
      }

      // Save to database
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .insert({
          filename: fileName,
          original_filename: file.name,
          mime_type: processedFile.type,
          file_type: ft,
          size_bytes: processedFile.size,
          original_size_bytes: file.size,
          storage_path: storagePath,
          public_url: publicUrl,
          alt_text: altText || null,
          width: dimensions.width || null,
          height: dimensions.height || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      return mediaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      const reduction = data.original_size_bytes 
        ? ` (${((1 - data.size_bytes / data.original_size_bytes) * 100).toFixed(0)}% mindre)`
        : "";
      toast({ 
        title: "Fil lastet opp", 
        description: `${data.original_filename}${reduction}` 
      });
      if (onUploadComplete) {
        onUploadComplete(data.id, data.public_url);
      }
      // Reset
      setFile(null);
      setPreview(null);
      setAltText("");
      setExternalUrl("");
      setDetectedFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error: Error) => {
      toast({ 
        title: "Feil ved opplasting", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ft = detectFileType(selectedFile);
    setDetectedFileType(ft);
    setFile(selectedFile);

    // Preview for images
    if (ft === "image") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setExternalUrl("");
    setDetectedFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const detectedType = detectedFileType || fileType;
  const acceptTypes = accept || getAcceptForFileType(fileType);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Last opp fil</Label>
        
        {/* For video: Offer external link */}
        {(!fileType || fileType === "video") && (
          <div className="space-y-2 p-3 border border-dashed border-border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Store videoer? Bruk YouTube/Vimeo
            </p>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (externalUrl) {
                    setDetectedFileType("video");
                    uploadMutation.mutate();
                  }
                }}
                disabled={!externalUrl || uploadMutation.isPending}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Bruk lenke
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Videoer over {maxSizeMB}MB bør lastes opp til YouTube/Vimeo for bedre streaming.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileSelect}
            className="flex-1"
          />
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetForm}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {file && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {getIconForType(detectedType)}
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
            {detectedType === "image" && " - Vil bli komprimert automatisk"}
          </p>
        )}
      </div>

      {preview && (
        <div className="space-y-2">
          <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-border">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <Input
            placeholder="Alt-tekst (beskrivelse av bildet)"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </div>
      )}

      {(file || (externalUrl && detectedFileType === "video")) && (
        <Button
          type="button"
          onClick={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploadMutation.isPending ? "Laster opp..." : "Last opp fil"}
        </Button>
      )}
    </div>
  );
}

// Helper: Get icon for file type
function getIconForType(type: FileType | null) {
  switch (type) {
    case "image": return <ImageIcon className="w-4 h-4" />;
    case "video": return <Video className="w-4 h-4" />;
    case "audio": return <Music className="w-4 h-4" />;
    case "document": return <FileText className="w-4 h-4" />;
    default: return null;
  }
}

// Helper: Detect file type
function detectFileType(file: File): FileType | null {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.includes("pdf") || type.includes("document")) return "document";
  return null;
}

// Helper: Accept attribute for file input
function getAcceptForFileType(fileType?: string): string {
  switch (fileType) {
    case "image": return "image/*";
    case "video": return "video/*";
    case "audio": return "audio/*";
    case "document": return ".pdf,.doc,.docx";
    default: return "*/*";
  }
}

// Helper: Detect video provider
function detectVideoProvider(url: string): "youtube" | "vimeo" | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return null;
}

// Helper: Compress image
interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

async function compressImage(
  file: File,
  options: CompressOptions
): Promise<{ file: File; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if necessary
      if (width > options.maxWidth || height > options.maxHeight) {
        const ratio = Math.min(
          options.maxWidth / width,
          options.maxHeight / height
        );
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Kunne ikke lage canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Kunne ikke komprimere bilde"));
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve({
            file: compressedFile,
            width: Math.round(width),
            height: Math.round(height),
          });
        },
        "image/jpeg",
        options.quality
      );
    };
    img.onerror = () => reject(new Error("Kunne ikke laste bilde"));
    img.src = URL.createObjectURL(file);
  });
}

// Helper: Get video dimensions
function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = URL.createObjectURL(file);
  });
}
