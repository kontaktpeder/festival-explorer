import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, MapPin, Music, Ticket } from "lucide-react";
import { useEvent } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LineupItem } from "@/components/ui/LineupItem";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug || "");
  
  // Signed URL for public viewing
  const heroImageUrl = useSignedMediaUrl(event?.hero_image_url, 'public');

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

  // Parse hero image settings for focal point positioning
  const heroImageSettings = parseImageSettings(event.hero_image_settings);

  // Format time range
  const timeRange = endDate 
    ? `${format(startDate, "HH:mm")} – ${format(endDate, "HH:mm")}`
    : format(startDate, "HH:mm");

  return (
    <PageLayout>
      {/* Static logo in header */}
      <StaticLogo />

      {/* 1. HERO – Følelse og kontekst, ren stemning */}
      <HeroSection 
        imageUrl={heroImageUrl || undefined} 
        imageSettings={heroImageSettings}
        fullScreen
        scrollExpand
        useNaturalAspect
      >
        <div className="text-mono text-accent/70 mb-3 text-xs uppercase tracking-[0.3em]">
          {format(startDate, "EEEE", { locale: nb })}
        </div>
        <h1 className="font-black text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.9]">
          {event.title}
        </h1>
      </HeroSection>

      {/* 2. KVELDENS RAMMER – Orientering, trygghet */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
            Kvelden
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-lg md:text-xl">
              <Calendar className="w-5 h-5 text-accent/60 flex-shrink-0" />
              <span className="font-light">
                {format(startDate, "EEEE d. MMMM", { locale: nb })}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-lg md:text-xl">
              <Clock className="w-5 h-5 text-accent/60 flex-shrink-0" />
              <span className="font-light">{timeRange}</span>
            </div>
            
            {event.venue && (
              <Link
                to={`/venue/${event.venue.slug}`}
                className="flex items-center gap-4 text-lg md:text-xl group"
              >
                <MapPin className="w-5 h-5 text-accent/60 flex-shrink-0" />
                <span className="font-light group-hover:text-accent transition-colors">
                  {event.venue.name}
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 3. HVA SLAGS KVELD ER DETTE – Stemningsforankring */}
      {event.description && (
        <section className="py-16 md:py-24 border-t border-border/20">
          <div className="max-w-2xl mx-auto px-6">
            <p className="text-xl md:text-2xl font-light leading-relaxed text-foreground/90">
              {event.description}
            </p>
          </div>
        </section>
      )}

      {/* 4. BILLETT CTA – Én tydelig handling, sentrert */}
      <section className="py-16 md:py-20">
        <div className="flex flex-col items-center gap-4">
          <Link 
            to="/tickets"
            className="inline-flex items-center justify-center gap-3 py-4 px-10 border-2 border-accent text-accent bg-transparent hover:bg-accent hover:text-background transition-all duration-300 font-medium text-lg tracking-wide"
          >
            <Ticket className="w-5 h-5" />
            <span>Kjøp billett</span>
          </Link>
          <span className="text-sm text-muted-foreground/60">
            Begrenset kapasitet
          </span>
        </div>
      </section>

      {/* 5. LINEUP – Plakat, ikke liste */}
      {event.lineup && event.lineup.length > 0 && (
        <section className="py-20 md:py-32 border-t border-border/20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-12 md:mb-16">
              Lineup
            </h2>

            <div className="space-y-8 md:space-y-12">
              {event.lineup.map((item, index) => (
                <LineupItem 
                  key={item.entity_id || (item as any).project_id} 
                  item={item} 
                  showBilling 
                  isFirst={index === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. PRAKTISK – Trygghet (optional section) */}
      <section className="py-16 md:py-24 border-t border-border/20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
            Praktisk
          </h2>
          
          <div className="space-y-3 text-foreground/70">
            <p className="font-light">Aldersgrense: 20 år</p>
            <p className="font-light">Garderobe tilgjengelig</p>
            {event.venue && (
              <p className="font-light">{event.venue.address || event.venue.name}</p>
            )}
          </div>
        </div>
      </section>

      {/* 7. STILLE AVSLUTNING – La kvelden henge */}
      <section className="py-24 md:py-40">
        <div className="flex justify-center">
          <Music className="w-8 h-8 text-accent/20" />
        </div>
      </section>
    </PageLayout>
  );
}
