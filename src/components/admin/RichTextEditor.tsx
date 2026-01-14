import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Bold, Italic, AlignLeft, AlignCenter, AlignJustify, List, Palette, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COLOR_OPTIONS = [
  { name: "Standard", value: "#ffffff" },
  { name: "Accent", value: "#f59e0b" },
  { name: "Rød", value: "#ef4444" },
  { name: "Grønn", value: "#22c55e" },
  { name: "Blå", value: "#3b82f6" },
  { name: "Gul", value: "#eab308" },
  { name: "Lilla", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
];

const FONT_OPTIONS = [
  { name: "Standard", value: "" },
  // Sans-serif
  { name: "Space Grotesk", value: "Space Grotesk", group: "Sans-serif" },
  { name: "Inter Tight", value: "Inter Tight", group: "Sans-serif" },
  { name: "Archivo", value: "Archivo", group: "Sans-serif" },
  { name: "IBM Plex Sans", value: "IBM Plex Sans", group: "Sans-serif" },
  { name: "Work Sans", value: "Work Sans", group: "Sans-serif" },
  { name: "DM Sans", value: "DM Sans", group: "Sans-serif" },
  // Serif
  { name: "Fraunces", value: "Fraunces", group: "Serif" },
  { name: "DM Serif Display", value: "DM Serif Display", group: "Serif" },
  { name: "Playfair Display", value: "Playfair Display", group: "Serif" },
  { name: "Source Serif 4", value: "Source Serif 4", group: "Serif" },
  { name: "Crimson Pro", value: "Crimson Pro", group: "Serif" },
  { name: "Libre Baskerville", value: "Libre Baskerville", group: "Serif" },
  // Mono
  { name: "IBM Plex Mono", value: "IBM Plex Mono", group: "Mono" },
  { name: "JetBrains Mono", value: "JetBrains Mono", group: "Mono" },
  { name: "Space Mono", value: "Space Mono", group: "Mono" },
];

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  function RichTextEditor({
    value,
    onChange,
    placeholder = "Skriv tekst her...",
    className,
  }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const isInitializedRef = useRef(false);
    const lastValueRef = useRef(value);

    // Only set innerHTML on initial mount or when value changes externally
    useEffect(() => {
      if (editorRef.current) {
        // Only update if not focused and value changed externally
        if (!isFocused && value !== lastValueRef.current) {
          editorRef.current.innerHTML = value || "";
          lastValueRef.current = value;
        } else if (!isInitializedRef.current) {
          editorRef.current.innerHTML = value || "";
          isInitializedRef.current = true;
          lastValueRef.current = value;
        }
      }
    }, [value, isFocused]);

    const execCommand = useCallback((command: string, commandValue?: string) => {
      // Ensure focus is on editor before executing command
      editorRef.current?.focus();
      document.execCommand(command, false, commandValue);
      if (editorRef.current) {
        const newValue = editorRef.current.innerHTML;
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }, [onChange]);

    const applyColor = useCallback((color: string) => {
      execCommand("foreColor", color);
      setColorPickerOpen(false);
    }, [execCommand]);

    const applyFont = useCallback((fontName: string) => {
      if (fontName) {
        execCommand("fontName", fontName);
      }
    }, [execCommand]);

    const handleInput = useCallback(() => {
      if (editorRef.current) {
        const newValue = editorRef.current.innerHTML;
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }, [onChange]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      if (editorRef.current) {
        const newValue = editorRef.current.innerHTML;
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }, [onChange]);

  return (
    <div className={cn("border border-border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("bold")}
          title="Fet"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("italic")}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("justifyLeft")}
          title="Venstrejuster"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("justifyCenter")}
          title="Sentrer"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("justifyFull")}
          title="Fyll"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("insertUnorderedList")}
          title="Punktliste"
        >
          <List className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font selector */}
        <Select onValueChange={applyFont}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Standard</SelectItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Sans-serif</div>
            {FONT_OPTIONS.filter(f => f.group === "Sans-serif").map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.name}
              </SelectItem>
            ))}
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Serif</div>
            {FONT_OPTIONS.filter(f => f.group === "Serif").map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.name}
              </SelectItem>
            ))}
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Mono</div>
            {FONT_OPTIONS.filter(f => f.group === "Mono").map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Tekstfarge"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <p className="text-sm font-medium mb-2">Velg farge</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => applyColor(color.value)}
                  className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <div className="pt-2 border-t border-border">
              <input
                type="color"
                onChange={(e) => applyColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
                title="Egendefinert farge"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "min-h-[120px] p-3 text-sm focus:outline-none",
          "prose prose-sm prose-invert max-w-none",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        )}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
});
