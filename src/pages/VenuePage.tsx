import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MapPin, Calendar } from "lucide-react";
import { useVenue } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";


export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: venue, isLoading, error } = useVenue(slug || "");

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

  // Use signed URL and parse image settings
  const heroImageUrl = useSignedMediaUrl(venue.hero_image_url, 'public');
  const heroImageSettings = parseImageSettings(venue.hero_image_settings);

  // venues table has address + city; entities have location_name/type
  const locationDisplay = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <PageLayout>
      {/* Static logo */}
      <StaticLogo />

      <HeroSection 
        imageUrl={heroImageUrl || undefined} 
        imageSettings={heroImageSettings}
        compact 
        scrollExpand
        useNaturalAspect
      >
        {venue.city && (
          <div className="text-mono text-accent mb-1 text-xs uppercase tracking-widest opacity-80">{venue.city}</div>
        )}
        <h1 className="font-black text-2xl md:text-3xl uppercase tracking-tight leading-none">{venue.name}</h1>
      </HeroSection>

      <div className="section space-y-4">
        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {locationDisplay && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span>{locationDisplay}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {venue.description && (
          <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
            {venue.description}
          </p>
        )}
      </div>

      {/* Upcoming events */}
      {venue.upcomingEvents && venue.upcomingEvents.length > 0 && (
        <>
          <div className="accent-line" />
          <section className="section">
            <h2 className="section-title">Kommende events</h2>

            <div className="space-y-3">
              {venue.upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/event/${event.slug}`}
                  className="cosmic-card p-4 flex items-center gap-4 group"
                >
                  <div className="flex-shrink-0 text-center">
                    <div className="text-mono text-xs text-accent">
                      {format(new Date(event.start_at), "MMM", { locale: nb }).toUpperCase()}
                    </div>
                    <div className="text-2xl font-bold">
                      {format(new Date(event.start_at), "d")}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), "EEEE HH:mm", { locale: nb })}
                    </p>
                  </div>

                  <Calendar className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {(!venue.upcomingEvents || venue.upcomingEvents.length === 0) && (
        <section className="section">
          <EmptyState
            title="Ingen kommende events"
            description="Det er ingen planlagte events på dette venuet for øyeblikket."
          />
        </section>
      )}

      {/* What is GIGGEN footer */}
      <WhatIsGiggenFooter />
    </PageLayout>
  );
}
