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
 * FUTURE EXTENSIONS:
 * - Add aspect="gallery" for gallery mode
 * - Add aspect="custom" with customAspect prop for arbitrary ratios
 */

import { cn } from "@/lib/utils";
import { getCroppedImageStyles, type CropMode } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";

interface CroppedImageProps {
  src: string;
  alt?: string;
  imageSettings?: ImageSettings | unknown | null;
  aspect?: CropMode | "auto"; // "auto" = no aspect constraint
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
  
  // Apply aspect ratio via padding-top trick for consistent sizing
  const aspectClass = aspect === "avatar" 
    ? "aspect-square" 
    : aspect === "hero" 
      ? "aspect-video" 
      : "";

  return (
    <div className={cn("overflow-hidden", aspectClass, containerClassName)}>
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
