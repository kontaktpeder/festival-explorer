/**
 * CroppedImage Component
 * 
 * Renders an image with focal point positioning based on crop settings.
 * Works with signed URLs and supports both avatar and hero modes.
 * 
 * USAGE:
 * <CroppedImage
 *   src={signedUrl}
 *   alt="Profile"
 *   imageSettings={entity.hero_image_settings}
 *   aspect="hero"
 *   className="w-full h-40"
 * />
 * 
 * For natural aspect ratio (uses aspect_ratio from imageSettings):
 * <CroppedImage
 *   src={signedUrl}
 *   alt="Photo"
 *   imageSettings={entity.hero_image_settings}
 *   aspect="auto"
 *   className="w-full"
 * />
 */

import { cn } from "@/lib/utils";
import { getCroppedImageStyles, type CropMode } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

interface CroppedImageProps {
  src: string;
  alt?: string;
  imageSettings?: ImageSettings | unknown | null;
  aspect?: CropMode | "auto"; // "auto" = use natural aspect from imageSettings
  className?: string;
  containerClassName?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export function CroppedImage({
  src,
  alt = "",
  imageSettings,
  aspect = "auto",
  className,
  containerClassName,
  onError,
}: CroppedImageProps) {
  const cropStyles = getCroppedImageStyles(imageSettings);
  
  // Parse settings to get natural aspect ratio if available
  const parsedSettings = parseImageSettings(imageSettings);
  const naturalAspectRatio = parsedSettings?.aspect_ratio;
  
  // Determine aspect ratio styling
  let aspectClass = "";
  let aspectStyle: React.CSSProperties = {};
  
  if (aspect === "avatar") {
    aspectClass = "aspect-square";
  } else if (aspect === "hero") {
    aspectClass = "aspect-video";
  } else if (aspect === "auto" && naturalAspectRatio) {
    // Use natural aspect ratio from image settings
    aspectStyle = { aspectRatio: `${naturalAspectRatio}` };
  }

  return (
    <div 
      className={cn("overflow-hidden", aspectClass, containerClassName)}
      style={aspectStyle}
    >
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full", className)}
        style={cropStyles}
        onError={onError}
      />
    </div>
  );
}

/**
 * CroppedBackground Component
 * 
 * Renders a div with background-image using focal point positioning.
 * Useful for hero sections and cards where content overlays the image.
 */
interface CroppedBackgroundProps {
  src: string;
  imageSettings?: ImageSettings | unknown | null;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function CroppedBackground({
  src,
  imageSettings,
  className,
  children,
  style,
}: CroppedBackgroundProps) {
  const { objectPosition } = getCroppedImageStyles(imageSettings);
  
  return (
    <div
      className={cn("bg-cover bg-no-repeat", className)}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: objectPosition,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
