import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Zone background images
import zoneBg2Etasje from "@/assets/zone-bg-2etasje.jpg";
import zoneBg1Etasje from "@/assets/zone-bg-1etasje.jpg";
import zoneBgBoilerroom from "@/assets/zone-bg-boilerroom.jpg";

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
    overlayClass: "from-black/50 via-black/30 to-black/60",
  },
  {
    key: "1-etasje",
    label: "1. ETASJE",
    slugMatch: "1-etasje",
    bgImage: zoneBg1Etasje,
    accentClass: "text-accent",
    borderClass: "border-accent/30",
    glowClass: "shadow-accent/20",
    overlayClass: "from-black/50 via-black/30 to-black/60",
  },
  {
    key: "boiler-room",
    label: "BOILER ROOM",
    slugMatch: "boiler-room",
    bgImage: zoneBgBoilerroom,
    accentClass: "text-foreground/60",
    borderClass: "border-foreground/10",
    glowClass: "shadow-white/5",
    overlayClass: "",
  },
] as const;

function ArtistName({ artist }: { artist: Artist }) {
  return (
    <span
      className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-wide leading-none"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.3)",
      }}
    >
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
      "grid gap-0 w-full",
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
                    "text-base md:text-lg font-black tracking-[0.35em] uppercase",
                    zone.accentClass
                  )}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  {zone.label}
                </h3>
              </div>

              {/* Artist list */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 px-4 md:px-6 py-10 md:py-14">
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
                {/* Upcoming placeholders for 2. etasje */}
                {zone.key === "2-etasje" && (
                  <div className="flex flex-col items-center gap-3 mt-2">
                    <Mic className="w-6 h-6 md:w-8 md:h-8 text-white/20" strokeWidth={1.5} />
                    <Mic className="w-6 h-6 md:w-8 md:h-8 text-white/20" strokeWidth={1.5} />
                    <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-white/30 mt-1">
                      Slippes snart
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
