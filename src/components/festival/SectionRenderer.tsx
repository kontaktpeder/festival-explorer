import { Link } from "react-router-dom";
import { FestivalEventAccordion } from "@/components/ui/FestivalEventAccordion";
import { EmptyState } from "@/components/ui/LoadingState";
import { ParallaxBackground } from "@/components/ui/ParallaxBackground";
import { MobileFadeOverlay } from "@/components/ui/MobileFadeOverlay";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import giggenLogo from "@/assets/giggen-logo.png";
import type { Json } from "@/integrations/supabase/types";

interface FestivalSection {
  id: string;
  type: string;
  title: string;
  bg_image_url?: string | null;
  bg_image_url_desktop?: string | null;
  bg_image_url_mobile?: string | null;
  bg_mode: string;
  overlay_strength?: number | null;
  content_json?: Json | null;
  image_fit_mode?: string | null;
}

interface SectionRendererProps {
  section: FestivalSection;
  validEvents: Array<{
    event: {
      id: string;
      title: string;
      slug: string;
      start_at: string;
      description?: string | null;
      venue?: { name: string } | null;
      lineup?: Array<{ project?: { name: string; slug: string } | null }>;
    } | null;
  }>;
  featuredArtists: Array<{
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
  }>;
  venue?: {
    name: string;
    slug?: string;
    description?: string | null;
    hero_image_url?: string | null;
  } | null;
  dateRange?: string | null;
  festivalDescription?: string | null;
  festivalName?: string | null;
}

