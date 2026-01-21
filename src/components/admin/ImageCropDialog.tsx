/**
 * ImageCropDialog Component
 * 
 * A modal dialog for selecting focal point/crop area on images.
 * Supports avatar (1:1) and hero (16:9) modes.
 * 
 * USAGE:
 * <ImageCropDialog
 *   open={cropOpen}
 *   onOpenChange={setCropOpen}
 *   imageUrl={selectedImageUrl}
 *   mode="hero"
 *   initialCrop={{ focalX: 0.5, focalY: 0.3, zoom: 1 }}
 *   onSave={(crop) => saveCropSettings(crop)}
 * />
 * 
 * FUTURE EXTENSIONS:
 * - Add mode="gallery" for gallery images with different aspect ratio
 * - Add mode="custom" with customAspect prop
 * - Consider using react-easy-crop for more advanced cropping if needed
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Move, ZoomIn } from "lucide-react";
import { ASPECT_RATIOS, type CropMode } from "@/lib/image-crop-helpers";

export interface CropSettings {
  focalX: number; // 0-1
  focalY: number; // 0-1
  zoom?: number;  // 1+
}

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  mode: CropMode;
  initialCrop?: CropSettings;
  onSave: (crop: CropSettings) => void;
  onCancel?: () => void;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  mode,
  initialCrop,
  onSave,
  onCancel,
}: ImageCropDialogProps) {
  const [focalX, setFocalX] = useState(initialCrop?.focalX ?? 0.5);
  const [focalY, setFocalY] = useState(initialCrop?.focalY ?? 0.5);
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when dialog opens with new image
  useEffect(() => {
    if (open) {
      setFocalX(initialCrop?.focalX ?? 0.5);
      setFocalY(initialCrop?.focalY ?? 0.5);
      setZoom(initialCrop?.zoom ?? 1);
    }
  }, [open, initialCrop, imageUrl]);

  const aspectRatio = ASPECT_RATIOS[mode];

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFocalPoint(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFocalPoint(e);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const updateFocalPoint = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setFocalX(x);
    setFocalY(y);
  }, []);

  const handleSave = () => {
    onSave({
      focalX: Math.round(focalX * 1000) / 1000,
      focalY: Math.round(focalY * 1000) / 1000,
      zoom: Math.round(zoom * 100) / 100,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const modeLabel = mode === "avatar" ? "Profilbilde (1:1)" : "Hero-bilde (16:9)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Velg fokuspunkt</DialogTitle>
          <DialogDescription>
            Klikk eller dra for å velge hvor bildet skal fokuseres. {modeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview with focal point marker */}
          <div className="relative">
            {/* Aspect ratio container */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-lg border-2 border-border cursor-crosshair touch-none"
              style={{
                aspectRatio: aspectRatio,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Image */}
              <img
                src={imageUrl}
                alt="Crop preview"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: "cover",
                  objectPosition: `${focalX * 100}% ${focalY * 100}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${focalX * 100}% ${focalY * 100}%`,
                }}
                draggable={false}
              />

              {/* Rule of thirds grid */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical lines */}
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                {/* Horizontal lines */}
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              </div>

              {/* Focal point marker */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${focalX * 100}%`,
                  top: `${focalY * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center bg-black/30">
                  <Move className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Vignette overlay for visibility */}
              <div className="absolute inset-0 pointer-events-none bg-black/10" />
            </div>
          </div>

          {/* Zoom slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom
              </Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={2}
              step={0.05}
              onValueChange={([val]) => setZoom(val)}
            />
          </div>

          {/* Position info */}
          <div className="text-xs text-muted-foreground flex gap-4">
            <span>X: {Math.round(focalX * 100)}%</span>
            <span>Y: {Math.round(focalY * 100)}%</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Avbryt
          </Button>
          <Button onClick={handleSave}>
            Lagre fokuspunkt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
