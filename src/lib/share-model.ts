import { getPublicUrl } from "@/lib/utils";
import type { ShareModel } from "@/types/share";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const TITLE_MAX = 34;
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
  venueName?: string | null;
  startAt?: string | null;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");

  let cta = `${params.title} på giggen.org`;
  if (params.venueName && params.startAt) {
    const dateStr = format(new Date(params.startAt), "d. MMMM", { locale: nb }).toUpperCase();
    cta = `${dateStr} · ${params.venueName.toUpperCase()}\nSIKRE DEG BILLETT NÅ`;
  } else if (params.venueName) {
    cta = `${params.venueName.toUpperCase()}\nSIKRE DEG BILLETT NÅ`;
  }

  return {
    title: truncate(params.title, TITLE_MAX),
    subtitle: params.tagline ? truncate(params.tagline, SUBTITLE_MAX) : undefined,
    heroImageUrl: params.heroImageUrl ?? null,
    cta,
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
    cta: `Utforsk ${params.name} på giggen.org`,
    url: `${base}/venue/${params.slug}`,
    brandLogoUrl: params.brandLogoUrl,
    brandBackgroundUrl: params.brandBackgroundUrl,
    subjectLogoUrl: params.logoUrl ?? null,
  };
}

export function shareModelFromEvent(params: {
  slug: string;
  title: string;
  venueName?: string | null;
  venueSlug?: string | null;
  startAt?: string | null;
  heroImageUrl: string | null;
  hasTickets?: boolean;
}): ShareModel {
  const base = getPublicUrl().replace(/\/$/, "");

  let cta = "Sikre deg billett på giggen.org";
  if (params.venueName && params.startAt) {
    const dateStr = format(new Date(params.startAt), "d. MMMM", { locale: nb }).toUpperCase();
    cta = `${dateStr} · ${params.venueName.toUpperCase()}\nSIKRE DEG BILLETT NÅ`;
  } else if (params.venueName) {
    cta = `${params.venueName.toUpperCase()}\nSIKRE DEG BILLETT NÅ`;
  } else if (params.startAt) {
    const dateStr = format(new Date(params.startAt), "d. MMMM", { locale: nb }).toUpperCase();
    cta = `${dateStr}\nSIKRE DEG BILLETT NÅ`;
  }

  return {
    title: truncate(params.title, TITLE_MAX),
    subtitle: params.venueName ? truncate(params.venueName, SUBTITLE_MAX) : undefined,
    heroImageUrl: params.heroImageUrl ?? null,
    cta,
    url: `${base}/event/${params.slug}`,
  };
}
