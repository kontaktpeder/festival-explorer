import { useState } from "react";
import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface EventPosterBlockProps {
  event: {
    title: string;
    slug: string;
    start_at?: string | null;
    hero_image_url?: string | null;
    venue?: { name: string } | null;
  };
  compact?: boolean;
  asDiv?: boolean;
}

export function EventPosterBlock({ event, compact = false, asDiv = false }: EventPosterBlockProps) {
  const heroImageUrl = useSignedMediaUrl(event.hero_image_url, "public");
  const isMobile = useIsMobile();
  const [imageLoaded, setImageLoaded] = useState(false);

  const heightClass = compact
    ? isMobile ? "h-[280px]" : "min-h-[320px]"
    : isMobile ? "h-[400px]" : "min-h-[60vh]";

  const content = (
    <>
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
        {event.start_at && (
          <p className="text-xs md:text-sm uppercase tracking-widest text-accent mb-2">
            {format(new Date(event.start_at), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
          </p>
        )}
        <h3 className="text-display text-2xl md:text-4xl lg:text-5xl text-foreground drop-shadow-2xl">
          {event.title}
        </h3>
        {event.venue?.name && (
          <p className="text-sm text-foreground/60 mt-1">{event.venue.name}</p>
        )}
        {isMobile ? (
          <p className="mt-3 text-sm text-white/50">Utforsk →</p>
        ) : (
          <p className="mt-4 text-sm uppercase tracking-[0.2em] opacity-0 group-hover:opacity-70 transition-opacity duration-500 text-foreground/60">
            Utforsk →
          </p>
        )}
      </div>

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );

  const className = cn(
    "relative block w-full overflow-hidden group transition-all duration-700",
    heightClass,
    "bg-gradient-to-br from-amber-950/30 via-orange-900/20 to-rose-950/30",
    !isMobile && "group-hover:shadow-[0_0_60px_rgba(251,146,60,0.2)]"
  );

  if (asDiv) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link to={`/event/${event.slug}`} className={className}>
      {content}
    </Link>
  );
}
