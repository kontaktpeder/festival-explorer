import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MapPin, Calendar, Users } from "lucide-react";
import { useVenue } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";

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

  return (
    <PageLayout>
      <HeroSection imageUrl={venue.hero_image_url || undefined} compact>
        <div className="animate-slide-up">
          {venue.city && (
            <div className="text-mono text-accent mb-2">{venue.city}</div>
          )}
          <h1 className="text-display text-3xl md:text-4xl">{venue.name}</h1>
        </div>
      </HeroSection>

      <div className="section space-y-4">
        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {venue.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span>{venue.address}</span>
            </div>
          )}
          {venue.capacity && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span>Kapasitet: {venue.capacity}</span>
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
                      {event.name}
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
    </PageLayout>
  );
}
