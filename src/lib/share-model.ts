import { getPublicUrl } from "@/lib/utils";
import type { ShareModel } from "@/types/share";

const TITLE_MAX = 28;
const SUBTITLE_MAX = 80;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3).trim() + "…";
}

export function shareModelFromProject(params: {
  slug: string;
  title: string;
  tagline?: string | null;
  heroImageUrl: string | null;
  logoUrl?: string | null;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");
  return {
    title: truncate(params.title, TITLE_MAX),
    subtitle: params.tagline ? truncate(params.tagline, SUBTITLE_MAX) : undefined,
    heroImageUrl: params.heroImageUrl ?? null,
    cta: `Oppdag ${params.title} på GIGGEN`,
    url: `${base}/project/${params.slug}`,
    brandLogoUrl: params.brandLogoUrl,
    brandBackgroundUrl: params.brandBackgroundUrl,
    subjectLogoUrl: params.logoUrl ?? null,
  };
}

export function shareModelFromVenue(params: {
  slug: string;
  name: string;
  description?: string | null;
  heroImageUrl: string | null;
  logoUrl?: string | null;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");
  return {
    title: truncate(params.name, TITLE_MAX),
    subtitle: params.description ? truncate(params.description, SUBTITLE_MAX) : undefined,
    heroImageUrl: params.heroImageUrl ?? null,
    cta: "Se program på GIGGEN",
    url: `${base}/venue/${params.slug}`,
    brandLogoUrl: params.brandLogoUrl,
    brandBackgroundUrl: params.brandBackgroundUrl,
    subjectLogoUrl: params.logoUrl ?? null,
  };
}
