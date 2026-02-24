import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Zone background images
import zoneBg2Etasje from "@/assets/zone-bg-2etasje.jpg";
import zoneBg1Etasje from "@/assets/zone-bg-1etasje.jpg";
import zoneBgBoilerroom from "@/assets/zone-bg-boilerroom.jpg";

// Static artist logo imports
import brorLogo from "@/assets/artist-logos/bror.png";
import namiLogo from "@/assets/artist-logos/nami.png";
import cornicLogo from "@/assets/artist-logos/cornic.png";
import mastLogo from "@/assets/artist-logos/mast.png";
import mayaEstrelaLogo from "@/assets/artist-logos/maya-estrela.png";
import oienOgLurvikLogo from "@/assets/artist-logos/oien-og-lurvik.png";

const artistLogos: Record<string, string> = {
  bror: brorLogo,
  nami: namiLogo,
  cornic: cornicLogo,
  mast: mastLogo,
  "maya-estrela": mayaEstrelaLogo,
  "ien-og-lurvik": oienOgLurvikLogo,
};

interface Artist {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  hero_image_url?: string | null;
  logo_url?: string | null;
  logo_display_mode?: string;
  event_slug?: string;
}

interface LineupPostersSectionProps {
  artists: Artist[];
}

// Zone configuration: order is right-to-left visually (2. etasje first in grid = left on desktop)
const ZONES = [
  {
    key: "2-etasje",
    label: "2. ETASJE",
    slugMatch: "2-etasje",
    bgImage: zoneBg2Etasje,
    accentClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    glowClass: "shadow-emerald-500/20",
    overlayClass: "from-emerald-950/60 via-black/40 to-black/80",
  },
  {
    key: "1-etasje",
    label: "1. ETASJE",
    slugMatch: "1-etasje",
    bgImage: zoneBg1Etasje,
    accentClass: "text-accent",
    borderClass: "border-accent/30",
    glowClass: "shadow-accent/20",
    overlayClass: "from-orange-950/60 via-black/40 to-black/80",
  },
  {
    key: "boiler-room",
    label: "BOILER ROOM",
    slugMatch: "boiler-room",
    bgImage: null as unknown as string,
    accentClass: "text-foreground/60",
    borderClass: "border-foreground/10",
    glowClass: "shadow-white/5",
    overlayClass: "from-black via-black to-black",
  },
] as const;

function ArtistName({ artist }: { artist: Artist }) {
  const logoUrlFromApi = useSignedMediaUrl(artist.logo_url ?? null, "public");
  const displayLogoUrl = logoUrlFromApi || artistLogos[artist.slug] || null;
  const shouldInvert = !logoUrlFromApi && artist.slug === "mast";
  const logoDisplayMode = artist.logo_display_mode ?? "with_name";

  if (logoDisplayMode === "instead_of_name" && displayLogoUrl) {
    return (
      <>
        <img
          src={displayLogoUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            "w-auto h-auto max-h-10 md:max-h-14 object-contain drop-shadow-lg",
            shouldInvert && "invert"
          )}
        />
        <span className="sr-only">{artist.name}</span>
      </>
    );
  }

  if (displayLogoUrl && artist.slug !== "maya-estrela") {
    return (
      <img
        src={displayLogoUrl}
        alt={artist.name}
        className={cn(
          "w-auto h-auto max-h-8 md:max-h-12 object-contain drop-shadow-lg",
          shouldInvert && "invert"
        )}
      />
    );
  }

  return (
    <span className="text-display text-lg md:text-xl lg:text-2xl text-foreground drop-shadow-lg leading-tight">
      {artist.name}
    </span>
  );
}

/**
 * Three-column lineup grid: 2. etasje | 1. etasje | BOILER ROOM
 * Each column has its own background image and color accent.
 * On mobile, stacks vertically.
 */
export function LineupPostersSection({ artists }: LineupPostersSectionProps) {
  const isMobile = useIsMobile();

  const grouped = useMemo(() => {
    const groups: Record<string, Artist[]> = {
      "2-etasje": [],
      "1-etasje": [],
      "boiler-room": [],
    };
    const seenSlugs = new Set<string>();
    (artists ?? []).forEach((artist) => {
      if (seenSlugs.has(artist.slug)) return;
      seenSlugs.add(artist.slug);
      if (artist.event_slug === "boiler-room") {
        groups["boiler-room"].push(artist);
      } else if (artist.event_slug === "2-etasje") {
        groups["2-etasje"].push(artist);
      } else {
        // Default: 1. etasje
        groups["1-etasje"].push(artist);
      }
    });
    return groups;
  }, [artists]);

  return (
    <div className={cn(
      "grid gap-0",
      isMobile ? "grid-cols-1" : "grid-cols-3"
    )}>
      {ZONES.map((zone) => {
        const zoneArtists = grouped[zone.key] || [];
        return (
          <div
            key={zone.key}
            className="relative overflow-hidden"
          >
            {/* Background image */}
            {zone.bgImage && (
              <img
                src={zone.bgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {/* Gradient overlay */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", zone.overlayClass)} />

            {/* Content */}
            <div className="relative z-10 flex flex-col min-h-[50vh] md:min-h-[70vh]">
              {/* Zone header */}
              <div className={cn(
                "px-4 md:px-6 pt-8 md:pt-10 pb-4 text-center border-b",
                zone.borderClass
              )}>
                <h3
                  className={cn(
                    "text-sm md:text-base font-black tracking-[0.3em] uppercase",
                    zone.accentClass
                  )}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {zone.label}
                </h3>
              </div>

              {/* Artist list */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-5 px-4 md:px-6 py-8 md:py-10">
                {zoneArtists.length > 0 ? (
                  zoneArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/project/${artist.slug}`}
                      className={cn(
                        "group flex flex-col items-center text-center",
                        "transition-all duration-300",
                        "hover:scale-105"
                      )}
                    >
                      <ArtistName artist={artist} />
                      {artist.tagline && (
                        <p className={cn(
                          "mt-1 text-[10px] md:text-xs tracking-wide",
                          zone.accentClass,
                          "opacity-60 group-hover:opacity-100 transition-opacity"
                        )}>
                          {artist.tagline}
                        </p>
                      )}
                    </Link>
                  ))
                ) : (
                  <p className={cn("text-sm tracking-widest uppercase", zone.accentClass, "opacity-40")}>
                    Kommer snart...
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
