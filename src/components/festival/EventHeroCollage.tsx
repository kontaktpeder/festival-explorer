import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getObjectPositionFromFocal } from "@/lib/image-crop-helpers";

interface CollageArtist {
  name: string;
  imageUrl: string | null;
  imageSettings?: unknown;
  slug?: string;
  route?: string;
  isHeadliner?: boolean;
}

interface EventHeroCollageProps {
  artists: CollageArtist[];
  eventTitle: string;
  /** Fallback hero image if no artists have images */
  fallbackImageUrl?: string;
  fallbackImageSettings?: unknown;
}

/**
 * Resolve object-position for a collage cell.
 * Uses DB focal-point settings only. Default: center.
 */
function resolveObjectPosition(artist: CollageArtist): string {
  const fromFocal = getObjectPositionFromFocal(artist.imageSettings);
  if (fromFocal && fromFocal !== "50% 50%") return fromFocal;
  return "center";
}

/**
 * Artist collage grid for event hero.
 * Hierarchy: headliner gets ~60% of space, others fill around it.
 * Falls back to single image if only 1 artist or no artist images.
 *
 * Top padding reserves space for the fixed nav/CTA to prevent overlap.
 */
export function EventHeroCollage({
  artists,
  eventTitle,
  fallbackImageUrl,
  fallbackImageSettings,
}: EventHeroCollageProps) {
  // Filter to artists that have images
  const withImages = artists.filter((a) => a.imageUrl);

  if (withImages.length === 0) {
    return fallbackImageUrl ? (
      <FallbackHero
        imageUrl={fallbackImageUrl}
        imageSettings={fallbackImageSettings}
        title={eventTitle}
      />
    ) : (
      <div className="w-full h-[300px] md:h-[520px] bg-gradient-to-br from-card to-muted" />
    );
  }

  if (withImages.length === 1) {
    return <SingleArtistHero artist={withImages[0]} />;
  }

  // Build grid: headliner + up to 3 supporting
  const headliner = withImages[0];
  const supporting = withImages.slice(1, 4);

  return (
    <div className="relative w-full bg-black overflow-hidden">
      {/* 
        pt-16 md:pt-20 reserves space for the fixed header/CTA bar
        so collage content never hides behind navigation.
      */}
      <div
        className={`grid w-full pt-16 md:pt-20 ${
          supporting.length === 1
            ? "grid-cols-2 h-[364px] md:h-[600px]"
            : supporting.length === 2
            ? "grid-cols-[1.4fr_1fr] grid-rows-2 h-[424px] md:h-[600px]"
            : "grid-cols-[1.4fr_1fr] grid-rows-3 h-[484px] md:h-[640px]"
        }`}
      >
        {/* Headliner – spans all rows */}
        <div
          className={`relative overflow-hidden ${
            supporting.length === 1
              ? ""
              : supporting.length === 2
              ? "row-span-2"
              : "row-span-3"
          }`}
        >
          <CollageCell artist={headliner} priority />
        </div>

        {/* Supporting acts */}
        {supporting.map((artist, i) => (
          <div key={artist.name + i} className="relative overflow-hidden">
            <CollageCell artist={artist} />
          </div>
        ))}
      </div>

      {/* Dark gradient overlay at bottom for text legibility */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────── */

function CollageCell({
  artist,
  priority,
}: {
  artist: CollageArtist;
  priority?: boolean;
}) {
  const signedUrl = useSignedMediaUrl(artist.imageUrl, "public");

  if (!signedUrl) {
    return (
      <div className="w-full h-full bg-card flex items-center justify-center">
        <span className="text-2xl font-black text-muted-foreground/20 uppercase">
          {artist.name.charAt(0)}
        </span>
      </div>
    );
  }

  const objectPosition = resolveObjectPosition(artist);

  const inner = (
    <img
      src={signedUrl}
      alt={artist.name}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      style={{ objectPosition }}
      loading={priority ? undefined : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );

  const overlay = null;

  // Name tag with guaranteed dark gradient for legibility
  const nameTag = (
    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 min-h-[48px] flex items-end">
      <span className="text-white text-xs md:text-sm font-semibold tracking-wide uppercase drop-shadow-lg">
        {artist.name}
      </span>
    </div>
  );

  if (artist.route) {
    return (
      <Link to={artist.route} className="group block relative w-full h-full">
        {inner}
        {overlay}
        {nameTag}
      </Link>
    );
  }

  return (
    <div className="group relative w-full h-full">
      {inner}
      {overlay}
      {nameTag}
    </div>
  );
}

function SingleArtistHero({ artist }: { artist: CollageArtist }) {
  const signedUrl = useSignedMediaUrl(artist.imageUrl, "public");
  const objectPosition = resolveObjectPosition(artist);

  return (
    <div className="relative w-full h-[364px] md:h-[600px] bg-black overflow-hidden pt-16 md:pt-20">
      {signedUrl && (
        <img
          src={signedUrl}
          alt={artist.name}
          className="w-full h-full object-cover"
          style={{ objectPosition }}
          fetchPriority="high"
          decoding="async"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}

function FallbackHero({
  imageUrl,
  imageSettings,
  title,
}: {
  imageUrl: string;
  imageSettings?: unknown;
  title: string;
}) {
  const signedUrl = useSignedMediaUrl(imageUrl, "public");

  return (
    <div className="relative w-full h-[364px] md:h-[600px] bg-black overflow-hidden pt-16 md:pt-20">
      {signedUrl && (
        <>
          <div className="hidden md:block relative h-full">
            <img
              src={signedUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: "blur(44px)", opacity: 0.18 }}
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative flex items-center justify-center h-full z-[1]">
              <img src={signedUrl} alt={title} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
          <div className="block md:hidden h-full">
            <img
              src={signedUrl}
              alt={title}
              className="w-full h-full object-cover"
              style={{ objectPosition: getObjectPositionFromFocal(imageSettings) }}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
