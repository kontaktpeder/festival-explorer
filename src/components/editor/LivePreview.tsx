import React from "react";
import { cn } from "@/lib/utils";
import type { Design, Section, isTextContent, isImageContent } from "@/types/design";

interface LivePreviewProps {
  design: Design;
  mode: "desktop" | "mobile";
  className?: string;
}

export function LivePreview({ design, mode, className }: LivePreviewProps) {
  const { theme, background, sections } = design;

  // Sort sections by z-index
  const sortedSections = [...sections].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  // Calculate background styles
  const getBackgroundStyle = (): React.CSSProperties => {
    if (background.type === "image") {
      return {
        backgroundImage: `url(${background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    } else if (background.type === "gradient") {
      return {
        background: background.value,
      };
    } else {
      return {
        backgroundColor: background.value,
      };
    }
  };

  // Get alignment transform
  const getAlignmentTransform = (alignment?: "left" | "center" | "right") => {
    switch (alignment) {
      case "center":
        return "translateX(-50%)";
      case "right":
        return "translateX(-100%)";
      default:
        return "none";
    }
  };

  // Render a section
  const renderSection = (section: Section) => {
    if (section.visible === false) return null;

    const { position, content, color, zIndex } = section;

    const baseStyle: React.CSSProperties = {
      position: "absolute",
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: position.width ? `${position.width}%` : "auto",
      transform: getAlignmentTransform(position.alignment),
      zIndex: zIndex || 1,
      color: color || theme.primaryColor,
      fontFamily: theme.fontFamily,
    };

    if (section.type === "text" && "text" in content) {
      const textContent = content as { text: string; fontSize?: number; fontWeight?: string; textAlign?: string };
      return (
        <div
          key={section.id}
          style={{
            ...baseStyle,
            fontSize: textContent.fontSize || theme.fontSize,
            fontWeight: textContent.fontWeight || "normal",
            textAlign: (textContent.textAlign as React.CSSProperties["textAlign"]) || "left",
          }}
          className="whitespace-pre-wrap"
        >
          {textContent.text}
        </div>
      );
    }

    if (section.type === "image" && "imageUrl" in content) {
      const imageContent = content as { imageUrl: string; alt?: string; objectFit?: string };
      return (
        <div
          key={section.id}
          style={{
            ...baseStyle,
            width: position.width ? `${position.width}%` : "auto",
          }}
        >
          <img
            src={imageContent.imageUrl}
            alt={imageContent.alt || ""}
            className="max-w-full h-auto"
            style={{
              objectFit: (imageContent.objectFit as React.CSSProperties["objectFit"]) || "contain",
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        mode === "mobile" ? "w-[375px] h-[667px]" : "w-full aspect-[16/9]",
        className
      )}
    >
      {/* Background */}
      <div className="absolute inset-0" style={getBackgroundStyle()} />

      {/* Overlay */}
      {background.overlay && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: background.overlayColor || "#000000",
            opacity: background.overlayOpacity || 0.3,
          }}
        />
      )}

      {/* Sections */}
      <div className="relative w-full h-full">
        {sortedSections.map(renderSection)}
      </div>
    </div>
  );
}
