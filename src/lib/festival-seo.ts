import { getPublicUrl } from "@/lib/utils";

export type FestivalSeoParams = {
  festivalName: string;
  city: string;
  year: string;
  venueName: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  heroImageUrl?: string | null;
  slug: string;
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
  return {
    "@context": "https://schema.org",
    "@type": "Event",
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
    url: festivalCanonicalUrl(p.slug),
    offers: {
      "@type": "Offer",
      url: `${BASE()}/tickets`,
      priceCurrency: "NOK",
      availability: "https://schema.org/InStock",
    },
  };
}
