/**
 * InlineMediaPickerWithCrop
 * 
 * Enhanced version of InlineMediaPicker that opens a crop dialog after
 * image selection. Supports avatar (1:1) and hero (16:9) crop modes.
 * 
 * USAGE:
 * <InlineMediaPickerWithCrop
 *   value={avatarUrl}
 *   imageSettings={avatarImageSettings}
 *   onChange={setAvatarUrl}
 *   onSettingsChange={setAvatarImageSettings}
 *   cropMode="avatar"
 *   placeholder="Velg profilbilde"
 * />
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "./MediaPicker";
import { ImageCropDialog, type CropSettings } from "./ImageCropDialog";
import { Image, X, Crop } from "lucide-react";
import { CroppedImage } from "@/components/ui/CroppedImage";
import type { CropMode } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

interface InlineMediaPickerWithCropProps {
  value?: string;
  imageSettings?: ImageSettings | unknown | null;
  onChange: (url: string) => void;
  onSettingsChange?: (settings: ImageSettings | null) => void;
  cropMode: CropMode;
  accept?: string;
  placeholder?: string;
  showAllForAdmin?: boolean;
}

export function InlineMediaPickerWithCrop({
  value,
  imageSettings,
  onChange,
  onSettingsChange,
  cropMode,
  accept,
  placeholder = "Velg bilde",
  showAllForAdmin = false,
}: InlineMediaPickerWithCropProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  // Parse existing settings for initial crop values
  const parsedSettings = parseImageSettings(imageSettings);

  const handleMediaSelect = useCallback((_mediaId: string, publicUrl: string) => {
    // Store the selected URL and open crop dialog
    setPendingImageUrl(publicUrl);
    setMediaPickerOpen(false);
    setCropDialogOpen(true);
  }, []);

  const handleCropSave = useCallback((crop: CropSettings) => {
    if (pendingImageUrl) {
      // New image was selected - save both URL and settings
      onChange(pendingImageUrl);
      onSettingsChange?.({
        focal_x: crop.focalX,
        focal_y: crop.focalY,
        zoom: crop.zoom,
      });
      setPendingImageUrl(null);
    } else if (value) {
      // Re-cropping existing image - only update settings
      onSettingsChange?.({
        focal_x: crop.focalX,
        focal_y: crop.focalY,
        zoom: crop.zoom,
      });
    }
  }, [pendingImageUrl, value, onChange, onSettingsChange]);

  const handleCropCancel = useCallback(() => {
    setPendingImageUrl(null);
  }, []);

  const handleClear = useCallback(() => {
    onChange("");
    onSettingsChange?.(null);
  }, [onChange, onSettingsChange]);

  const handleOpenCropExisting = useCallback(() => {
    if (value) {
      setPendingImageUrl(null); // Indicate we're editing existing
      setCropDialogOpen(true);
    }
  }, [value]);

  // Determine file type from accept
  const getFileType = (): "image" | "video" | "audio" | "document" | undefined => {
    if (!accept) return "image"; // Default to image for crop mode
    if (accept.includes("image")) return "image";
    if (accept.includes("video")) return "video";
    if (accept.includes("audio")) return "audio";
    return undefined;
  };

  const aspectClass = cropMode === "avatar" ? "aspect-square" : "aspect-video";
  const previewHeight = cropMode === "avatar" ? "h-24 w-24" : "h-24 w-full";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMediaPickerOpen(true)}
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          {value ? "Bytt bilde" : placeholder}
        </Button>
        {value && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenCropExisting}
              title="Juster fokuspunkt"
            >
              <Crop className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {value && (
        <div className={`relative rounded-md overflow-hidden border border-border ${previewHeight}`}>
          <CroppedImage
            src={value}
            alt="Selected media"
            imageSettings={imageSettings}
            aspect={cropMode}
            className="w-full h-full"
          />
        </div>
      )}

      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={handleMediaSelect}
        fileType={getFileType()}
        userOnly={true}
        showAllForAdmin={showAllForAdmin}
      />

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={pendingImageUrl || value || ""}
        mode={cropMode}
        initialCrop={
          parsedSettings
            ? {
                focalX: parsedSettings.focal_x,
                focalY: parsedSettings.focal_y,
                zoom: parsedSettings.zoom,
              }
            : undefined
        }
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />
    </div>
  );
}
