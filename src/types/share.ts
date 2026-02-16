export type ShareModel = {
  title: string;
  subtitle?: string;
  heroImageUrl?: string | null;
  cta?: string;
  url: string;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
  /** Prosjekt- eller venue-logo, vises nederst høyre */
  subjectLogoUrl?: string | null;
};

/** Kun Instagram-innlegg 4:5. Story (9:16) er fjernet. */
export type ShareVariant = "link";

export const SHARE_DIMENSIONS = {
  link: { width: 1080, height: 1350 },
} as const;

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1350;
