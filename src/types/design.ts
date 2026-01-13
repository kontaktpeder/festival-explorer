// Design Types - Reusable for festival, band, profile, event templates

// Design theme (global styling)
export interface DesignTheme {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily: string;
  fontSize: number;
}

// Background configuration
export interface BackgroundConfig {
  type: 'image' | 'color' | 'gradient';
  value: string; // URL for image, hex for color, gradient string
  overlay?: boolean;
  overlayOpacity?: number; // 0-1
  overlayColor?: string; // hex color
}

// Section position (percentage-based for responsiveness)
export interface SectionPosition {
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  width?: number; // 0-100 (%)
  alignment?: 'left' | 'center' | 'right';
}

// Text section content
export interface TextSectionContent {
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'semibold';
  textAlign?: 'left' | 'center' | 'right';
}

// Image section content
export interface ImageSectionContent {
  imageUrl: string;
  alt?: string;
  objectFit?: 'cover' | 'contain';
}

// Union type for section content
export type SectionContent = TextSectionContent | ImageSectionContent;

// Type guards for section content
export function isTextContent(content: SectionContent): content is TextSectionContent {
  return 'text' in content;
}

export function isImageContent(content: SectionContent): content is ImageSectionContent {
  return 'imageUrl' in content;
}

// Section definition
export interface Section {
  id: string;
  type: 'text' | 'image';
  position: SectionPosition;
  content: SectionContent;
  color?: string; // Override theme color
  zIndex?: number;
  visible?: boolean;
}

// Template types
export type DesignTemplate = 'festival' | 'band' | 'profile' | 'event';

// Complete design
export interface Design {
  id?: string;
  template: DesignTemplate;
  theme: DesignTheme;
  background: BackgroundConfig;
  sections: Section[];
  entity_id?: string;
  entity_type?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Default designs
export const defaultDesignTheme: DesignTheme = {
  primaryColor: '#FF6B35',
  fontFamily: 'Inter',
  fontSize: 24,
};

export const defaultBackground: BackgroundConfig = {
  type: 'color',
  value: '#1a1a2e',
  overlay: false,
  overlayOpacity: 0.3,
  overlayColor: '#000000',
};

export const createDefaultDesign = (template: DesignTemplate = 'festival'): Design => ({
  template,
  theme: { ...defaultDesignTheme },
  background: { ...defaultBackground },
  sections: [],
});
