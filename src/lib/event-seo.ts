const SITE_URL = "https://giggen.org";

export function eventBreadcrumbJsonLd(p: {
  eventName: string;
  slug: string;
}): object {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Event", item: `${base}/event` },
      { "@type": "ListItem", position: 3, name: p.eventName, item: `${base}/event/${p.slug}` },
    ],
  };
}
