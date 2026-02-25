import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ProgramSlotItem } from "./LineupWithTimeSection";

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
  programSlots?: ProgramSlotItem[];
  eventIdToSlug?: Record<string, string>;
}

// Zone configuration
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Three-column lineup grid: 2. etasje | 1. etasje | BOILER ROOM
 * Shows program slots (time + name) when available, otherwise artist names.
 */
export function LineupPostersSection({
  artists,
  programSlots,
  eventIdToSlug,
}: LineupPostersSectionProps) {
  const isMobile = useIsMobile();

  // Group program slots by zone
  const slotsByZone = useMemo(() => {
    if (!programSlots || !eventIdToSlug || programSlots.length === 0) return null;
    const g: Record<string, ProgramSlotItem[]> = {
      "2-etasje": [],
      "1-etasje": [],
      "boiler-room": [],
    };
    programSlots.forEach((s) => {
      const slug = eventIdToSlug[s.event_id] ?? "1-etasje";
      if (g[slug]) g[slug].push(s);
      else g["1-etasje"].push(s);
    });
    return g;
  }, [programSlots, eventIdToSlug]);

  // Group artists by zone (fallback)
  const artistsByZone = useMemo(() => {
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
        groups["1-etasje"].push(artist);
      }
    });
    return groups;
  }, [artists]);

  const useSlots = !!slotsByZone;

  return (
    <div className={cn(
      "grid gap-0 w-full",
      isMobile ? "grid-cols-1" : "grid-cols-3"
    )}>
      {ZONES.map((zone) => {
        const zoneSlots = useSlots ? (slotsByZone![zone.key] || []) : [];
        const zoneArtists = !useSlots ? (artistsByZone[zone.key] || []) : [];
        const hasContent = useSlots ? zoneSlots.length > 0 : zoneArtists.length > 0;

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

              {/* Content list */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 px-4 md:px-6 py-10 md:py-14">
                {useSlots ? (
                  /* ── Program slots: time + name ── */
                  zoneSlots.length > 0 ? (
                    zoneSlots.map((slot, i) => (
                      <div
                        key={`${slot.event_id}-${i}`}
                        className="flex items-baseline gap-4 text-center flex-col items-center"
                      >
                        <span
                          className="text-xs text-white/40 font-mono tabular-nums tracking-wider"
                          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
                        >
                          {formatTime(slot.starts_at)}
                        </span>
                        {slot.slug ? (
                          <Link
                            to={`/project/${slot.slug}`}
                            className="group"
                          >
                            <span
                              className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-wide leading-none group-hover:text-accent transition-colors"
                              style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.3)",
                              }}
                            >
                              {slot.name ?? "TBA"}
                            </span>
                          </Link>
                        ) : (
                          <span
                            className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-wide leading-none"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.3)",
                            }}
                          >
                            {slot.name ?? "TBA"}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={cn("text-sm tracking-widest uppercase", zone.accentClass, "opacity-40")}>
                      Kommer snart...
                    </p>
                  )
                ) : (
                  /* ── Fallback: artist names ── */
                  hasContent ? (
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
                        <span
                          className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-wide leading-none"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.3)",
                          }}
                        >
                          {artist.name}
                        </span>
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
                  )
                )}
                {zone.key === "2-etasje" && !useSlots && (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <span
                        className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white/20 tracking-wide leading-none"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}
                      >
                        Slippes snart
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span
                        className="text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white/20 tracking-wide leading-none"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}
                      >
                        Slippes snart
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
