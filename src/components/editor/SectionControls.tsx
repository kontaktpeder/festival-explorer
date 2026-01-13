import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InlineMediaPicker } from "@/components/admin/InlineMediaPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Trash2,
  Type,
  Image,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import type { Section, TextSectionContent, ImageSectionContent } from "@/types/design";

interface SectionControlsProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  themeColor: string;
}

export function SectionControls({
  sections,
  onChange,
  themeColor,
}: SectionControlsProps) {
  const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTextSection = () => {
    const newSection: Section = {
      id: generateId(),
      type: "text",
      position: { x: 50, y: 50, alignment: "center" },
      content: { text: "Ny tekst" } as TextSectionContent,
      color: themeColor,
      zIndex: sections.length + 1,
      visible: true,
    };
    onChange([...sections, newSection]);
  };

  const addImageSection = () => {
    const newSection: Section = {
      id: generateId(),
      type: "image",
      position: { x: 50, y: 50, width: 30, alignment: "center" },
      content: { imageUrl: "", alt: "" } as ImageSectionContent,
      zIndex: sections.length + 1,
      visible: true,
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    onChange(
      sections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const updateSectionContent = (
    id: string,
    contentUpdates: Partial<TextSectionContent> | Partial<ImageSectionContent>
  ) => {
    onChange(
      sections.map((s) =>
        s.id === id
          ? { ...s, content: { ...s.content, ...contentUpdates } }
          : s
      )
    );
  };

  const updateSectionPosition = (
    id: string,
    positionUpdates: Partial<Section["position"]>
  ) => {
    onChange(
      sections.map((s) =>
        s.id === id
          ? { ...s, position: { ...s.position, ...positionUpdates } }
          : s
      )
    );
  };

  const deleteSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const toggleVisibility = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      updateSection(id, { visible: !section.visible });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Seksjoner</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addTextSection}>
            <Type className="h-4 w-4 mr-1" />
            Tekst
          </Button>
          <Button size="sm" variant="outline" onClick={addImageSection}>
            <Image className="h-4 w-4 mr-1" />
            Bilde
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen seksjoner ennå. Legg til tekst eller bilde for å starte.
        </p>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {sections.map((section, index) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {section.type === "text" ? (
                    <Type className="h-4 w-4" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {section.type === "text" && "text" in section.content
                      ? (section.content as TextSectionContent).text.substring(0, 20) || "Tekst"
                      : `Bilde ${index + 1}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(section.id);
                    }}
                    className="ml-auto p-1 hover:bg-muted rounded"
                  >
                    {section.visible !== false ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* Text Content */}
                {section.type === "text" && "text" in section.content && (
                  <div className="space-y-2">
                    <Label>Tekst</Label>
                    <Textarea
                      value={(section.content as TextSectionContent).text}
                      onChange={(e) =>
                        updateSectionContent(section.id, { text: e.target.value })
                      }
                      placeholder="Skriv tekst..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Image Content */}
                {section.type === "image" && "imageUrl" in section.content && (
                  <div className="space-y-2">
                    <Label>Bilde</Label>
                    <InlineMediaPicker
                      value={(section.content as ImageSectionContent).imageUrl}
                      onChange={(url) =>
                        updateSectionContent(section.id, { imageUrl: url })
                      }
                      accept="image/*"
                    />
                  </div>
                )}

                {/* Position X */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Horisontal posisjon (X)</Label>
                    <span className="text-sm text-muted-foreground">
                      {section.position.x}%
                    </span>
                  </div>
                  <Slider
                    value={[section.position.x]}
                    onValueChange={([value]) =>
                      updateSectionPosition(section.id, { x: value })
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Position Y */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Vertikal posisjon (Y)</Label>
                    <span className="text-sm text-muted-foreground">
                      {section.position.y}%
                    </span>
                  </div>
                  <Slider
                    value={[section.position.y]}
                    onValueChange={([value]) =>
                      updateSectionPosition(section.id, { y: value })
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Width (optional) */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Bredde</Label>
                    <span className="text-sm text-muted-foreground">
                      {section.position.width || "Auto"}%
                    </span>
                  </div>
                  <Slider
                    value={[section.position.width || 50]}
                    onValueChange={([value]) =>
                      updateSectionPosition(section.id, { width: value })
                    }
                    min={10}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Alignment */}
                <div className="space-y-2">
                  <Label>Justering</Label>
                  <Select
                    value={section.position.alignment || "center"}
                    onValueChange={(value: "left" | "center" | "right") =>
                      updateSectionPosition(section.id, { alignment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Venstre</SelectItem>
                      <SelectItem value="center">Sentrert</SelectItem>
                      <SelectItem value="right">Høyre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Color Override (text only) */}
                {section.type === "text" && (
                  <div className="space-y-2">
                    <Label>Farge</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={section.color || themeColor}
                        onChange={(e) =>
                          updateSection(section.id, { color: e.target.value })
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={section.color || themeColor}
                        onChange={(e) =>
                          updateSection(section.id, { color: e.target.value })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {/* Text-specific controls */}
                {section.type === "text" && "text" in section.content && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Skriftstørrelse</Label>
                        <span className="text-sm text-muted-foreground">
                          {(section.content as TextSectionContent).fontSize || 24}px
                        </span>
                      </div>
                      <Slider
                        value={[(section.content as TextSectionContent).fontSize || 24]}
                        onValueChange={([value]) =>
                          updateSectionContent(section.id, { fontSize: value })
                        }
                        min={12}
                        max={120}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Skriftvekt</Label>
                      <Select
                        value={(section.content as TextSectionContent).fontWeight || "normal"}
                        onValueChange={(value: "normal" | "bold" | "semibold") =>
                          updateSectionContent(section.id, { fontWeight: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="semibold">Halvfet</SelectItem>
                          <SelectItem value="bold">Fet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Z-Index */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Lag (z-index)</Label>
                    <span className="text-sm text-muted-foreground">
                      {section.zIndex || 1}
                    </span>
                  </div>
                  <Slider
                    value={[section.zIndex || 1]}
                    onValueChange={([value]) =>
                      updateSection(section.id, { zIndex: value })
                    }
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSection(section.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett seksjon
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
