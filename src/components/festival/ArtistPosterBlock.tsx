import { useState } from "react";
import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Static artist logo imports - map by slug
import brorLogo from "@/assets/artist-logos/bror.png";
import namiLogo from "@/assets/artist-logos/nami.png";
import cornicLogo from "@/assets/artist-logos/cornic.png";
import mastLogo from "@/assets/artist-logos/mast.png";
import mayaEstrelaLogo from "@/assets/artist-logos/maya-estrela.png";
import oienOgLurvikLogo from "@/assets/artist-logos/oien-og-lurvik.png";

// Map slugs to logo images
const artistLogos: Record<string, string> = {
  "bror": brorLogo,
  "nami": namiLogo,
  "cornic": cornicLogo,
  "mast": mastLogo,
  "maya-estrela": mayaEstrelaLogo,
  "ien-og-lurvik": oienOgLurvikLogo,
};

interface ArtistPosterBlockProps {
  artist: {
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
    hero_image_url?: string | null;
  };
  index: number;
  variant: "festival" | "boilerroom";
}

/**
 * Large visual poster block for a single artist
 * - 70vh height minimum
 * - Alternating left/right positioning
 * - Uses hero image as background with logo overlay
 * - Mobile: No hover effects, static images
 */
export function ArtistPosterBlock({ artist, index, variant }: ArtistPosterBlockProps) {
  const heroImageUrl = useSignedMediaUrl(artist.hero_image_url, 'public');
  const artistLogo = artistLogos[artist.slug];
  const isEven = index % 2 === 0;
  const isMobile = useIsMobile();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Variant-specific styles
  const variantStyles = {
    festival: {
      container: "bg-gradient-to-br from-amber-950/30 via-orange-900/20 to-rose-950/30",
      overlay: "bg-gradient-to-t from-black/80 via-black/30 to-transparent",
      glow: "group-hover:shadow-[0_0_80px_rgba(251,146,60,0.3)]",
      accent: "text-orange-300",
    },
    boilerroom: {
      container: "bg-gradient-to-br from-zinc-950 via-neutral-900 to-black",
      overlay: "bg-gradient-to-t from-black/90 via-black/50 to-black/20",
      glow: "group-hover:shadow-[0_0_80px_rgba(168,85,247,0.25)]",
      accent: "text-purple-400",
    },
  };
  
  const styles = variantStyles[variant];

  return (
    <Link
      to={`/project/${artist.slug}`}
      className={cn(
        "relative block w-full overflow-hidden group transition-all duration-700",
        // Mobile: fixed pixel height to prevent resize when browser UI changes
        // Desktop: viewport-relative height
        isMobile ? "h-[480px]" : "min-h-[80vh]",
        styles.container,
        !isMobile && styles.glow
      )}
    >
      {/* Background hero image - NO movement on mobile */}
      {heroImageUrl && (
        <div className="absolute inset-0">
          <img
            src={heroImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-700 ease-out",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
              !isMobile && imageLoaded && "group-hover:scale-105 duration-1000"
            )}
          />
        </div>
      )}
      
      {/* Overlay gradient */}
      <div className={cn("absolute inset-0", styles.overlay)} />
      
      {/* Content - positioned based on alternating pattern */}
      <div 
        className={cn(
          "absolute inset-0 flex flex-col justify-end p-6 md:p-12",
          isEven ? "items-start text-left" : "items-end text-right"
        )}
      >
        {/* Artist logo/name typography - NO movement on mobile */}
        <div className={cn(
          "max-w-[85%] md:max-w-[70%]",
          !isMobile && "transition-all duration-500 group-hover:translate-y-[-10px]"
        )}>
          {artistLogo ? (
            <img
              src={artistLogo}
              alt={artist.name}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-auto max-w-full h-auto max-h-32 md:max-h-48 object-contain drop-shadow-2xl",
                !isMobile && "transition-all duration-500 group-hover:scale-105",
                artist.slug === "mast" && "brightness-0 invert",
                isEven ? "" : "ml-auto"
              )}
            />
          ) : (
            <h3 className="text-display text-4xl md:text-6xl lg:text-7xl text-foreground drop-shadow-2xl">
              {artist.name}
            </h3>
          )}
          
          {/* Mobile: Show "Utforsk", Desktop: Tagline on hover */}
          {isMobile ? (
            <p className="mt-4 text-sm text-white/50">
              Utforsk →
            </p>
          ) : (
            artist.tagline && (
              <p className={cn(
                "mt-4 text-base md:text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                styles.accent
              )}>
                {artist.tagline}
              </p>
            )
          )}
        </div>
        
        {/* Explore indicator - desktop only */}
        {!isMobile && (
          <div className="mt-6 text-xs md:text-sm uppercase tracking-[0.2em] opacity-0 group-hover:opacity-70 transition-all duration-500 text-foreground/60">
            Utforsk →
          </div>
        )}
      </div>
      
      {/* Subtle grain overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </Link>
  );
}
