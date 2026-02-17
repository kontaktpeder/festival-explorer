/**
 * ImageCropDialog Component
 *
 * Modern focal-point picker for avatar (1:1) and hero (1500×600) images.
 * Dark, minimal UI with smooth interactions.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Crosshair, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  imageAspectRatio?: number;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  mode,
  initialCrop,
  onSave,
  onCancel,
  imageAspectRatio,
}: ImageCropDialogProps) {
  const [focalX, setFocalX] = useState(initialCrop?.focalX ?? 0.5);
  const [focalY, setFocalY] = useState(initialCrop?.focalY ?? 0.5);
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setFocalX(initialCrop?.focalX ?? 0.5);
      setFocalY(initialCrop?.focalY ?? 0.5);
      setZoom(initialCrop?.zoom ?? 1);
    }
  }, [open, initialCrop, imageUrl]);

  const aspectRatio = imageAspectRatio ?? ASPECT_RATIOS[mode];

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

  const handleReset = () => {
    setFocalX(0.5);
    setFocalY(0.5);
    setZoom(1);
  };

  const modeLabel = mode === "avatar" ? "1:1" : "1500×600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] p-0 gap-0 border-border/60 bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/10">
              <Crosshair className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground leading-none">
                Fokuspunkt
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{modeLabel}</p>
            </div>
          </div>

          {/* Coordinates */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-muted-foreground tabular-nums">
            <span>X {Math.round(focalX * 100)}</span>
            <span>Y {Math.round(focalY * 100)}</span>
          </div>
        </div>

        {/* Canvas area */}
        <div className="relative bg-black/60">
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden cursor-crosshair touch-none select-none"
            style={{
              aspectRatio: aspectRatio,
              maxHeight: "min(55vh, 440px)",
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
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{
                objectFit: "cover",
                objectPosition: `${focalX * 100}% ${focalY * 100}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${focalX * 100}% ${focalY * 100}%`,
              }}
              draggable={false}
            />

            {/* Subtle grid – rule of thirds */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            </svg>

            {/* Focal point indicator */}
            <div
              className="absolute pointer-events-none transition-[left,top] duration-75 ease-out"
              style={{
                left: `${focalX * 100}%`,
                top: `${focalY * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Outer ring */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/40 flex items-center justify-center">
                {/* Inner dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              </div>
              {/* Crosshair lines */}
              <div className="absolute left-1/2 top-0 -translate-x-px w-px h-full bg-white/30" />
              <div className="absolute top-1/2 left-0 -translate-y-px w-full h-px bg-white/30" />
            </div>

            {/* Edge vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]" />
          </div>
        </div>

        {/* Controls bar */}
        <div className="px-4 py-3 border-t border-border/40 space-y-3">
          {/* Zoom row */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={2}
              step={0.05}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1 touch-pan-x"
            />
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-mono text-muted-foreground w-10 text-right tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 py-3 border-t border-border/40 flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nullstill
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Avbryt
            </Button>
            <Button size="sm" onClick={handleSave}>
              Lagre
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
