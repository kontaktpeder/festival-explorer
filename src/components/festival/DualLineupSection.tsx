import { LineupPostersSection } from "./LineupPostersSection";
import { PraktiskSection } from "./PraktiskSection";
import { UtforskMerSection } from "./UtforskMerSection";
import { SocialSection } from "./SocialSection";
import { FestivalFooter } from "./FestivalFooter";

interface Artist {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  hero_image_url?: string | null;
  logo_url?: string | null;
  event_slug?: string;
}
interface FestivalTeam {
  backstage: Array<Record<string, unknown>>;
  hostRoles: Array<Record<string, unknown>>;
}
interface DualLineupSectionProps {
  artists: Artist[];
  festivalTeam?: FestivalTeam | null;
  /** When false, only post-lineup sections render (posters shown via collapsible CTA). */
  showPosters?: boolean;
}

export function DualLineupSection({
  artists,
  festivalTeam,
  showPosters = true,
}: DualLineupSectionProps) {
  return (
    <>
      {showPosters && <LineupPostersSection artists={artists} />}

      <PraktiskSection />
      <UtforskMerSection />
      <SocialSection />
      <FestivalFooter />
    </>
  );
}