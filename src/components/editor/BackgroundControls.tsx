import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { InlineMediaPicker } from "@/components/admin/InlineMediaPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BackgroundConfig } from "@/types/design";

interface BackgroundControlsProps {
  background: BackgroundConfig;
  onChange: (background: BackgroundConfig) => void;
}

export function BackgroundControls({
  background,
  onChange,
}: BackgroundControlsProps) {
  const updateBackground = (updates: Partial<BackgroundConfig>) => {
    onChange({ ...background, ...updates });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Bakgrunn</h3>

      {/* Background Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={background.type}
          onValueChange={(value: "image" | "color" | "gradient") =>
            updateBackground({ type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Bilde</SelectItem>
            <SelectItem value="color">Farge</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Image Picker */}
      {background.type === "image" && (
        <div className="space-y-2">
          <Label>Bakgrunnsbilde</Label>
          <InlineMediaPicker
            value={background.value}
            onChange={(url) => updateBackground({ value: url })}
            accept="image/*"
          />
        </div>
      )}

      {/* Color Picker */}
      {background.type === "color" && (
        <div className="space-y-2">
          <Label>Bakgrunnsfarge</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={background.value || "#1a1a2e"}
              onChange={(e) => updateBackground({ value: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={background.value}
              onChange={(e) => updateBackground({ value: e.target.value })}
              placeholder="#1a1a2e"
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Gradient Input */}
      {background.type === "gradient" && (
        <div className="space-y-2">
          <Label>Gradient CSS</Label>
          <Input
            type="text"
            value={background.value}
            onChange={(e) => updateBackground({ value: e.target.value })}
            placeholder="linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)"
          />
          <div
            className="w-full h-12 rounded-md border border-border"
            style={{ background: background.value }}
          />
        </div>
      )}

      {/* Overlay Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="overlay">Overlay</Label>
        <Switch
          id="overlay"
          checked={background.overlay || false}
          onCheckedChange={(checked) => updateBackground({ overlay: checked })}
        />
      </div>

      {/* Overlay Settings */}
      {background.overlay && (
        <>
          <div className="space-y-2">
            <Label>Overlay farge</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={background.overlayColor || "#000000"}
                onChange={(e) =>
                  updateBackground({ overlayColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={background.overlayColor || "#000000"}
                onChange={(e) =>
                  updateBackground({ overlayColor: e.target.value })
                }
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Overlay gjennomsiktighet</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round((background.overlayOpacity || 0.3) * 100)}%
              </span>
            </div>
            <Slider
              value={[(background.overlayOpacity || 0.3) * 100]}
              onValueChange={([value]) =>
                updateBackground({ overlayOpacity: value / 100 })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
        </>
      )}
    </div>
  );
}
