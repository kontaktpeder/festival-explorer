/**
 * Image Crop/Focal Point Helpers
 * 
 * These utilities convert focal point data to CSS properties for displaying
 * cropped images without generating new files.
 * 
 * ARCHITECTURE NOTES:
 * - Focal point (0-1 range) represents where the image should be anchored
 * - 0,0 = top-left, 0.5,0.5 = center, 1,1 = bottom-right
 * - Zoom (1+) represents scale factor
 * 
 * FUTURE EXTENSIONS (Gallery mode):
 * - Add mode: 'avatar' | 'hero' | 'gallery' | 'custom' to ImageSettings
 * - Gallery mode could store array of crop settings per image
 * - Custom mode could store arbitrary aspect_ratio
 */

import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

/**
 * Aspect ratio presets for different crop modes
 * To add new modes: add entry here and update CropMode type
 */
export const ASPECT_RATIOS = {
  avatar: 1, // 1:1 square
  hero: 16 / 9, // 16:9 wide
  // Future: gallery: 4 / 3, etc.
} as const;

export type CropMode = keyof typeof ASPECT_RATIOS;

/**
 * Convert focal point to CSS object-position
 * 
 * @param settings - ImageSettings object or raw JSONB from database
 * @returns CSS object-position string (e.g., "50% 20%")
 */
export function getObjectPositionFromFocal(
  settings: ImageSettings | unknown | null | undefined
): string {
  const parsed = typeof settings === 'object' && settings !== null && 'focal_x' in settings
    ? settings as ImageSettings
    : parseImageSettings(settings);
  
  if (!parsed) {
    return "50% 50%"; // Default center
  }
  
  const x = Math.round(parsed.focal_x * 100);
  const y = Math.round(parsed.focal_y * 100);
  
  return `${x}% ${y}%`;
}

/**
 * Get CSS transform for zoom effect
 * 
 * @param settings - ImageSettings object or raw JSONB from database
 * @returns CSS transform string or undefined if no zoom
 */
export function getZoomTransform(
  settings: ImageSettings | unknown | null | undefined
): string | undefined {
  const parsed = typeof settings === 'object' && settings !== null && 'focal_x' in settings
    ? settings as ImageSettings
    : parseImageSettings(settings);
  
  if (!parsed?.zoom || parsed.zoom <= 1) {
    return undefined;
  }
  
  return `scale(${parsed.zoom})`;
}

/**
 * Get combined CSS style object for cropped image display
 * 
 * @param settings - ImageSettings object or raw JSONB from database
 * @returns CSS style object ready for React style prop
 */
export function getCroppedImageStyles(
  settings: ImageSettings | unknown | null | undefined
): React.CSSProperties {
  const objectPosition = getObjectPositionFromFocal(settings);
  const transform = getZoomTransform(settings);
  
  return {
    objectFit: 'cover' as const,
    objectPosition,
    ...(transform && { transform }),
  };
}

/**
 * Get combined CSS style object for background-image display
 * 
 * @param settings - ImageSettings object or raw JSONB from database
 * @returns CSS style object for background-based display
 */
export function getCroppedBackgroundStyles(
  settings: ImageSettings | unknown | null | undefined
): React.CSSProperties {
  const objectPosition = getObjectPositionFromFocal(settings);
  const transform = getZoomTransform(settings);
  
  return {
    backgroundSize: 'cover',
    backgroundPosition: objectPosition,
    ...(transform && { transform }),
  };
}

/**
 * Default image settings (centered, no zoom)
 */
export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  focal_x: 0.5,
  focal_y: 0.5,
  zoom: 1,
};
