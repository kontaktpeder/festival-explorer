import { getPublicUrl } from "@/lib/utils";

const SITE_URL = "https://giggen.org";
const MAX_EVENT_DESCRIPTION_LENGTH = 220;
const MIN_EVENT_DESCRIPTION_LENGTH = 160;
const MAX_PERFORMERS = 8;

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
  /** Dynamisk Event.description: seo_intro (kort) eller template. Maks 160–220 tegn. */
  eventDescription?: string | null;
  /** Artister til performer-array (maks 8 i JSON-LD). */
  performers?: Array<{ name: string }> | null;
  /** Laveste billettpris i NOK (heltall). Ved én pris: bruk samme som priceHigh. */
  priceLow?: number | null;
  /** Høyeste billettpris i NOK (heltall). Ved én pris: bruk samme som priceLow. */
  priceHigh?: number | null;
};

const BASE = () => getPublicUrl().replace(/\/$/, "");

/**
 * Normaliserer endDate: aldri før startDate; én dags festival → endDate = startDate.
 */
function normalizeEndDate(
  startDate: string,
  endDate: string | null | undefined
): string | null {
  if (!startDate || startDate.length < 10) return null;
  const start = startDate.slice(0, 10);
  if (!endDate || String(endDate).trim() === "") return start;
  const end = String(endDate).trim().slice(0, 10);
  if (end < start) return start;
  return end;
}

/**
 * Event.description: bruk eventDescription hvis satt, ellers template.
 */
function eventDescriptionForLd(p: FestivalSeoParams): string {
  const template = `${p.festivalName} er en festival i ${p.city} ${p.year} på ${p.venueName}. Live musikk, program og billetter.`;
  const raw = p.eventDescription?.trim();
  if (raw && raw.length > 0) {
    const len = Math.min(
      Math.max(raw.length, MIN_EVENT_DESCRIPTION_LENGTH),
      MAX_EVENT_DESCRIPTION_LENGTH
    );
    const trimmed = raw.slice(0, len).trim();
    return trimmed.length > 0 ? trimmed : template;
  }
  return template;
}

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

function buildOffers(
  offerUrl: string,
  priceLow: number | null | undefined,
  priceHigh: number | null | undefined
): Record<string, unknown> {
  const baseOffer = {
    url: offerUrl,
    priceCurrency: "NOK" as const,
    availability: "https://schema.org/InStock" as const,
  };
  const low =
    priceLow != null && Number.isFinite(Number(priceLow))
      ? Number(priceLow)
      : null;
  const high =
    priceHigh != null && Number.isFinite(Number(priceHigh))
      ? Number(priceHigh)
      : null;
  if (low != null && high != null) {
    if (low === high) {
      return { "@type": "Offer", ...baseOffer, price: low };
    }
    return { "@type": "AggregateOffer", ...baseOffer, lowPrice: low, highPrice: high };
  }
  return { "@type": "Offer", ...baseOffer };
}

export function festivalJsonLd(p: FestivalSeoParams): object {
  const base = SITE_URL.replace(/\/$/, "");
  const pageUrl = `${base}/festival/${p.slug}`;
  const pageId = `${pageUrl}#webpage`;
  const eventId = `${pageUrl}#event`;

  const normalizedEnd = normalizeEndDate(p.startDate, p.endDate);
  const startDateOnly = p.startDate?.slice(0, 10) || p.startDate;

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
    description: eventDescriptionForLd(p),
    startDate: startDateOnly,
    ...(normalizedEnd ? { endDate: normalizedEnd } : {}),
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
    organizer: {
      "@type": "Organization",
      name: "Giggen",
      url: SITE_URL,
    },
    url: pageUrl,
    offers: buildOffers(`${pageUrl}#billetter`, p.priceLow, p.priceHigh),
    mainEntityOfPage: { "@id": pageId },
  };

  if (p.heroImageUrl) {
    eventNode.image = p.heroImageUrl;
  }

  const performerList =
    p.performers?.filter((x) => x?.name?.trim()).slice(0, MAX_PERFORMERS) ?? [];
  if (performerList.length > 0) {
    eventNode.performer = performerList.map(({ name }) => ({
      "@type": "MusicGroup",
      name: name.trim(),
    }));
  }

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
