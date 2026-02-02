import { useMemo } from "react";
import { ArtistPosterBlock } from "./ArtistPosterBlock";
import { LineupSectionHeader } from "./LineupSectionHeader";
import { FestivalFooter } from "./FestivalFooter";

interface Artist {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  hero_image_url?: string | null;
  event_slug?: string;
}

interface DualLineupSectionProps {
  artists: Artist[];
}

/**
 * Dual lineup section that splits artists into:
 * 1. FESTIVAL - warm, organic, live music vibe
 * 2. BOILER ROOM - dark, club/night vibe
 * 
 * Artists are separated based on their associated event:
 * - "boiler-room" event slug → BOILER ROOM section
 * - All others → FESTIVAL section
 */
export function DualLineupSection({ artists }: DualLineupSectionProps) {
  // Split artists by section
  const { festivalArtists, boilerRoomArtists } = useMemo(() => {
    const festival: Artist[] = [];
    const boilerRoom: Artist[] = [];
    
    // Track seen slugs to avoid duplicates
    const seenSlugs = new Set<string>();
    
    artists.forEach((artist) => {
      if (seenSlugs.has(artist.slug)) return;
      seenSlugs.add(artist.slug);
      
      if (artist.event_slug === "boiler-room") {
        boilerRoom.push(artist);
      } else {
        festival.push(artist);
      }
    });
    
    return { festivalArtists: festival, boilerRoomArtists: boilerRoom };
  }, [artists]);

  return (
    <>
      {/* ============================================ */}
      {/* SECTION 1: FESTIVAL                         */}
      {/* Warm colors, organic feel, live music       */}
      {/* ============================================ */}
      <div className="relative">
        {/* Warm gradient background for entire section */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-orange-950/10 to-zinc-950 pointer-events-none" />
        
        <LineupSectionHeader
          title="LINEUP"
          variant="festival"
        />
        
        {/* Artist poster blocks */}
        <div className="relative">
          {festivalArtists.map((artist, index) => (
            <ArtistPosterBlock
              key={artist.id}
              artist={artist}
              index={index}
              variant="festival"
            />
          ))}
        </div>
        
      </div>
      
      {/* ============================================ */}
      {/* SECTION 2: BOILER ROOM                      */}
      {/* Dark, hard contrast, club/night feeling     */}
      {/* ============================================ */}
      <div className="relative bg-black">
        <LineupSectionHeader
          title="BOILER ROOM"
          variant="boilerroom"
        />
        
        {/* Artist poster blocks */}
        <div className="relative">
          {boilerRoomArtists.map((artist, index) => (
            <ArtistPosterBlock
              key={artist.id}
              artist={artist}
              index={index}
              variant="boilerroom"
            />
          ))}
          
          {/* If no boiler room artists, show placeholder */}
          {boilerRoomArtists.length === 0 && (
            <div className="min-h-[40vh] flex items-center justify-center">
              <p className="text-purple-500/50 text-lg uppercase tracking-widest">
                DJs kommer snart...
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <FestivalFooter />
    </>
  );
}
