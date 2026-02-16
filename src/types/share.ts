export type ShareModel = {
  title: string;
  subtitle?: string;
  heroImageUrl?: string | null;
  cta?: string;
  url: string;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
  /** Prosjekt- eller venue-logo, vises top-left som signature */
  subjectLogoUrl?: string | null;
};

export type ShareVariant = "story" | "link";

export const SHARE_DIMENSIONS = {
  story: { width: 1080, height: 1920 },
  link: { width: 1080, height: 1350 },
} as const;
