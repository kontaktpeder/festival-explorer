export type ShareModel = {
  title: string;
  subtitle?: string;
  heroImageUrl: string;
  cta?: string;
  url: string;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
};

export type ShareVariant = "story" | "link";

export const SHARE_DIMENSIONS = {
  story: { width: 1080, height: 1920 },
  link: { width: 1080, height: 1350 },
} as const;
