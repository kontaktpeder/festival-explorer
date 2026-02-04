import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface VenuePosterBlockProps {
  venue: {
    name: string;
    slug: string;
    tagline?: string | null;
    hero_image_url?: string | null;
  };
}

/**
 * Large visual poster block for venue
 * Same style as ArtistPosterBlock
 * Mobile: No hover effects, no tagline - only "Utforsk" indicator
 */
export function VenuePosterBlock({ venue }: VenuePosterBlockProps) {
  const heroImageUrl = useSignedMediaUrl(venue.hero_image_url, 'public');
  const isMobile = useIsMobile();

  return (
    <Link
      to={`/venue/${venue.slug}`}
      className={cn(
        "relative block w-full min-h-[50vh] md:min-h-[60vh] overflow-hidden group transition-all duration-700",
        "bg-gradient-to-br from-amber-950/30 via-orange-900/20 to-rose-950/30",
        !isMobile && "group-hover:shadow-[0_0_80px_rgba(251,146,60,0.3)]"
      )}
    >
      {/* Background hero image */}
      {heroImageUrl && (
        <div className="absolute inset-0">
          <img
            src={heroImageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover transition-transform duration-1000",
              !isMobile && "group-hover:scale-105"
            )}
          />
        </div>
      )}
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      
      {/* Content - bottom left */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 items-start text-left">
        <div className={cn(
          "max-w-[85%] md:max-w-[70%] transition-all duration-500",
          !isMobile && "group-hover:translate-y-[-10px]"
        )}>
          {/* Section label */}
          <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-orange-400/70 mb-3 block">
            Venue
          </span>
          
          {/* Venue name */}
          <h3 
            className="text-4xl md:text-6xl lg:text-7xl text-white font-bold drop-shadow-2xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {venue.name}
          </h3>
          
          {/* Mobile: Always show "Utforsk", Desktop: Tagline on hover */}
          {isMobile ? (
            <p className="mt-4 text-sm text-white/50">
              Utforsk →
            </p>
          ) : (
            venue.tagline && (
              <p className="mt-4 text-base md:text-lg text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {venue.tagline}
              </p>
            )
          )}
        </div>
        
        {/* Explore indicator - desktop only */}
        {!isMobile && (
          <div className="mt-6 text-xs md:text-sm uppercase tracking-[0.2em] opacity-0 group-hover:opacity-70 transition-all duration-500 text-white/60">
            Utforsk venue →
          </div>
        )}
      </div>
      
      {/* Subtle grain overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </Link>
  );
}
