import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFestival } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { FestivalEventAccordion } from "@/components/ui/FestivalEventAccordion";
import { SectionRenderer } from "@/components/festival/SectionRenderer";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import giggenLogo from "@/assets/giggen-logo.png";

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

  // Hent featured artists fra event_projects.is_featured
  const { data: featuredArtists = [] } = useQuery({
    queryKey: ["featured-artists", festival?.id],
    queryFn: async () => {
      if (!festival?.id) return [];

      // Hent alle festival events
      const { data: festivalEvents } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festival.id);

      if (!festivalEvents || festivalEvents.length === 0) return [];

      const eventIds = festivalEvents
        .map((fe) => fe.event_id)
        .filter(Boolean) as string[];

      // Hent featured projects fra event_projects
      const { data: eventProjects } = await supabase
        .from("event_projects")
        .select("*, project:projects(*)")
        .in("event_id", eventIds)
        .eq("is_featured", true)
        .order("feature_order", { ascending: true });

      if (!eventProjects) return [];

      // Unike projects (kan være i flere events)
      const uniqueProjects = eventProjects
        .map((ep) => ep.project)
        .filter(
          (project, index, self) =>
            project && self.findIndex((p) => p?.id === project.id) === index
        )
        .map((project) => ({
          id: project!.id,
          name: project!.name,
          slug: project!.slug,
          tagline: project!.tagline,
        }));

      return uniqueProjects;
    },
    enabled: !!festival?.id,
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

  const shortDescription = festival.description
    ? festival.description.split(" ").slice(0, 15).join(" ") +
      (festival.description.split(" ").length > 15 ? "..." : "")
    : null;

  // Hvis festival har sections i database, bruk dem
  if (festival.sections && festival.sections.length > 0) {
    return (
      <PageLayout>
        {/* Logo overlay (alltid øverst) */}
        <Link to="/explore" className="fixed top-4 left-4 z-50">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-10 md:h-12 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* Render sections dynamisk */}
        {festival.sections.map((section) => {
          // Spesialhåndtering for hero (må ha logo og festival-info)
          if (section.type === "hero") {
            return (
              <HeroSection
                key={section.id}
                imageUrl={section.bg_image_url || heroImage}
                fullScreen
                backgroundFixed={section.bg_mode === "fixed"}
              >
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
            );
          }

          return (
            <SectionRenderer
              key={section.id}
              section={section}
              validEvents={validEvents}
              featuredArtists={featuredArtists}
              venue={venue}
            />
          );
        })}

        {/* Admin snarvei */}
        <Link
          to="/admin"
          className="fixed bottom-4 right-4 z-50 p-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          title="Admin"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </PageLayout>
    );
  }

  // Fallback: Hardkodede seksjoner hvis ingen i database (bakoverkompatibilitet)
  const sectionBackgrounds = {
    program:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920",
    about:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920",
    artists:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920",
    practical:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920",
    footer:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920",
  };

  // Fallback featured artists (hvis ingen i database)
  const fallbackArtists =
    featuredArtists.length > 0
      ? featuredArtists
      : [
          {
            id: "1",
            name: "Lunar Echo",
            tagline: "Ambient soundscapes",
            slug: "lunar-echo",
          },
          {
            id: "2",
            name: "Erik Nordahl",
            tagline: "Electronic experiments",
            slug: "erik-nordahl",
          },
          {
            id: "3",
            name: "Neon Shapes",
            tagline: "Live eksperiment",
            slug: "neon-shapes",
          },
        ];

  return (
    <PageLayout>
      {/* SEKSJON 1: HERO - Fullskjerm, bg-fixed */}
      <HeroSection imageUrl={heroImage} fullScreen backgroundFixed>
        {/* Logo oppe til venstre */}
        <Link to="/explore" className="absolute top-4 left-4 z-20">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-10 md:h-12 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>

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

      {/* SEKSJON 2: PROGRAM - Fullskjerm, bg-scroll */}
      <section
        className="fullscreen-section relative"
        id="program"
        style={{
          backgroundImage: `url(${sectionBackgrounds.program})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h2 className="section-title">Program</h2>
          {validEvents.length > 0 ? (
            <FestivalEventAccordion events={validEvents as any} />
          ) : (
            <EmptyState
              title="Ingen events ennå"
              description="Programmet for denne festivalen er ikke klart ennå."
            />
          )}
        </div>
      </section>

      {/* SEKSJON 3: OM GIGGEN - Fullskjerm, bg-fixed */}
      <section
        className="fullscreen-section relative"
        style={{
          backgroundImage: `url(${sectionBackgrounds.about})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-xl">
          <h2 className="section-title">Om Giggen</h2>
          <div className="space-y-4 text-foreground/90 text-xl md:text-2xl leading-relaxed">
            <p>Giggen er et rom for levende musikk.</p>
            <p>Vi bygger der det vanligvis ikke bygges.</p>
            <p className="text-muted-foreground">Dette er første kapittel.</p>
          </div>
        </div>
      </section>

      {/* SEKSJON 4: ARTISTER - Fullskjerm, bg-scroll */}
      <section
        className="fullscreen-section relative"
        style={{
          backgroundImage: `url(${sectionBackgrounds.artists})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h2 className="section-title">Artister</h2>
          <div className="space-y-8">
            {fallbackArtists.map((artist) => (
              <Link
                key={artist.id}
                to={`/project/${artist.slug}`}
                className="block group"
              >
                <h3 className="text-display text-3xl md:text-4xl group-hover:text-accent transition-colors">
                  {artist.name}
                </h3>
                {artist.tagline && (
                  <p className="text-muted-foreground text-lg mt-1">
                    {artist.tagline}
                  </p>
                )}
                <span className="text-sm text-muted-foreground/60 mt-2 inline-block group-hover:text-accent transition-colors">
                  Les mer →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SEKSJON 5: VENUE-PLAKAT - Fullskjerm, bg-fixed */}
      <section
        className="fullscreen-section-end relative"
        style={{
          backgroundImage: `url(${venue?.hero_image_url || sectionBackgrounds.about})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-xl">
          <h2 className="section-title">Venue</h2>
          {venue ? (
            <>
              <h3 className="text-display text-4xl md:text-5xl mb-4">
                {venue.name}
              </h3>
              {venue.description && (
                <p className="text-foreground/70 text-lg leading-relaxed mb-6">
                  {venue.description}
                </p>
              )}
              {venue.slug && (
                <Link
                  to={`/venue/${venue.slug}`}
                  className="text-sm text-muted-foreground hover:text-accent transition-colors"
                >
                  Utforsk venue →
                </Link>
              )}
            </>
          ) : (
            <p className="text-foreground/60">
              Venue-informasjon kommer snart.
            </p>
          )}
        </div>
      </section>

      {/* SEKSJON 6: PRAKTISK - Fullskjerm, bg-scroll */}
      <section
        className="fullscreen-section relative"
        style={{
          backgroundImage: `url(${sectionBackgrounds.practical})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-md">
          <h2 className="section-title">Praktisk</h2>
          <div className="space-y-4 text-foreground/80 text-lg mb-10">
            <p>Dører åpner: 20:00</p>
            <p>Aldersgrense: 18 år</p>
            <p>Billetter: Kjøp på døren eller forhåndsbestill</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="btn-accent text-center">Kjøp billett</button>
            <button className="btn-ghost text-center">Følg festivalen</button>
          </div>
        </div>
      </section>

      {/* SEKSJON 7: FOOTER - Fullskjerm, bg-fixed */}
      <footer
        className="fullscreen-section relative"
        style={{
          backgroundImage: `url(${sectionBackgrounds.footer})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 section-grain pointer-events-none z-[1]" />
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="absolute inset-0 section-gradient pointer-events-none z-[3]" />

        <div className="relative z-10 max-w-xl">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-16 md:h-20 w-auto mb-6"
          />
          <p className="text-muted-foreground text-lg mb-8">
            En plattform for levende musikk og opplevelser.
          </p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link
              to="/explore"
              className="text-foreground/60 hover:text-accent transition-colors"
            >
              Utforsk
            </Link>
            <Link
              to="/explore"
              className="text-foreground/60 hover:text-accent transition-colors"
            >
              Artister
            </Link>
            <Link
              to="/explore"
              className="text-foreground/60 hover:text-accent transition-colors"
            >
              Kommende events
            </Link>
          </div>
        </div>

        {/* Admin snarvei */}
        <Link
          to="/admin"
          className="fixed bottom-4 right-4 z-50 p-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          title="Admin"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </footer>
    </PageLayout>
  );
}
