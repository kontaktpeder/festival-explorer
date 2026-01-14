import { ParallaxBackground } from "@/components/ui/ParallaxBackground";
import type { Json } from "@/integrations/supabase/types";

interface SectionPreviewProps {
  section: {
    id: string;
    type: string;
    title: string;
    bg_image_url?: string | null;
    bg_image_url_desktop?: string | null;
    bg_image_url_mobile?: string | null;
    bg_mode: string;
    content_json?: Json | null;
    image_fit_mode?: string | null;
  };
  mode: "desktop" | "mobile";
  festivalName?: string;
  dateRange?: string;
  festivalDescription?: string;
}

export function SectionPreview({ 
  section, 
  mode, 
  festivalName, 
  dateRange, 
  festivalDescription 
}: SectionPreviewProps) {
  const contentJson = section.content_json as Record<string, unknown> | null;
  const isMobile = mode === "mobile";
  
  // Preview container dimensions
  const containerWidth = isMobile ? 180 : 320;
  const containerHeight = isMobile ? 320 : 180;
  
  // Get the appropriate background image
  const bgImage = isMobile 
    ? (section.bg_image_url_mobile || section.bg_image_url_desktop || section.bg_image_url)
    : (section.bg_image_url_desktop || section.bg_image_url);

  // Get content text based on section type
  const getContentText = () => {
    if (!contentJson) return null;
    
    // New structure: {content: {...}, presentation: {...}}
    const content = contentJson.content as Record<string, unknown> | undefined;
    if (content) {
      return content.text as string | undefined;
    }
    
    // Legacy: fallback to old structure
    switch (section.type) {
      case "hero":
        return contentJson.text as string | undefined;
      case "om":
        return contentJson.text as string | undefined;
      case "program":
      case "artister":
      case "venue-plakat":
        return contentJson.intro as string | undefined;
      case "praktisk":
        return contentJson.info as string | undefined;
      case "footer":
        return contentJson.description as string | undefined;
      default:
        return null;
    }
  };

  const contentText = getContentText();

  // Strip HTML for preview
  const stripHtml = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  return (
    <div 
      className="relative overflow-hidden rounded-md border border-border bg-background"
      style={{ 
        width: containerWidth, 
        height: containerHeight,
      }}
    >
      {/* Background */}
      {bgImage ? (
        section.bg_mode === "fixed" ? (
          <ParallaxBackground
            imageUrl={bgImage}
            intensity={0}
            imageFitMode={(section.image_fit_mode as 'cover' | 'contain') || 'cover'}
          />
        ) : (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${bgImage})`,
              backgroundSize: section.image_fit_mode === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/* Overlay gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, hsl(240 10% 6% / 0.6) 100%)',
        }}
      />

      {/* Content preview */}
      <div className="absolute inset-0 flex flex-col justify-end p-2">
        {/* Section type badge */}
        <div className="absolute top-1 left-1">
          <span className="text-[8px] uppercase tracking-wider bg-background/80 px-1.5 py-0.5 rounded text-muted-foreground">
            {section.type}
          </span>
        </div>

        {/* Title */}
        <h4 
          className="text-foreground font-semibold truncate"
          style={{ fontSize: isMobile ? '10px' : '12px' }}
        >
          {section.title || "Untitled"}
        </h4>

        {/* Content preview - truncated */}
        {contentText && (
          <p 
            className="text-muted-foreground line-clamp-2 mt-0.5"
            style={{ fontSize: isMobile ? '7px' : '9px' }}
          >
            {stripHtml(contentText)}
          </p>
        )}

        {/* Show festival info for relevant sections */}
        {festivalName && section.type === "hero" && (
          <p 
            className="text-accent font-medium mt-1"
            style={{ fontSize: isMobile ? '8px' : '10px' }}
          >
            {festivalName}
          </p>
        )}

        {dateRange && section.type === "hero" && (
          <p 
            className="text-muted-foreground"
            style={{ fontSize: isMobile ? '6px' : '8px' }}
          >
            {dateRange}
          </p>
        )}
      </div>
    </div>
  );
}
