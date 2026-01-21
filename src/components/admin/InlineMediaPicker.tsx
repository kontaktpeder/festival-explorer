import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "./MediaPicker";
import { Image, X } from "lucide-react";

interface InlineMediaPickerProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
  showAllForAdmin?: boolean; // Tillat admin å se alle filer
}

export function InlineMediaPicker({
  value,
  onChange,
  accept,
  placeholder = "Velg bilde",
  showAllForAdmin = false,
}: InlineMediaPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (_mediaId: string, publicUrl: string) => {
    onChange(publicUrl);
  };

  const handleClear = () => {
    onChange("");
  };

  // Determine file type from accept
  const getFileType = (): "image" | "video" | "audio" | "document" | undefined => {
    if (!accept) return undefined;
    if (accept.includes("image")) return "image";
    if (accept.includes("video")) return "video";
    if (accept.includes("audio")) return "audio";
    return undefined;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          {value ? "Bytt bilde" : placeholder}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {value && (
        <div className="relative w-full h-24 rounded-md overflow-hidden border border-border">
          <img
            src={value}
            alt="Selected media"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        fileType={getFileType()}
        userOnly={true}
        showAllForAdmin={showAllForAdmin}
      />
    </div>
  );
}
