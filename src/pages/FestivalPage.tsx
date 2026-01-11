import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { useFestival } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { EventCard } from "@/components/ui/EventCard";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";

export default function FestivalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: festival, isLoading, error } = useFestival(slug || "");

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster festival..." />
      </PageLayout>
    );
  }

  if (error || !festival) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Festival ikke funnet"
          description="Festivalen du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  const dateRange =
    festival.start_at && festival.end_at
      ? `${format(new Date(festival.start_at), "d. MMM", { locale: nb })} – ${format(new Date(festival.end_at), "d. MMM yyyy", { locale: nb })}`
      : festival.start_at
        ? format(new Date(festival.start_at), "d. MMMM yyyy", { locale: nb })
        : null;

  // Get hero image from theme if festival doesn't have one
  const heroImage = festival.theme?.hero_image_url || undefined;

  return (
    <PageLayout>
      <HeroSection imageUrl={heroImage}>
        <div className="animate-slide-up">
          {dateRange && (
            <div className="text-mono text-accent mb-2">{dateRange}</div>
          )}
          <h1 className="text-display text-4xl md:text-5xl mb-3">
            {festival.name}
          </h1>
          {festival.description && (
            <p className="text-foreground/80 text-lg max-w-lg leading-relaxed">
              {festival.description}
            </p>
          )}
        </div>
      </HeroSection>

      <div className="accent-line" />

      <section className="section">
        <h2 className="section-title">Program</h2>

        {festival.festivalEvents && festival.festivalEvents.length > 0 ? (
          <div className="space-y-4">
            {festival.festivalEvents.map((fe, index) =>
              fe.event ? (
                <div
                  key={fe.event_id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <EventCard event={fe.event as any} />
                </div>
              ) : null
            )}
          </div>
        ) : (
          <EmptyState
            title="Ingen events ennå"
            description="Programmet for denne festivalen er ikke klart ennå."
          />
        )}
      </section>
    </PageLayout>
  );
}
