export type SocialLinkType =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "soundcloud"
  | "spotify"
  | "youtube"
  | "website"
  | "other";

export interface SocialLink {
  type: SocialLinkType;
  url: string;
  label?: string;
}
