import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Smartphone } from "lucide-react";

interface UniversalEditorProps {
  title?: string;
  previewContent: React.ReactNode;
  mobilePreviewContent: React.ReactNode;
  controlsContent: React.ReactNode;
  className?: string;
}

export function UniversalEditor({
  title,
  previewContent,
  mobilePreviewContent,
  controlsContent,
  className,
}: UniversalEditorProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className={cn("flex flex-col lg:flex-row h-full min-h-[600px]", className)}>
      {/* Controls Panel - Left side */}
      <div className="w-full lg:w-1/3 lg:min-w-[360px] lg:max-w-[480px] border-b lg:border-b-0 lg:border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {title || "Editor"}
          </h2>
        </div>
        <ScrollArea className="h-[400px] lg:h-[calc(100vh-200px)]">
          <div className="p-4">{controlsContent}</div>
        </ScrollArea>
      </div>

      {/* Preview Panel - Right side (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col bg-muted/30">
        {/* Preview Tabs */}
        <div className="p-4 border-b border-border bg-card">
          <Tabs
            value={previewMode}
            onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}
          >
            <TabsList>
              <TabsTrigger value="desktop" className="gap-2">
                <Monitor className="h-4 w-4" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Mobil
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Preview Content */}
        <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
          <div
            className={cn(
              "bg-background border border-border rounded-lg shadow-lg overflow-hidden",
              previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[1200px]"
            )}
          >
            {previewMode === "desktop" ? previewContent : mobilePreviewContent}
          </div>
        </div>
      </div>
    </div>
  );
}
