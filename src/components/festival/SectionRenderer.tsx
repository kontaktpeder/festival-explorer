import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { EmptyState } from "@/components/ui/LoadingState";
import { ParallaxBackground } from "@/components/ui/ParallaxBackground";
import { MobileFadeOverlay } from "@/components/ui/MobileFadeOverlay";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import giggenLogo from "@/assets/giggen-logo.png";
import type { Json } from "@/integrations/supabase/types";
// NOTE: Default section background images removed to allow black backgrounds
// If no image is set, the section will have a black background

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
  // No default fallback - allows black backgrounds when no image is set
  const activeImage = useResponsiveImage({
    desktopUrl: section.bg_image_url_desktop,
    mobileUrl: section.bg_image_url_mobile,
    fallbackUrl: venueImage || section.bg_image_url || null,
  });

  // If no image, return null (black background)
  if (!activeImage) return null;

  const imageFitMode = (section.image_fit_mode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain';

  // Check if the image is a GIF (animated images need special handling)
  const desktopImage = section.bg_image_url_desktop || section.bg_image_url || "";
  const mobileImage = section.bg_image_url_mobile || section.bg_image_url || "";
  const isGif = activeImage.toLowerCase().includes('.gif') || 
                desktopImage.toLowerCase().includes('.gif') || 
                mobileImage.toLowerCase().includes('.gif');

  if (section.bg_mode === "fixed") {
    return (
      <ParallaxBackground
        imageUrl={desktopImage}
        imageUrlMobile={mobileImage}
        intensity={0.3}
        imageFitMode={imageFitMode}
        isAnimated={isGif}
      />
    );
  }

  // Use <img> tag for all images to ensure GIF animations work
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img 
        src={activeImage}
        alt=""
        className={`w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
        style={{ 
          objectPosition: imageFitMode === 'contain' ? 'center top' : 'center center',
        }}
      />
    </div>
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
                      
                      {/* Lineup */}
                      {fe.event.lineup && fe.event.lineup.length > 0 && (
                        <p className="text-foreground/40 text-sm mt-1 group-hover:text-foreground/60 transition-colors">
                          {fe.event.lineup
                            .filter(item => item.project?.name)
                            .map(item => item.project!.name)
                            .join(' • ')}
                        </p>
                      )}
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

          <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-16">
            {/* Editorial style content with Merriweather */}
            <div className="space-y-12" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              
              {/* Opening paragraph */}
              <p className="animate-blur-in text-foreground/80 text-lg md:text-xl leading-relaxed text-center italic">
                GIGGEN startet med et sterkt ønske om å spille mer musikk live. Etter hvert vokste det til et større engasjement – for alle som vil skape flere scener, eller løfte fram de som allerede finnes.
              </p>

              {/* Accent line */}
              <div className="animate-line-grow delay-200 h-px w-24 mx-auto bg-accent/50 origin-center" />

              {/* Section 1: Tankesett */}
              <div className="animate-slide-up delay-300 text-center space-y-4">
                <h3 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  GIGGEN er et tankesett.
                </h3>
                <p className="text-foreground/70 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                  Vi hyller de som tar beslutningene i egne hender. De som ikke venter på at jobber og muligheter skal bli servert, men skaper dem selv.
                </p>
              </div>

              {/* Section 2: Produkt */}
              <div className="animate-slide-up delay-400 text-center space-y-4">
                <h3 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Samtidig er GIGGEN et produkt.
                </h3>
                <p className="text-foreground/70 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                  I dag er det en plattform der du blant annet kan bli kjent med mini-festivalen vår.
                </p>
              </div>

              {/* Section 3: Festivalen */}
              <div className="animate-slide-up delay-500 text-center space-y-4">
                <p className="text-foreground/70 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                  Festivalen markerer starten på en ny måte å følge band, artister og musikere på. Du skal ikke trenge stipend, priser eller bransjestempel for å fortelle historien din. Og du skal ikke måtte forstå algoritmer eller kjempe om oppmerksomhet i et evig scroll.
                </p>
              </div>

              {/* Accent line */}
              <div className="animate-line-grow delay-600 h-px w-24 mx-auto bg-accent/50 origin-center" />

              {/* Closing statement */}
              <div className="animate-slide-up delay-700 text-center space-y-3">
                <p className="text-foreground text-xl md:text-2xl font-semibold">
                  Først og fremst er vi GIGGEN.
                </p>
                <p className="text-accent text-lg md:text-xl italic">
                  Og vi er klare for å gi musikkbransjen et friskt pust.
                </p>
              </div>
            </div>
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
              className="animate-slide-up h-20 w-auto mb-5 opacity-80"
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
