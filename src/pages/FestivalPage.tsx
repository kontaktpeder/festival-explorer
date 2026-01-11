import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Compass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFestival } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { FestivalEventAccordion } from "@/components/ui/FestivalEventAccordion";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { Calendar } from "lucide-react";

export default function FestivalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: festival, isLoading, error } = useFestival(slug || "");

  // Hent venue hvis festival har venue_id
  const { data: venue } = useQuery({
    queryKey: ["venue", festival?.venue_id],
    queryFn: async () => {
      if (!festival?.venue_id) return null;
      const { data } = await supabase
        .from("venues")
        .select("*")
        .eq("id", festival.venue_id)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!festival?.venue_id,
  });

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

  const heroImage = festival.theme?.hero_image_url || undefined;

  const validEvents = (festival.festivalEvents || []).filter(
    (fe) => fe.event && fe.event.status === "published"
  );

  // Hent alle unike artister fra events
  const allArtists = validEvents
    .flatMap((fe) => (fe.event as any)?.lineup || [])
    .map((ep: any) => ep.project)
    .filter((project: any, index: number, self: any[]) =>
      project && self.findIndex((p) => p?.id === project.id) === index
    )
    .slice(0, 6);

  // Kort beskrivelse for hero (maks 15 ord)
  const shortDescription = festival.description
    ? festival.description.split(" ").slice(0, 15).join(" ") + (festival.description.split(" ").length > 15 ? "..." : "")
    : null;

  return (
    <PageLayout>
      {/* 1. HERO - Full screen */}
      <HeroSection imageUrl={heroImage} fullScreen>
        {/* Top navigation */}
        <div className="absolute top-4 left-4 z-20">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-accent transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Utforsk</span>
          </Link>
        </div>

        <div className="animate-slide-up pb-8">
          {dateRange && (
            <div className="text-mono text-accent mb-3">{dateRange}</div>
          )}
          <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">
            {festival.name}
          </h1>
          {shortDescription && (
            <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed">
              {shortDescription}
            </p>
          )}
        </div>
      </HeroSection>

      {/* 2. PROGRAM */}
      <section className="section-chapter" id="program">
        <h2 className="section-title">Program</h2>
        {validEvents.length > 0 ? (
          <FestivalEventAccordion events={validEvents as any} />
        ) : (
          <EmptyState
            title="Ingen events ennå"
            description="Programmet for denne festivalen er ikke klart ennå."
          />
        )}
      </section>

      <div className="accent-line" />

      {/* 3. OM GIGGEN */}
      <section className="section-chapter section-bg-about">
        <div className="max-w-xl">
          <h2 className="section-title">Om Giggen</h2>
          <div className="space-y-4 text-foreground/80 text-lg leading-relaxed">
            <p>Giggen er et rom for levende musikk.</p>
            <p>Vi bygger der det vanligvis ikke bygges.</p>
            <p className="text-muted-foreground">Dette er første kapittel.</p>
          </div>
        </div>
      </section>

      {/* 4. ARTISTER */}
      {allArtists.length > 0 && (
        <section className="section-chapter section-bg-artists">
          <h2 className="section-title">Artister</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allArtists.map((project) => {
              if (!project) return null;
              return (
                <Link 
                  key={project.id} 
                  to={`/project/${project.slug}`}
                  className="group block"
                >
                  {project.hero_image_url && (
                    <div className="aspect-square mb-4 overflow-hidden">
                      <img 
                        src={project.hero_image_url} 
                        alt={project.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  )}
                  <h3 className="text-display text-xl group-hover:text-accent transition-colors">
                    {project.name}
                  </h3>
                  {project.tagline && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {project.tagline}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground/60 mt-3 inline-block group-hover:text-accent transition-colors">
                    Les mer →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. VENUE */}
      {venue && (
        <section className="section-chapter section-bg-venue">
          <HeroSection imageUrl={venue.hero_image_url || undefined} compact>
            <div className="max-w-xl">
              <h2 className="section-title">Venue</h2>
              <h3 className="text-display text-3xl md:text-4xl mb-4">{venue.name}</h3>
              {venue.description && (
                <p className="text-foreground/70 text-base leading-relaxed mb-6">
                  {venue.description}
                </p>
              )}
              
              {/* Tidslinje */}
              <div className="space-y-2 text-mono text-sm text-muted-foreground mt-8 border-l border-border/30 pl-4">
                {validEvents.map((fe) => {
                  if (!fe.event) return null;
                  const startTime = new Date(fe.event.start_at);
                  return (
                    <div key={fe.event_id} className="py-1">
                      <span className="text-accent">{format(startTime, "HH:mm")}</span>
                      <span className="mx-2">→</span>
                      <span>{fe.event.title}</span>
                    </div>
                  );
                })}
              </div>

              {venue.slug && (
                <Link 
                  to={`/venue/${venue.slug}`}
                  className="inline-block mt-6 text-sm text-muted-foreground hover:text-accent transition-colors"
                >
                  Utforsk venue →
                </Link>
              )}
            </div>
          </HeroSection>
        </section>
      )}

      {/* 6. PRAKTISK */}
      <section className="section-chapter section-bg-practical">
        <h2 className="section-title">Praktisk</h2>
        <div className="space-y-3 text-foreground/80 mb-8 max-w-md">
          <p className="flex justify-between border-b border-border/20 pb-2">
            <span className="text-muted-foreground">Dører åpner</span>
            <span>20:00</span>
          </p>
          <p className="flex justify-between border-b border-border/20 pb-2">
            <span className="text-muted-foreground">Aldersgrense</span>
            <span>18 år</span>
          </p>
          <p className="flex justify-between border-b border-border/20 pb-2">
            <span className="text-muted-foreground">Billetter</span>
            <span>Dør eller forhåndsbestill</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="btn-accent text-center">
            Kjøp billett
          </button>
          <button className="btn-ghost text-center">
            Følg festivalen
          </button>
        </div>
      </section>

      <div className="accent-line" />

      {/* 7. FOOTER */}
      <footer className="section-chapter section-bg-footer">
        <div className="max-w-xl">
          <h2 className="text-display text-2xl mb-4">Giggen</h2>
          <p className="text-muted-foreground text-sm mb-8">
            En plattform for levende musikk og opplevelser.
          </p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link to="/explore" className="text-foreground/60 hover:text-accent transition-colors">
              Utforsk
            </Link>
            <Link to="/explore" className="text-foreground/60 hover:text-accent transition-colors">
              Artister
            </Link>
            <Link to="/explore" className="text-foreground/60 hover:text-accent transition-colors">
              Kommende events
            </Link>
          </div>
        </div>
      </footer>
    </PageLayout>
  );
}
