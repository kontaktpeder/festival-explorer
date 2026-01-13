import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DesignTheme } from "@/types/design";

interface ThemeControlsProps {
  theme: DesignTheme;
  onChange: (theme: DesignTheme) => void;
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
];

export function ThemeControls({ theme, onChange }: ThemeControlsProps) {
  const updateTheme = (updates: Partial<DesignTheme>) => {
    onChange({ ...theme, ...updates });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Tema</h3>

      {/* Primary Color */}
      <div className="space-y-2">
        <Label htmlFor="primaryColor">Primærfarge</Label>
        <div className="flex gap-2">
          <Input
            id="primaryColor"
            type="color"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
            className="w-12 h-10 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
            placeholder="#FF6B35"
            className="flex-1"
          />
        </div>
      </div>

      {/* Secondary Color */}
      <div className="space-y-2">
        <Label htmlFor="secondaryColor">Sekundærfarge (valgfritt)</Label>
        <div className="flex gap-2">
          <Input
            id="secondaryColor"
            type="color"
            value={theme.secondaryColor || "#ffffff"}
            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
            className="w-12 h-10 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={theme.secondaryColor || ""}
            onChange={(e) =>
              updateTheme({ secondaryColor: e.target.value || undefined })
            }
            placeholder="#FFFFFF"
            className="flex-1"
          />
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label htmlFor="fontFamily">Skrifttype</Label>
        <Select
          value={theme.fontFamily}
          onValueChange={(value) => updateTheme({ fontFamily: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Velg skrifttype" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem
                key={font.value}
                value={font.value}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Base Font Size */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Basis skriftstørrelse</Label>
          <span className="text-sm text-muted-foreground">{theme.fontSize}px</span>
        </div>
        <Slider
          value={[theme.fontSize]}
          onValueChange={([value]) => updateTheme({ fontSize: value })}
          min={12}
          max={72}
          step={1}
        />
      </div>
    </div>
  );
}
