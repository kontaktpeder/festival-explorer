import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MapPin, Calendar, Clock, Building2 } from "lucide-react";
import { useVenue } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import { ShareImageSection } from "@/components/share/ShareImageSection";
import { shareModelFromVenue } from "@/lib/share-model";
import { UnifiedTimeline } from "@/components/ui/UnifiedTimeline";
import { VENUE_EVENT_TYPE_OPTIONS } from "@/lib/timeline-config";


export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: venue, isLoading, error } = useVenue(slug || "");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Hooks must be called before any early returns
  const heroImageUrl = useSignedMediaUrl(venue?.hero_image_url, 'public');
  const heroImageSettings = parseImageSettings(venue?.hero_image_settings);

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

  // venues table has address + city
  const locationDisplay = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <PageLayout>
      {/* Static logo */}
      <StaticLogo />


      {/* 1. HERO – Stemning og identitet */}
      <HeroSection 
        imageUrl={heroImageUrl || undefined} 
        imageSettings={heroImageSettings}
        fullScreen
        scrollExpand
        useNaturalAspect
      >
        {venue.city && (
          <div className="text-mono text-accent/70 mb-3 text-xs uppercase tracking-[0.3em]">{venue.city}</div>
        )}
        <h1 className="font-black text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.9]">
          {venue.name}
        </h1>
      </HeroSection>

      {/* 2. STEDET – Orientering */}
      {locationDisplay && (
        <section className="py-16 md:py-24">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
              Stedet
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-lg md:text-xl">
                <MapPin className="w-5 h-5 text-accent/60 flex-shrink-0" />
                <span className="font-light">{locationDisplay}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. BESKRIVELSE – Hva slags sted er dette */}
      {venue.description && (
        <section className="py-16 md:py-24 border-t border-border/20">
          <div className="max-w-2xl mx-auto px-6">
            <p className="text-xl md:text-2xl font-light leading-relaxed text-foreground/90 whitespace-pre-line">
              {venue.description}
            </p>
          </div>
        </section>
      )}

      {/* 4. KOMMENDE EVENTS – Programmert */}
      {venue.upcomingEvents && venue.upcomingEvents.length > 0 && (
        <section className="py-20 md:py-32 border-t border-border/20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-12 md:mb-16">
              Kommende events
            </h2>

            <div className="space-y-8 md:space-y-12">
              {venue.upcomingEvents.map((event) => {
                const startDate = new Date(event.start_at);
                return (
                  <Link
                    key={event.id}
                    to={`/event/${event.slug}`}
                    className="group flex items-start gap-6 py-4 transition-all duration-300 hover:translate-x-2"
                  >
                    {/* Date block */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-mono text-accent/60 text-[10px] uppercase tracking-widest">
                        {format(startDate, "MMM", { locale: nb }).toUpperCase()}
                      </div>
                      <div className="text-3xl md:text-4xl font-bold tracking-tight leading-none mt-1">
                        {format(startDate, "d")}
                      </div>
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl md:text-2xl font-medium tracking-tight group-hover:text-accent transition-colors duration-300">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground/60">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-light">
                          {format(startDate, "EEEE HH:mm", { locale: nb })}
                        </span>
                      </div>
                    </div>

                    {/* Arrow hint */}
                    <Calendar className="w-5 h-5 text-muted-foreground/20 group-hover:text-accent/60 transition-colors duration-300 mt-1" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(!venue.upcomingEvents || venue.upcomingEvents.length === 0) && (
        <section className="py-20 md:py-32 border-t border-border/20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-muted-foreground/50 font-light text-lg">
              Ingen kommende events for øyeblikket.
            </p>
          </div>
        </section>
      )}

      {/* Del – bilde med bakgrunn, tittel */}
      <ShareImageSection
        slug={venue.slug}
        shareModel={shareModelFromVenue({
          slug: venue.slug,
          name: venue.name,
          description: venue.description ?? null,
          heroImageUrl: heroImageUrl ?? null,
          logoUrl: (venue as any).logo_url ?? null,
        })}
      />

      {/* HISTORIKK – Tidslinje */}
      {venue.id && (
        <section className="py-20 md:py-32 border-t border-border/20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-12 md:mb-16">
              Historikk
            </h2>
            <UnifiedTimeline
              source={{ type: "entity", id: venue.id }}
              eventTypeOptions={VENUE_EVENT_TYPE_OPTIONS}
            />
          </div>
        </section>
      )}

      {/* STILLE AVSLUTNING */}
      <section className="py-24 md:py-40">
        <div className="flex justify-center">
          <Building2 className="w-8 h-8 text-accent/20" />
        </div>
      </section>

      {/* What is GIGGEN footer */}
      <WhatIsGiggenFooter />
    </PageLayout>
  );
}
