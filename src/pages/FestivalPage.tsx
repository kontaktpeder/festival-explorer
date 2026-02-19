import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { FestivalEventAccordion } from "@/components/ui/FestivalEventAccordion";
import { SectionRenderer } from "@/components/festival/SectionRenderer";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { DualLineupSection } from "@/components/festival/DualLineupSection";
import giggenLogo from "@/assets/giggen-logo.png";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";

export default function FestivalPage() {
  const { slug } = useParams<{ slug: string }>();
  const festivalSlug = slug || "giggen-festival-for-en-kveld";

  // Shell loads fast: festival metadata + sections → render hero immediately
  const { data: shell, isLoading: shellLoading, error: shellError } = useFestivalShell(festivalSlug);

  // Details load after shell: events, lineup, team
  const { data: details } = useFestivalDetails(shell?.id);

  const { data: venue } = useQuery({
    queryKey: ["venue", shell?.venue_id],
    queryFn: async () => {
      if (!shell?.venue_id) return null;
      const { data } = await supabase.from("venues").select("*").eq("id", shell.venue_id).eq("is_published", true).maybeSingle();
      return data;
    },
    enabled: !!shell?.venue_id,
  });

  const themeHeroUrl = useSignedMediaUrl(shell?.theme?.hero_image_url, 'public');
  const venueHeroUrl = useSignedMediaUrl(venue?.hero_image_url, 'public');

  if (shellLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster festival..." />
      </PageLayout>
    );
  }

  if (shellError || !shell) {
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
    shell.start_at && shell.end_at
      ? `${format(new Date(shell.start_at), "d. MMM", { locale: nb })} – ${format(new Date(shell.end_at), "d. MMM yyyy", { locale: nb })}`
      : shell.start_at
        ? format(new Date(shell.start_at), "d. MMMM yyyy", { locale: nb })
        : null;

  const heroImage = themeHeroUrl || undefined;

  const validEvents = (details?.festivalEvents || []).filter(
    (fe) => fe.event && fe.event.status === "published"
  );
  const allArtistsWithEventSlug = details?.allArtistsWithEventSlug || [];
  const festivalTeam = details?.festivalTeam;

  const shortDescription = shell.description
    ? shell.description.split(" ").slice(0, 15).join(" ") +
      (shell.description.split(" ").length > 15 ? "..." : "")
    : null;

  // Sections-based render
  if (shell.sections && shell.sections.length > 0) {
    return (
      <PageLayout>
        <StaticLogo heroMode />
        {shell.sections.map((section) => {
          const showDateRange = section.id === shell.date_range_section_id ? dateRange : null;
          const showDescription = section.id === shell.description_section_id ? shortDescription : null;
          const showName = section.id === shell.name_section_id ? shell.name : null;

          if (section.type === "hero") {
            const heroFitMode = (section.image_fit_mode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain';
            const sectionImageSettings = parseImageSettings(section.bg_image_settings);
            return (
              <HeroSection
                key={section.id}
                imageUrl={section.bg_image_url_desktop || section.bg_image_url || heroImage}
                imageUrlMobile={section.bg_image_url_mobile || section.bg_image_url || heroImage}
                imageSettings={sectionImageSettings}
                fullScreen
                backgroundFixed={section.bg_mode === "fixed"}
                imageFitMode={heroFitMode}
                useNaturalAspect
              >
                <div>
                  {showDateRange && (
                    <div className="animate-slide-up text-mono text-[10px] md:text-xs uppercase tracking-[0.2em] text-accent/70 mb-4">
                      {showDateRange}
                    </div>
                  )}
                  {showName && (
                    <h1 className="animate-slide-up delay-100 text-display text-hero text-balance">{showName}</h1>
                  )}
                  {showDescription && (
                    <p className="animate-slide-up delay-200 text-foreground/50 text-base md:text-lg max-w-sm leading-relaxed mt-4">
                      {showDescription}
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
              validEvents={validEvents as any}
              featuredArtists={allArtistsWithEventSlug}
              venue={venue}
              dateRange={showDateRange}
              festivalDescription={showDescription}
              festivalName={showName}
              festivalTeam={festivalTeam}
            />
          );
        })}
        <div className="fixed bottom-4 right-4 z-40">
          <Link to="/admin" className="text-muted-foreground/20 hover:text-muted-foreground/40 transition-colors" title="Admin">
            <Settings className="w-3 h-3" />
          </Link>
        </div>
      </PageLayout>
    );
  }

  // Fallback hardcoded layout
  const sectionBackgrounds = {
    program: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920",
    about: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920",
    practical: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920",
    footer: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920",
  };

  const fallbackArtists = allArtistsWithEventSlug.length > 0
    ? allArtistsWithEventSlug
    : [
        { id: "1", name: "Lunar Echo", tagline: "Ambient soundscapes", slug: "lunar-echo", event_slug: "festival" },
        { id: "2", name: "Erik Nordahl", tagline: "Electronic experiments", slug: "erik-nordahl", event_slug: "festival" },
        { id: "3", name: "Neon Shapes", tagline: "Live eksperiment", slug: "neon-shapes", event_slug: "festival" },
      ];

  return (
    <PageLayout>
      <StaticLogo heroMode />
      <HeroSection imageUrl={heroImage} imageSettings={parseImageSettings(shell?.theme?.hero_image_settings)} fullScreen backgroundFixed>
        <div className="animate-slide-up pb-8">
          {dateRange && <div className="text-mono text-accent mb-3">{dateRange}</div>}
          <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{shell.name}</h1>
          {shortDescription && <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed">{shortDescription}</p>}
        </div>
      </HeroSection>

      <section className="fullscreen-section relative" id="program" style={{ backgroundImage: `url(${sectionBackgrounds.program})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h2 className="section-title">Program</h2>
          {validEvents.length > 0
            ? <FestivalEventAccordion events={validEvents as any} />
            : <EmptyState title="Ingen events ennå" description="Programmet for denne festivalen er ikke klart ennå." />}
        </div>
      </section>

      <section className="fullscreen-section relative" style={{ backgroundImage: `url(${sectionBackgrounds.about})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="relative z-10 max-w-xl">
          <h2 className="section-title">Om Giggen</h2>
          <div className="space-y-4 text-foreground/90 text-xl md:text-2xl leading-relaxed">
            <p>Giggen er et rom for levende musikk.</p>
            <p>Vi bygger der det vanligvis ikke bygges.</p>
            <p className="text-muted-foreground">Dette er første kapittel.</p>
          </div>
        </div>
      </section>

      <DualLineupSection artists={fallbackArtists} festivalTeam={festivalTeam} />

      <section className="fullscreen-section-end relative" style={{ backgroundImage: `url(${venueHeroUrl || sectionBackgrounds.about})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="relative z-10 max-w-xl">
          <h2 className="section-title">Venue</h2>
          {venue ? (
            <>
              <h3 className="text-display text-4xl md:text-5xl mb-4">{venue.name}</h3>
              {venue.description && <p className="text-foreground/70 text-lg leading-relaxed mb-6">{venue.description}</p>}
              {venue.slug && <Link to={`/venue/${venue.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors">Utforsk venue →</Link>}
            </>
          ) : (
            <p className="text-foreground/60">Venue-informasjon kommer snart.</p>
          )}
        </div>
      </section>

      <section className="fullscreen-section relative" style={{ backgroundImage: `url(${sectionBackgrounds.practical})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="relative z-10 max-w-md">
          <h2 className="section-title">Praktisk</h2>
          <div className="space-y-4 text-foreground/80 text-lg mb-10">
            <p>Dører åpner: 20:00</p>
            <p>Aldersgrense: 18 år</p>
            <p>Billetter: Kjøp på døren eller forhåndsbestill</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/tickets" className={`btn-accent text-center ${!TICKET_SALES_ENABLED ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`} onClick={(e) => { if (!TICKET_SALES_ENABLED) e.preventDefault(); }}>
              Kjøp billett
            </Link>
            <button className="btn-ghost text-center">Følg festivalen</button>
          </div>
        </div>
      </section>

      {(festivalTeam?.hostRoles?.length > 0 || festivalTeam?.backstage?.length > 0) && (
        <section className="fullscreen-section relative bg-background">
          <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 md:py-28">
            <h2 className="section-title">Bli kjent med festival-teamet</h2>
            <p className="text-foreground/70 text-base md:text-lg mb-10 max-w-xl">Folkene bak scenen som får festivalen til å skje.</p>
            <div className="space-y-6">
              {[...(festivalTeam.hostRoles || []), ...(festivalTeam.backstage || [])]
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((item: any, i: number) => {
                  const displayRole = item.role_label || getPersonaTypeLabel(item.persona?.type) || (item.persona?.category_tags && item.persona.category_tags[0]) || item.entity?.type || null;
                  return (
                    <div key={item.participant_id || i} className="flex flex-col gap-1">
                      {displayRole && <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{displayRole}</p>}
                      <EventParticipantItem item={item} />
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      <footer className="fullscreen-section relative" style={{ backgroundImage: `url(${sectionBackgrounds.footer})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
        <div className="relative z-10 max-w-xl">
          <img src={giggenLogo} alt="Giggen" className="h-32 md:h-40 w-auto mb-6" />
          <p className="text-muted-foreground text-lg mb-8">En plattform for levende musikk og opplevelser.</p>
          <div className="flex flex-wrap gap-6 text-sm mb-8">
            <span className="text-foreground/60">Utforsk</span>
            <span className="text-foreground/60">Artister</span>
            <span className="text-foreground/60">Kommende events</span>
          </div>
          <div className="pt-4 border-t border-border/10">
            <Link to="/admin" className="text-muted-foreground/20 hover:text-muted-foreground/40 transition-colors" title="Admin">
              <Settings className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </footer>
    </PageLayout>
  );
}
