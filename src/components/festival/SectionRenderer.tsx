import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { EmptyState } from "@/components/ui/LoadingState";
import { ParallaxBackground } from "@/components/ui/ParallaxBackground";
import { MobileFadeOverlay } from "@/components/ui/MobileFadeOverlay";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getObjectPositionFromFocal } from "@/lib/image-crop-helpers";
import { parseImageSettings } from "@/types/database";
import giggenLogo from "@/assets/giggen-logo.png";
import type { Json } from "@/integrations/supabase/types";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
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
  /** JSONB crop/focal point settings for section background */
  bg_image_settings?: unknown | null;
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
      venue?: {
        name: string;
      } | null;
      lineup?: Array<{
        project?: {
          name: string;
          slug: string;
        } | null;
      }>;
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
  // Get signed URLs for section backgrounds
  const desktopUrl = useSignedMediaUrl(section.bg_image_url_desktop, 'public');
  const mobileUrl = useSignedMediaUrl(section.bg_image_url_mobile, 'public');
  const fallbackUrl = useSignedMediaUrl(venueImage || section.bg_image_url, 'public');

  // Responsive image selection with signed URLs
  const activeImage = useResponsiveImage({
    desktopUrl: desktopUrl || undefined,
    mobileUrl: mobileUrl || undefined,
    fallbackUrl: fallbackUrl || null
  });

  // If no image, return null (black background)
  if (!activeImage) return null;
  const imageFitMode = (section.image_fit_mode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain';
  if (section.bg_mode === "fixed") {
    return <ParallaxBackground imageUrl={desktopUrl || section.bg_image_url || ""} imageUrlMobile={mobileUrl || section.bg_image_url || ""} intensity={0.3} imageFitMode={imageFitMode} isAnimated={true} />;
  }

  // Parse image settings for focal point positioning
  const imageSettings = parseImageSettings(section.bg_image_settings);

  // Always use <img> tag to ensure GIF animations work (GIFs may have .jpg extension from storage)
  return <div className="absolute inset-0 overflow-hidden">
      <img src={activeImage} alt="" className={`w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`} style={{
      objectPosition: getObjectPositionFromFocal(imageSettings)
    }} />
    </div>;
}
export function SectionRenderer({
  section,
  validEvents,
  featuredArtists,
  venue,
  dateRange,
  festivalDescription,
  festivalName
}: SectionRendererProps) {
  const rawContentJson = section.content_json as Record<string, unknown> | null;
  const contentJson = rawContentJson?.content as Record<string, unknown> || rawContentJson;
  const getText = () => (contentJson?.text || contentJson?.intro || contentJson?.info || contentJson?.description || "") as string;

  // Kun venue bruker content_json filtrering - events og artister viser alltid alle
  const selectedVenueId = contentJson?.venue as string | null;
  switch (section.type) {
    case "program":
      {
        // Vis ALLE events fra festivalen, sortert kronologisk
        const programEvents = validEvents.filter(fe => fe.event).sort((a, b) => {
          if (!a.event || !b.event) return 0;
          const dateA = new Date(a.event.start_at).getTime();
          const dateB = new Date(b.event.start_at).getTime();
          return dateA - dateB;
        });
        return <section className="fullscreen-section relative" id="program">
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
              {programEvents.length > 0 ? programEvents.map((fe, i) => {
                if (!fe.event) return null;
                const startTime = new Date(fe.event.start_at);
                const eventDate = format(startTime, "d. MMM", {
                  locale: nb
                });
                const eventTime = format(startTime, "HH:mm", {
                  locale: nb
                });
                return <Link key={fe.event.id} to={`/event/${fe.event.slug}`} className={`animate-slide-up block group py-4 border-b border-foreground/10 last:border-0`} style={{
                  animationDelay: `${0.1 + i * 0.08}s`
                }}>
                      <h3 className="text-display text-2xl md:text-3xl text-foreground/90 group-hover:text-accent transition-colors duration-300">
                        {fe.event.title}
                      </h3>
                      
                      {/* Lineup */}
                      {fe.event.lineup && fe.event.lineup.length > 0 && <p className="text-foreground/40 text-sm mt-1 group-hover:text-foreground/60 transition-colors">
                          {fe.event.lineup.filter(item => item.project?.name).map(item => item.project!.name).join(' • ')}
                        </p>}
                    </Link>;
              }) : <p className="text-foreground/40 text-base">
                  Programmet kommer snart.
                </p>}
            </div>
          </div>
        </section>;
      }
    case "om":
      return <section className="fullscreen-section relative overflow-hidden">
          <SectionBackground section={section} />
          {/* Weaker overlay so text stands out */}
          <div className="absolute inset-0 bg-background/60 pointer-events-none z-[1]" />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-16">
            {/* Editorial style content with Crimson Pro serif */}
            <div className="space-y-12" style={{
            fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif"
          }}>
              
              {/* Opening paragraph */}
              <p className="animate-blur-in text-foreground/90 text-xl md:text-2xl leading-relaxed text-center italic font-light">
                GIGGEN startet med et sterkt ønske om å spille mer musikk live. Etter hvert vokste det til et større engasjement – for alle som vil skape flere scener, eller løfte fram de som allerede finnes.
              </p>

              {/* Accent line - orange */}
              <div className="animate-line-grow delay-200 h-0.5 w-24 mx-auto origin-center" style={{
              background: 'hsl(24 100% 55% / 0.6)'
            }} />

              {/* Section 1: Tankesett */}
              <div className="animate-slide-up delay-300 text-center space-y-4">
                <h3 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight" style={{
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                  GIGGEN er et tankesett.
                </h3>
                <p className="text-foreground/80 text-lg md:text-xl leading-relaxed max-w-xl mx-auto font-light">
                  Vi hyller de som tar beslutningene i egne hender. De som ikke venter på at jobber og muligheter skal bli servert, men skaper dem selv.
                </p>
              </div>

              {/* Section 2: Produkt */}
              <div className="animate-slide-up delay-400 text-center space-y-4">
                <h3 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight" style={{
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                  Samtidig er GIGGEN et produkt.
                </h3>
                <p className="text-foreground/80 text-lg md:text-xl leading-relaxed max-w-xl mx-auto font-light">
                  I dag er det en plattform der du blant annet kan bli kjent med mini-festivalen vår.
                </p>
              </div>

              {/* Section 3: Festivalen */}
              <div className="animate-slide-up delay-500 text-center space-y-4">
                <p className="text-foreground/80 text-lg md:text-xl leading-relaxed max-w-xl mx-auto font-light">
                  Festivalen markerer starten på en ny måte å følge band, artister og musikere på. Du skal ikke trenge stipend, priser eller bransjestempel for å fortelle historien din. Og du skal ikke måtte forstå algoritmer eller kjempe om oppmerksomhet i et evig scroll.
                </p>
              </div>

              {/* Accent line - orange */}
              <div className="animate-line-grow delay-600 h-0.5 w-24 mx-auto origin-center" style={{
              background: 'hsl(24 100% 55% / 0.6)'
            }} />

              {/* Closing statement */}
              <div className="animate-slide-up delay-700 text-center space-y-3">
                <p className="text-foreground text-xl md:text-2xl font-semibold" style={{
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                  Først og fremst er vi GIGGEN.
                </p>
                <p className="text-lg md:text-xl italic" style={{
                color: 'hsl(24 100% 55%)'
              }}>
                  Og vi er klare for å gi musikkbransjen et friskt pust.
                </p>
              </div>
            </div>
          </div>
        </section>;
    case "artister":
      {
        // Vis ALLE artister fra festivalen - RIGHT ALIGNED
        return <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-lg ml-auto mr-4 md:mr-12 px-5">
            {/* Header - right aligned */}
            <h2 className="animate-slide-up text-display text-section-title mb-10 text-right">
              {section.title || "Lineup"}
            </h2>
            
            {/* Artist list - right aligned */}
            <div className="space-y-6">
              {featuredArtists.length > 0 ? featuredArtists.map((artist, i) => (
                <div 
                  key={artist.id} 
                  className="animate-slide-up py-4 border-b border-foreground/10 last:border-0 text-right"
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <Link 
                    to={`/project/${artist.slug}`} 
                    className="block group"
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
                  <Link 
                    to="/tickets" 
                    className="inline-block mt-2 text-xs text-accent hover:text-accent/80 transition-colors uppercase tracking-wider font-medium"
                  >
                    Kjøp billett →
                  </Link>
                </div>
              )) : (
                <p className="text-foreground/40 text-base text-right">
                  Lineup kommer snart.
                </p>
              )}
            </div>
          </div>
        </section>;
      }
    case "venue-plakat":
      {
        const displayedVenue = selectedVenueId ? {
          ...venue,
          id: selectedVenueId
        } : venue;
        return <section className="fullscreen-section-end relative flex items-start">
          <SectionBackground section={section} venueImage={displayedVenue?.hero_image_url} />
          {/* Stronger gradient overlay from bottom-left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent pointer-events-none z-[1]" />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-md px-6 pb-4 md:px-10 md:pb-6">
            {displayedVenue ? <>
                <p className="animate-slide-up text-mono text-xs text-accent mb-2 uppercase tracking-widest font-medium drop-shadow-md">
                  Venue
                </p>
                <h3 className="animate-slide-up delay-100 text-display text-3xl md:text-4xl text-foreground mb-3 drop-shadow-lg">
                  {displayedVenue.name}
                </h3>
                {displayedVenue.description && <p className="animate-slide-up delay-200 text-foreground/80 text-base leading-relaxed mb-5 max-w-sm drop-shadow-md">
                    {displayedVenue.description}
                  </p>}
                {displayedVenue.slug && <Link to={`/venue/${displayedVenue.slug}`} className="animate-slide-up delay-300 inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-accent transition-colors group font-medium">
                    <span>Utforsk venue</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>}
              </> : <p className="text-foreground/60">
                Venue-informasjon kommer snart.
              </p>}
          </div>
        </section>;
      }
    case "praktisk":
      return <section className="fullscreen-section relative">
          <SectionBackground section={section} />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />
          <MobileFadeOverlay />

          <div className="relative z-10 w-full max-w-sm px-5">
            <h2 className="animate-slide-up text-display text-section-title mb-6">
              {section.title || "Praktisk"}
            </h2>
            
            {getText() && <div className="animate-slide-up delay-100 prose-rich-text text-foreground/60 text-base leading-relaxed mb-10" dangerouslySetInnerHTML={{
            __html: getText()
          }} />}
            
            <div className="animate-slide-up delay-200 flex flex-col gap-3">
              <Link 
                to="/tickets" 
                className={`btn-accent w-full text-center py-4 ${!TICKET_SALES_ENABLED ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                onClick={(e) => { if (!TICKET_SALES_ENABLED) e.preventDefault(); }}
              >
                Kjøp billett
              </Link>
              
            </div>
          </div>
        </section>;
    case "footer":
      return <footer className="fullscreen-section-end relative">
          <SectionBackground section={section} />
          {/* Stronger gradient overlay from bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none z-[1]" />
          <div className="absolute inset-0 section-vignette pointer-events-none z-[2]" />

          <div className="relative z-10 w-full max-w-md px-6 pb-6">
            {/* PNG logo */}
          <div className="animate-blur-in mb-6">
              <img alt="GIGGEN - festival for en kveld" className="h-16 md:h-24 w-auto drop-shadow-lg" src="/lovable-uploads/a08e4ff2-16a2-4b3b-ba0e-7fd7ca6ac632.png" />
            </div>
            
            {/* Tagline - clearer text */}
            {getText() ? <div className="animate-slide-up delay-200 prose-rich-text text-foreground/80 text-base leading-relaxed mb-6 max-w-sm drop-shadow-md" dangerouslySetInnerHTML={{
            __html: getText()
          }} /> : <p className="animate-slide-up delay-200 text-foreground/80 text-base leading-relaxed mb-6 max-w-sm drop-shadow-md">
                Et engasjement for å løfte frem dem som jobber med eksisterende musikkarenaer, og dem som ønsker å skape nye.
              </p>}
            
            {/* Only backstage link */}
            <div className="animate-slide-up delay-400">
              <Link to="/admin/login" className="text-sm text-foreground/60 hover:text-accent transition-colors uppercase tracking-wider font-medium">
                Backstage →
              </Link>
            </div>
          </div>
        </footer>;
    default:
      return null;
  }
}