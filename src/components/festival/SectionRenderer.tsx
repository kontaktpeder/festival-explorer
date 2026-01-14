import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { EmptyState } from "@/components/ui/LoadingState";
import { ParallaxBackground } from "@/components/ui/ParallaxBackground";
import { MobileFadeOverlay } from "@/components/ui/MobileFadeOverlay";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import giggenLogo from "@/assets/giggen-logo.png";
import type { Json } from "@/integrations/supabase/types";
// Default section background images
import sectionBgProgram from "@/assets/section-bg-program.png";
import sectionBgOm from "@/assets/section-bg-om.png";
import sectionBgArtister from "@/assets/section-bg-artister.png";
import sectionBgVenue from "@/assets/section-bg-venue.png";
import sectionBgPraktisk from "@/assets/section-bg-praktisk.png";
import sectionBgFooter from "@/assets/section-bg-footer.png";

// Map section types to default backgrounds
const DEFAULT_SECTION_BACKGROUNDS: Record<string, string> = {
  program: sectionBgProgram,
  om: sectionBgOm,
  artister: sectionBgArtister,
  "venue-plakat": sectionBgVenue,
  praktisk: sectionBgPraktisk,
  footer: sectionBgFooter,
};

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
  const defaultBackground = DEFAULT_SECTION_BACKGROUNDS[section.type] || null;
  
  const activeImage = useResponsiveImage({
    desktopUrl: section.bg_image_url_desktop,
    mobileUrl: section.bg_image_url_mobile,
    fallbackUrl: venueImage || section.bg_image_url || defaultBackground,
  });

  if (!activeImage) return null;

  const imageFitMode = (section.image_fit_mode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain';

  if (section.bg_mode === "fixed") {
    return (
      <ParallaxBackground
        imageUrl={section.bg_image_url_desktop || section.bg_image_url || defaultBackground}
        imageUrlMobile={section.bg_image_url_mobile || section.bg_image_url || defaultBackground}
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
  const contentJson = (rawContentJson?.content as Record<string, unknown>) || rawContentJson;

  const getText = () => (contentJson?.text || contentJson?.intro || contentJson?.info || contentJson?.description || "") as string;
  
  // Kun venue bruker content_json filtrering - events og artister viser alltid alle
  const selectedVenueId = contentJson?.venue as string | null;

  switch (section.type) {
    case "program": {
      // Vis ALLE events fra festivalen
      const programEvents = validEvents.filter((fe) => fe.event);

      return (
        <section className="fullscreen-section relative" id="program">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-lg mx-auto px-5">
            {/* Header */}
            <h2 className="animate-slide-up text-display text-section-title mb-10">
              {section.title || "Program"}
            </h2>
            
            {/* Event list - samme stil som artister */}
            <div className="space-y-6">
              {programEvents.length > 0 ? (
                programEvents.map((fe, i) => {
                  if (!fe.event) return null;
                  
                  const startTime = new Date(fe.event.start_at);
                  const eventDate = format(startTime, "d. MMM", { locale: nb });
                  const eventTime = format(startTime, "HH:mm", { locale: nb });
                  
                  return (
                    <Link
                      key={fe.event.id}
                      to={`/event/${fe.event.slug}`}
                      className={`animate-slide-up block group py-4 border-b border-foreground/10 last:border-0`}
                      style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                    >
                      <h3 className="text-display text-2xl md:text-3xl text-foreground/90 group-hover:text-accent transition-colors duration-300">
                        {fe.event.title}
                      </h3>
                      
                      {/* Dato, klokkeslett og venue */}
                      <p className="text-foreground/40 text-sm mt-1 group-hover:text-foreground/60 transition-colors flex items-center gap-2">
                        <span>{eventDate}</span>
                        <span className="text-foreground/20">•</span>
                        <span>{eventTime}</span>
                        {fe.event.venue && (
                          <>
                            <span className="text-foreground/20">•</span>
                            <span>{fe.event.venue.name}</span>
                          </>
                        )}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <p className="text-foreground/40 text-base">
                  Programmet kommer snart.
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "om":
      return (
        <section className="fullscreen-section relative overflow-hidden">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-lg mx-auto px-5 text-center">
            {/* Simple elegant title */}
            <h2 className="animate-blur-in text-display text-section-title mb-8">
              {section.title || "Om Giggen"}
            </h2>
            
            {/* Accent line */}
            <div className="animate-line-grow delay-200 h-px w-16 mx-auto bg-accent/60 mb-8 origin-center" />
            
            {/* Content */}
            {getText() && (
              <div 
                className="animate-slide-up delay-300 prose-rich-text text-foreground/70 text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
          </div>
        </section>
      );

    case "artister": {
      // Vis ALLE artister fra festivalen
      return (
        <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-lg mx-auto px-5">
            {/* Header */}
            <h2 className="animate-slide-up text-display text-section-title mb-10">
              {section.title || "Artister"}
            </h2>
            
            {/* Artist list - clean stacked layout */}
            <div className="space-y-6">
              {featuredArtists.length > 0 ? (
                featuredArtists.map((artist, i) => (
                  <Link
                    key={artist.id}
                    to={`/project/${artist.slug}`}
                    className={`animate-slide-up block group py-4 border-b border-foreground/10 last:border-0`}
                    style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                  >
                    <h3 className="text-display text-2xl md:text-3xl text-foreground/90 group-hover:text-accent transition-colors duration-300">
                      {artist.name}
                    </h3>
                    {artist.tagline && (
                      <p className="text-foreground/40 text-sm mt-1 group-hover:text-foreground/60 transition-colors">
                        {artist.tagline}
                      </p>
                    )}
                  </Link>
                ))
              ) : (
                <p className="text-foreground/40 text-base">
                  Artister kommer snart.
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "venue-plakat": {
      const displayedVenue = selectedVenueId 
        ? { ...venue, id: selectedVenueId }
        : venue;

      return (
        <section className="fullscreen-section relative flex items-end">
          <SectionBackground section={section} venueImage={displayedVenue?.hero_image_url} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-md px-5 pb-12">
            {displayedVenue ? (
              <>
                <p className="animate-slide-up text-mono text-xs text-accent/70 mb-3 uppercase tracking-widest">
                  Venue
                </p>
                <h3 className="animate-slide-up delay-100 text-display text-section-title mb-4">
                  {displayedVenue.name}
                </h3>
                {displayedVenue.description && (
                  <p className="animate-slide-up delay-200 text-foreground/50 text-base leading-relaxed mb-6 max-w-xs">
                    {displayedVenue.description}
                  </p>
                )}
                {displayedVenue.slug && (
                  <Link
                    to={`/venue/${displayedVenue.slug}`}
                    className="animate-slide-up delay-300 inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-accent transition-colors group"
                  >
                    <span>Utforsk venue</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                )}
              </>
            ) : (
              <p className="text-foreground/40">
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

          <div className="relative z-10 w-full max-w-sm px-5">
            <h2 className="animate-slide-up text-display text-section-title mb-6">
              {section.title || "Praktisk"}
            </h2>
            
            {getText() && (
              <div 
                className="animate-slide-up delay-100 prose-rich-text text-foreground/60 text-base leading-relaxed mb-10"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            )}
            
            <div className="animate-slide-up delay-200 flex flex-col gap-3">
              <button className="btn-accent w-full text-center py-4">
                Kjøp billett
              </button>
              <button className="btn-ghost w-full text-center py-3 text-foreground/60">
                Følg festivalen
              </button>
            </div>
          </div>
        </section>
      );

    case "footer":
      return (
        <footer className="fullscreen-section relative flex items-end">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />

          <div className="relative z-10 w-full max-w-md px-5 pb-8">
            {/* Logo */}
            <img
              src={giggenLogo}
              alt="Giggen"
              className="animate-slide-up h-10 w-auto mb-5 opacity-80"
            />
            
            {/* Tagline */}
            {getText() ? (
              <div 
                className="animate-slide-up delay-100 prose-rich-text text-foreground/50 text-sm leading-relaxed mb-6 max-w-xs"
                dangerouslySetInnerHTML={{ __html: getText() }}
              />
            ) : (
              <p className="animate-slide-up delay-100 text-foreground/50 text-sm leading-relaxed mb-6 max-w-xs">
                Et engasjement for å løfte frem dem som jobber med eksisterende musikkarenaer, og dem som ønsker å skape nye.
              </p>
            )}
            
            {/* Minimal links */}
            <div className="animate-slide-up delay-200 flex gap-6 text-xs text-foreground/30">
              <Link to="/search?type=event" className="hover:text-foreground/60 transition-colors">
                Events
              </Link>
              <Link to="/search?type=project" className="hover:text-foreground/60 transition-colors">
                Artister
              </Link>
              <Link to="/search?type=venue" className="hover:text-foreground/60 transition-colors">
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
