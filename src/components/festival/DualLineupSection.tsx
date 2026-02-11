import { useMemo } from "react";
import { ArtistPosterBlock } from "./ArtistPosterBlock";
import { LineupSectionHeader } from "./LineupSectionHeader";
import { PraktiskSection } from "./PraktiskSection";
import { UtforskMerSection } from "./UtforskMerSection";
import { SocialSection } from "./SocialSection";
import { FestivalFooter } from "./FestivalFooter";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";

interface Artist {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  hero_image_url?: string | null;
  event_slug?: string;
}

interface FestivalTeam {
  backstage: Array<Record<string, unknown>>;
  hostRoles: Array<Record<string, unknown>>;
}

interface DualLineupSectionProps {
  artists: Artist[];
  festivalTeam?: FestivalTeam | null;
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
export function DualLineupSection({ artists, festivalTeam }: DualLineupSectionProps) {
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
      
      {/* ============================================ */}
      {/* POST-LINEUP SECTIONS                        */}
      {/* Praktisk, Utforsk, Community, Social        */}
      {/* ============================================ */}
      <PraktiskSection />
      <UtforskMerSection />

      {/* Festival-team (Arrangør / Bak scenen) */}
      {festivalTeam && (festivalTeam.hostRoles.length > 0 || festivalTeam.backstage.length > 0) && (
        <section className="relative py-24 md:py-32 px-6 bg-black overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-accent/60 mb-4 font-medium">
              Festival-teamet
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
              Menneskene bak festivalen
            </h2>
            <p className="text-base text-foreground/50 mb-12 max-w-lg leading-relaxed">
              Bli kjent med dem som står bak festivalen, og som er med på å skape en historisk kveld.
            </p>
            
            <div className="space-y-8">
              {[
                ...festivalTeam.hostRoles,
                ...festivalTeam.backstage,
              ]
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((item: any, i: number) => {
                  const displayRole =
                    item.role_label ||
                    (item.persona?.category_tags && item.persona.category_tags[0]) ||
                    item.entity?.type ||
                    null;
                  return (
                    <div key={item.participant_id || i} className="flex flex-col gap-1.5 border-l-2 border-accent/30 pl-5">
                      {displayRole && (
                        <p className="text-[10px] uppercase tracking-[0.3em] text-accent/70 font-semibold">
                          {displayRole}
                        </p>
                      )}
                      <EventParticipantItem item={item} />
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      <SocialSection />
      <FestivalFooter />
    </>
  );
}