function SectionBackground({ 
  section, 
  venueImage 
}: { 
  section: FestivalSection; 
  venueImage?: string | null;
}) {
  const activeImage = useResponsiveImage({
    desktopUrl: section.bg_image_url_desktop,
    mobileUrl: section.bg_image_url_mobile,
    fallbackUrl: venueImage || section.bg_image_url,
  });

  if (!activeImage) return null;

  const imageFitMode = (section.image_fit_mode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain';

  // Use parallax for fixed backgrounds (including footer)
  if (section.bg_mode === "fixed") {
    return (
      <ParallaxBackground
        imageUrl={section.bg_image_url_desktop || section.bg_image_url}
        imageUrlMobile={section.bg_image_url_mobile || section.bg_image_url}
        intensity={0.3}
        imageFitMode={imageFitMode}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 bg-no-repeat ${imageFitMode === 'contain' ? 'bg-contain bg-top' : 'bg-cover bg-center'}`}
      style={{ backgroundImage: `url(${activeImage})` }}
    />
  );
}

export function SectionRenderer({
  section,
  validEvents,
  featuredArtists,
  venue,
  dateRange,
  festivalDescription,
  festivalName,
}: SectionRendererProps) {
  const rawContentJson = section.content_json as Record<string, unknown> | null;
  
  // Support both new structure {content: {...}, presentation: {...}} and legacy
  const contentJson = (rawContentJson?.content as Record<string, unknown>) || rawContentJson;
  const presentation = rawContentJson?.presentation as Record<string, unknown> | null;

  // Helper to get text content (supports legacy fields)
  const getText = () => (contentJson?.text || contentJson?.intro || contentJson?.info || contentJson?.description || "") as string;
  
  // Get selected events/artists/venue from content
  const selectedEventIds = (contentJson?.events as string[]) || [];
  const selectedArtistIds = (contentJson?.artists as string[]) || [];
  const selectedVenueId = contentJson?.venue as string | null;

  // Render basert på type
  switch (section.type) {
    case "program": {
      // Filter events based on selection, or show all if none selected
      const programEvents = selectedEventIds.length > 0
        ? validEvents.filter((fe) => fe.event && selectedEventIds.includes(fe.event.id))
        : validEvents;

      return (
        <section className="fullscreen-section relative" id="program">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 max-w-4xl mx-auto w-full">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <h2 className="section-title">{section.title || "Program"}</h2>
            {getText() && (
              <div 
                className="prose-rich-text text-foreground/80 text-lg mb-8"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
            {programEvents.length > 0 ? (
              <FestivalEventAccordion events={programEvents as any} />
            ) : (
              <EmptyState
                title="Ingen events ennå"
                description="Programmet for denne festivalen er ikke klart ennå."
              />
            )}
          </div>
        </section>
      );
    }

    case "om":
      return (
        <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 max-w-xl">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <h2 className="section-title">{section.title || "Om Giggen"}</h2>
            {getText() && (
              <div 
                className="prose-rich-text text-foreground/90 text-xl md:text-2xl leading-relaxed"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
          </div>
        </section>
      );

    case "artister": {
      // Filter artists based on selection, or show all if none selected
      const displayedArtists = selectedArtistIds.length > 0
        ? featuredArtists.filter((a) => selectedArtistIds.includes(a.id))
        : featuredArtists;

      return (
        <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 max-w-4xl mx-auto w-full">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <h2 className="section-title">{section.title || "Artister"}</h2>
            {getText() && (
              <div 
                className="prose-rich-text text-foreground/80 text-lg mb-8"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
            <div className="space-y-8">
              {displayedArtists.length > 0 ? (
                displayedArtists.map((artist) => (
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
                ))
              ) : (
                <p className="text-foreground/60 text-lg">
                  Artister kommer snart.
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "venue-plakat": {
      // Use selected venue or fallback to festival venue
      const displayedVenue = selectedVenueId 
        ? { ...venue, id: selectedVenueId } // This would need a proper lookup in real implementation
        : venue;

      return (
        <section className="fullscreen-section-end relative">
          <SectionBackground section={section} venueImage={displayedVenue?.hero_image_url} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 max-w-xl">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <h2 className="section-title">{section.title || "Venue"}</h2>
            {getText() && (
              <div 
                className="prose-rich-text text-foreground/80 text-lg mb-8"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
            {displayedVenue ? (
              <>
                <h3 className="text-display text-4xl md:text-5xl mb-4">
                  {displayedVenue.name}
                </h3>
                {displayedVenue.description && (
                  <p className="text-foreground/70 text-lg leading-relaxed mb-6">
                    {displayedVenue.description}
                  </p>
                )}
                {displayedVenue.slug && (
                  <Link
                    to={`/venue/${displayedVenue.slug}`}
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
      );
    }

    case "praktisk":
      return (
        <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 max-w-md">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <h2 className="section-title">{section.title || "Praktisk"}</h2>
            {getText() && (
              <div 
                className="prose-rich-text text-foreground/80 text-lg mb-10"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-accent text-center">Kjøp billett</button>
              <button className="btn-ghost text-center">Følg festivalen</button>
            </div>
          </div>
        </section>
      );

    case "footer":
      return (
        <footer className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />

          <div className="relative z-10 max-w-xl">
            {festivalName && (
              <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">{festivalName}</h1>
            )}
            {dateRange && (
              <div className="text-mono text-accent mb-6">{dateRange}</div>
            )}
            {festivalDescription && (
              <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                {festivalDescription}
              </p>
            )}
            <img
              src={giggenLogo}
              alt="Giggen"
              className="h-16 md:h-20 w-auto mb-6"
            />
            {getText() ? (
              <div 
                className="prose-rich-text text-muted-foreground text-lg mb-8"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            ) : (
              <p className="text-muted-foreground text-lg mb-8">
                En plattform for levende musikk og opplevelser.
              </p>
            )}
            <div className="flex flex-wrap gap-6 text-sm">
              <Link
                to="/search?type=event"
                className="text-foreground/60 hover:text-accent transition-colors"
              >
                Events
              </Link>
              <Link
                to="/search?type=project"
                className="text-foreground/60 hover:text-accent transition-colors"
              >
                Artister
              </Link>
              <Link
                to="/search?type=venue"
                className="text-foreground/60 hover:text-accent transition-colors"
              >
                Venues
              </Link>
            </div>
          </div>
        </footer>
      );

    default:
      return null;
  }
}
