import { getPublicUrl } from "@/lib/utils";

const SITE_URL = "https://giggen.org";

export type FestivalSeoParams = {
  festivalName: string;
  city: string;
  year: string;
  venueName: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  heroImageUrl?: string | null;
  slug: string;
  /** ISO date string; brukes kun for dateModified på WebPage. */
  updatedAt?: string | null;
};

const BASE = () => getPublicUrl().replace(/\/$/, "");

export function festivalPageTitle(p: FestivalSeoParams): string {
  return `${p.festivalName} ${p.city} ${p.year} – Festival i ${p.city} | Billetter`;
}

export function festivalMetaDescription(
  p: FestivalSeoParams,
  override?: string | null
): string {
  if (override && override.trim()) return override.trim();
  return `Opplev ${p.festivalName} – festival i ${p.city} ${p.year} på ${p.venueName}. Live musikk, program og billetter.`;
}

export function festivalCanonicalUrl(slug: string): string {
  return `${BASE()}/festival/${slug}`;
}

export function festivalJsonLd(p: FestivalSeoParams): object {
  const base = SITE_URL.replace(/\/$/, "");
  const pageUrl = `${base}/festival/${p.slug}`;
  const pageId = `${pageUrl}#webpage`;
  const eventId = `${pageUrl}#event`;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": pageId,
    url: pageUrl,
    name: festivalPageTitle(p),
    description: festivalMetaDescription(p),
    isPartOf: { "@type": "WebSite", "@id": `${base}/#website`, name: "GIGGEN" },
  };
  if (p.heroImageUrl) {
    webPage.primaryImageOfPage = { "@type": "ImageObject", url: p.heroImageUrl };
  }
  if (p.updatedAt && p.updatedAt.trim()) {
    webPage.dateModified = p.updatedAt;
  }

  const eventNode: Record<string, unknown> = {
    "@type": "Event",
    "@id": eventId,
    name: p.festivalName,
    startDate: p.startDate,
    ...(p.endDate && { endDate: p.endDate }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: p.venueName,
      address: {
        "@type": "PostalAddress",
        addressLocality: p.city,
        addressCountry: "NO",
      },
    },
    organizer: { "@type": "Organization", name: "Giggen" },
    image: p.heroImageUrl || undefined,
    url: pageUrl,
    offers: {
      "@type": "Offer",
      url: `${base}/tickets`,
      priceCurrency: "NOK",
      availability: "https://schema.org/InStock",
    },
    mainEntityOfPage: { "@id": pageId },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webPage, eventNode],
  };
}

export function festivalBreadcrumbJsonLd(p: {
  festivalName: string;
  city: string;
  year: string;
  slug: string;
}): object {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Festival", item: `${base}/festival` },
      {
        "@type": "ListItem",
        position: 3,
        name: `${p.festivalName} ${p.city} ${p.year}`,
        item: `${base}/festival/${p.slug}`,
      },
    ],
  };
}
