import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { useEvent } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LineupItem } from "@/components/ui/LineupItem";
import { BackToFestival } from "@/components/ui/BackToFestival";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug || "");

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster event..." />
      </PageLayout>
    );
  }

  if (error || !event) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Event ikke funnet"
          description="Eventet du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;

  return (
    <PageLayout>
      {/* Static logo */}
      <StaticLogo />

      {/* Back to festival button */}
      {event.festival && (
        <div className="section pt-16 pb-0">
          <BackToFestival
            festivalSlug={event.festival.slug}
            festivalName={event.festival.name}
          />
        </div>
      )}

      <HeroSection imageUrl={event.hero_image_url || undefined} compact>
        <div className="animate-slide-up">
          <div className="text-mono text-accent mb-2">
            {format(startDate, "EEEE d. MMMM", { locale: nb })}
          </div>
          <h1 className="text-display text-3xl md:text-4xl mb-3">
            {event.title}
          </h1>
        </div>
      </HeroSection>

      <div className="section space-y-6">
        {/* Meta info */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-accent" />
            <span>
              {format(startDate, "HH:mm")}
              {endDate && ` – ${format(endDate, "HH:mm")}`}
            </span>
          </div>
          {event.venue && (
            <Link
              to={`/venue/${event.venue.slug}`}
              className="flex items-center gap-2 text-sm hover:text-accent transition-colors"
            >
              <MapPin className="w-4 h-4 text-accent" />
              <span>{event.venue.name}</span>
            </Link>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-foreground/80 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* CTA */}
        <button className="btn-accent w-full flex items-center justify-center gap-2">
          <Ticket className="w-5 h-5" />
          <span>Kjøp billett</span>
        </button>
      </div>

      <div className="accent-line" />

      {/* Lineup */}
      <section className="section">
        <h2 className="section-title">Lineup</h2>

        {event.lineup && event.lineup.length > 0 ? (
          <div className="divide-y divide-border/30">
            {event.lineup.map((item) => (
              <LineupItem key={item.project_id} item={item} showBilling />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Lineup kommer snart"
            description="Artister for dette eventet er ikke annonsert ennå."
          />
        )}
      </section>
    </PageLayout>
  );
}
