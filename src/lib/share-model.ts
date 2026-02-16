import { getPublicUrl } from "@/lib/utils";
import type { ShareModel } from "@/types/share";

function truncateTitle(title: string, max = 30): string {
  return title.length > max ? title.slice(0, max - 3).trim() + "…" : title;
}

export function shareModelFromProject(params: {
  slug: string;
  title: string;
  tagline?: string | null;
  heroImageUrl: string | null;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");
  return {
    title: truncateTitle(params.title),
    subtitle: params.tagline ?? undefined,
    heroImageUrl: params.heroImageUrl ?? "",
    cta: `Oppdag ${params.title} på GIGGEN`,
    url: `${base}/project/${params.slug}`,
    brandLogoUrl: params.brandLogoUrl,
    brandBackgroundUrl: params.brandBackgroundUrl,
  };
}

export function shareModelFromVenue(params: {
  slug: string;
  name: string;
  description?: string | null;
  heroImageUrl: string | null;
  brandLogoUrl?: string;
  brandBackgroundUrl?: string;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");
  return {
    title: truncateTitle(params.name),
    subtitle: params.description?.slice(0, 80) ?? undefined,
    heroImageUrl: params.heroImageUrl ?? "",
    cta: "Se program på GIGGEN",
    url: `${base}/venue/${params.slug}`,
    brandLogoUrl: params.brandLogoUrl,
    brandBackgroundUrl: params.brandBackgroundUrl,
  };
}
