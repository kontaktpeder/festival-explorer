import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MapPin, Calendar, Clock, Building2, Send } from "lucide-react";
import { useVenue } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import { ShareImageSection } from "@/components/share/ShareImageSection";
import { shareModelFromVenue } from "@/lib/share-model";
import { UnifiedTimeline } from "@/components/ui/UnifiedTimeline";
import { VENUE_EVENT_TYPE_OPTIONS } from "@/lib/timeline-config";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { usePageSeo } from "@/hooks/usePageSeo";
import { getPublicUrl } from "@/lib/utils";

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: venue, isLoading, error } = useVenue(slug || "");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const heroImageUrl = useSignedMediaUrl(venue?.hero_image_url, 'public');
  const heroImageSettings = parseImageSettings(venue?.hero_image_settings);

  // SEO – must be before early returns
  const venueBaseUrl = getPublicUrl().replace(/\/$/, "");
  const venueOgImage = heroImageUrl || `${venueBaseUrl}/og-festival.png`;
  const venuePageTitle = venue
    ? `${venue.name} – spillested i ${(venue as any).city || "Norge"} | GIGGEN`
    : "GIGGEN";
  const venuePageDesc = venue
    ? venue.description
      ? venue.description.slice(0, 155).replace(/\n/g, " ") + (venue.description.length > 155 ? "…" : "")
      : `${venue.name}${(venue as any).city ? ` i ${(venue as any).city}` : ""}. Events og konserter.`
    : "";

  usePageSeo(
    venue
      ? {
          title: venuePageTitle,
          description: venuePageDesc,
          canonical: `/venue/${venue.slug}`,
          ogImage: venueOgImage,
          ogType: "place" as const,
        }
      : null
  );

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster venue..." />
      </PageLayout>
    );
  }

  if (error || !venue) {
    return (
      <PageLayout>
        <EmptyState
          icon={<MapPin className="w-12 h-12" />}
          title="Venue ikke funnet"
          description="Venuet du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  const locationDisplay = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <PageLayout>
      <StaticLogo />

      {/* COVER BANNER – same layout as ProjectPage */}
      <div className="relative w-full md:h-[580px] bg-background md:bg-black overflow-hidden">
        {heroImageUrl ? (
          <>
            {/* Mobile: cropped cover */}
            <div className="block md:hidden h-[280px]">
              <CroppedImage
                src={heroImageUrl}
                alt={venue.name}
                imageSettings={heroImageSettings}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Desktop: contain with blurred bg fill */}
            <div className="hidden md:block relative h-full">
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: "blur(44px)", opacity: 0.18 }}
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative flex items-center justify-center h-full z-[1]">
                <img
                  src={heroImageUrl}
                  alt={venue.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-[280px] md:h-full bg-gradient-to-br from-card to-muted" />
        )}
        {/* Bottom fade – only on desktop */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* NAME + INFO BAR – directly below cover */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1">
            <h1 className="font-black text-3xl md:text-5xl uppercase tracking-tight leading-[0.95]">
              {venue.name}
            </h1>
            {locationDisplay && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground/70">
                <MapPin className="w-4 h-4" />
                <span>{locationDisplay}</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-border/20 mt-6 mb-0" />
      </div>

      {/* MAIN CONTENT – two-column on desktop */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">

          {/* LEFT – Primary content */}
          <div className="space-y-8">
            {/* Beskrivelse */}
            {venue.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  Om stedet
                </h2>
                <p className="text-base md:text-lg font-light leading-relaxed text-foreground/85 whitespace-pre-line">
                  {venue.description}
                </p>
              </div>
            )}

            {/* Kommende events */}
            {venue.upcomingEvents && venue.upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                  Kommende events
                </h2>
                <div className="space-y-1">
                  {venue.upcomingEvents.map((event) => {
                    const startDate = new Date(event.start_at);
                    return (
                      <Link
                        key={event.id}
                        to={`/event/${event.slug}`}
                        className="group flex items-center gap-4 py-3 px-3 -mx-3 rounded-lg hover:bg-card/60 transition-colors"
                      >
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-accent/10">
                          {event.hero_image_url ? (
                            <EventThumbnail storagePath={event.hero_image_url} alt={event.title} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <span className="text-[10px] font-bold uppercase text-accent/70 leading-none">
                                {format(startDate, "MMM", { locale: nb })}
                              </span>
                              <span className="text-lg font-bold leading-none mt-0.5">
                                {format(startDate, "d")}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium tracking-tight group-hover:text-accent transition-colors truncate">
                            {event.title}
                          </h3>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            {format(startDate, "EEEE HH:mm", { locale: nb })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {(!venue.upcomingEvents || venue.upcomingEvents.length === 0) && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  Kommende events
                </h2>
                <p className="text-muted-foreground/40 text-sm">
                  Ingen kommende events for øyeblikket.
                </p>
              </div>
            )}

            {/* Historikk */}
            {venue.id && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                  Historikk
                </h2>
                <UnifiedTimeline
                  source={{ type: "entity", id: venue.id }}
                  eventTypeOptions={VENUE_EVENT_TYPE_OPTIONS}
                />
              </div>
            )}
          </div>

          {/* RIGHT – Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Del */}
            <ShareImageSection
              slug={venue.slug}
              shareModel={shareModelFromVenue({
                slug: venue.slug,
                name: venue.name,
                description: venue.description ?? null,
                heroImageUrl: heroImageUrl ?? null,
                logoUrl: (venue as any).logo_url ?? null,
              })}
              compact
            />
          </aside>
        </div>
      </div>

      <WhatIsGiggenFooter />
    </PageLayout>
  );
}

function EventThumbnail({ storagePath, alt }: { storagePath: string; alt: string }) {
  const url = useSignedMediaUrl(storagePath, 'public');
  if (!url) return <div className="w-full h-full bg-muted" />;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
    />
  );
}