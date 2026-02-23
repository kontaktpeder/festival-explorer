import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getPublicUrl } from "@/lib/utils";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
import { Button } from "@/components/ui/button";
import { FestivalFooter } from "@/components/festival/FestivalFooter";

const FESTIVAL_SLUG = "giggen-festival-for-en-kveld";
const PAGE_PATH = "/festival-oslo-2026";
const DEFAULT_START_DATE = "2026-03-14";
const VENUE_NAME = "Josefines Vertshus";
const VENUE_SLUG = "josefines-vertshus";
const DEFAULT_OG_IMAGE = "https://lovable.dev/opengraph-image-p98pqg.png";

const META_TITLE = "Festival Oslo 2026 – GIGGEN Festival på Josefines Vertshus";
const META_DESCRIPTION =
  "Festival i Oslo 2026 på Josefines Vertshus. GIGGEN Festival – live musikk i Oslo. Kjøp billetter nå.";

function useFestivalOslo2026Seo(heroImageUrl: string | null) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const baseUrl = getPublicUrl().replace(/\/$/, "");
    const canonicalUrl = `${baseUrl}${PAGE_PATH}`;
    const ticketsUrl = `${baseUrl}/tickets`;
    const ogImage = heroImageUrl || DEFAULT_OG_IMAGE;

    document.title = META_TITLE;

    const setMeta = (nameOrProp: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, nameOrProp);
        document.head.appendChild(el);
        addedRef.current.add(`${attr}-${nameOrProp}`);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", META_DESCRIPTION);
    setMeta("og:title", META_TITLE, true);
    setMeta("og:description", META_DESCRIPTION, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:type", "event", true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:site_name", "Giggen", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", META_TITLE);
    setMeta("twitter:description", META_DESCRIPTION);
    setMeta("twitter:image", ogImage);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
      addedRef.current.add("canonical");
    }
    linkCanonical.setAttribute("href", canonicalUrl);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: "GIGGEN Festival 2026",
      startDate: DEFAULT_START_DATE,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: VENUE_NAME,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Oslo",
          addressCountry: "NO",
        },
      },
      organizer: { "@type": "Organization", name: "Giggen" },
      image: ogImage,
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        url: ticketsUrl,
        priceCurrency: "NOK",
        availability: "https://schema.org/InStock",
      },
    };

    const jsonStr = JSON.stringify(jsonLd);
    let scriptLd = document.getElementById("festival-oslo-2026-jsonld") as HTMLScriptElement | null;
    if (!scriptLd) {
      scriptLd = document.createElement("script");
      scriptLd.id = "festival-oslo-2026-jsonld";
      scriptLd.type = "application/ld+json";
      document.head.appendChild(scriptLd);
      addedRef.current.add("jsonld");
    }
    scriptLd.textContent = jsonStr;

    return () => {
      document.title = "GIGGEN";
      const c = document.querySelector('link[rel="canonical"]');
      if (c && addedRef.current.has("canonical")) c.remove();
      document.getElementById("festival-oslo-2026-jsonld")?.remove();
    };
  }, [heroImageUrl]);
}

const FAQ = [
  { q: "Når er festivalen?", a: "GIGGEN Festival 2026 er 14. mars 2026." },
  { q: "Hvor er festivalen?", a: "Festivalen er på Josefines Vertshus i Oslo." },
  { q: "Hva slags musikk er det?", a: "Live musikk – ulike artister og sjangre på scenen." },
  { q: "Kan jeg kjøpe billett i døra?", a: "Ja, det er mulig å kjøpe billett i døra hvis det er ledige plasser. Vi anbefaler forhåndskjøp." },
  { q: "Aldersgrense?", a: "18 år." },
  { q: "Hvordan kommer jeg meg dit?", a: "Josefines Vertshus ligger i Oslo. Sjekk adresse og kollektiv på venue-siden eller i kart." },
];

export default function FestivalOslo2026Page() {
  const { data: shell } = useFestivalShell(FESTIVAL_SLUG);
  const { data: details } = useFestivalDetails(shell?.id);
  const themeHeroUrl = useSignedMediaUrl(shell?.theme?.hero_image_url, "public");
  const heroImageUrl = themeHeroUrl || null;

  useFestivalOslo2026Seo(heroImageUrl);

  const artists = details?.allArtistsWithEventSlug || [];

  return (
    <PageLayout>
      <StaticLogo />

      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-24 md:pt-32 pb-16 space-y-16">

          {/* H1 + intro */}
          <header className="space-y-4">
            <h1 className="text-display text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">
              Festival Oslo 2026 – GIGGEN Festival på Josefines Vertshus
            </h1>
            <p className="text-foreground/70 text-lg md:text-xl leading-relaxed max-w-2xl">
              GIGGEN Festival er festival i Oslo 2026 med live musikk i Oslo på Josefines Vertshus.
              Kom og opplev levende musikk i Oslo – én kveld med artister på scenen.
            </p>
          </header>

          {/* Om festivalen */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Om festivalen
            </h2>
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed">
              GIGGEN Festival 2026 er en kveld med live musikk på Josefines Vertshus. Vi samler artister og publikum for én helg med konserter og fellesskap.
            </p>
          </section>

          {/* Program og artister */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Program og artister
            </h2>
            {artists.length > 0 ? (
              <ul className="space-y-2">
                {artists.map((a: { id: string; name: string; slug: string }) => (
                  <li key={a.id}>
                    <Link
                      to={`/project/${a.slug}`}
                      className="text-accent hover:underline text-base"
                    >
                      {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Programmet legges ut snart.</p>
            )}
            <div className="pt-2">
              <Link
                to="/festival"
                className="text-sm text-accent hover:underline"
              >
                Se fullt program →
              </Link>
            </div>
          </section>

          {/* Sted */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Sted
            </h2>
            <p className="text-foreground/80 text-base">{VENUE_NAME}, Oslo.</p>
            <Link
              to={`/venue/${VENUE_SLUG}`}
              className="text-sm text-accent hover:underline"
            >
              Mer om venue →
            </Link>
          </section>

          {/* Billetter */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Billetter
            </h2>
            <p className="text-foreground/80 text-base">Kjøp billetter til GIGGEN Festival 2026.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className={!TICKET_SALES_ENABLED ? "opacity-50 pointer-events-none" : ""}>
                <Link to="/tickets">Kjøp billetter</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/festival">Se program</Link>
              </Button>
            </div>
          </section>

          {/* Praktisk info */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Praktisk info
            </h2>
            <div className="text-foreground/80 text-base space-y-1">
              <p>Dører åpner: 20:00</p>
              <p>Aldersgrense: 18 år</p>
              <p>Billetter: på døren eller forhåndskjøp</p>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              FAQ
            </h2>
            <dl className="space-y-4">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <dt className="font-semibold text-foreground text-base">{q}</dt>
                  <dd className="text-foreground/70 text-sm mt-1">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Tilbake */}
          <div className="pt-4">
            <Link to="/festival" className="text-sm text-muted-foreground hover:text-accent transition-colors">
              ← Tilbake til festival
            </Link>
          </div>

        </div>
      </div>

      <FestivalFooter />
    </PageLayout>
  );
}
