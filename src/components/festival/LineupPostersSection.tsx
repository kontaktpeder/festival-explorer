import { useMemo } from "react";
import { ArtistPosterBlock } from "./ArtistPosterBlock";
import { LineupSectionHeader } from "./LineupSectionHeader";

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

/**
 * Visual lineup posters: FESTIVAL + BOILER ROOM sections.
 * Split by event_slug === "boiler-room".
 */
export function LineupPostersSection({ artists }: LineupPostersSectionProps) {
  const { festivalArtists, boilerRoomArtists } = useMemo(() => {
    const festival: Artist[] = [];
    const boilerRoom: Artist[] = [];
    const seenSlugs = new Set<string>();
    (artists ?? []).forEach((artist) => {
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
      {/* FESTIVAL */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-orange-950/10 to-zinc-950 pointer-events-none" />
        <LineupSectionHeader title="LINEUP" variant="festival" />
        <div className="relative">
          {festivalArtists.map((artist, index) => (
            <ArtistPosterBlock key={artist.id} artist={artist} index={index} variant="festival" />
          ))}
        </div>
      </div>

      {/* BOILER ROOM */}
      <div className="relative bg-black">
        <LineupSectionHeader title="BOILER ROOM" variant="boilerroom" />
        <div className="relative">
          {boilerRoomArtists.map((artist, index) => (
            <ArtistPosterBlock key={artist.id} artist={artist} index={index} variant="boilerroom" />
          ))}
          {boilerRoomArtists.length === 0 && (
            <div className="min-h-[40vh] flex items-center justify-center">
              <p className="text-purple-500/50 text-lg uppercase tracking-widest">
                DJs kommer snart...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
