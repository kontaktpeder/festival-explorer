import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MapPin, Clock } from "lucide-react";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import type { Event, EventProject } from "@/types/database";

interface EventCardProps {
  event: Event & {
    venue?: { name: string; slug: string } | null;
    lineup?: EventProject[];
  };
  showDate?: boolean;
}

export function EventCard({ event, showDate = true }: EventCardProps) {
  const startTime = new Date(event.start_at);
  
  // Signed URL for public viewing
  const heroImageUrl = useSignedMediaUrl(event.hero_image_url, 'public');

  return (
    <Link to={`/event/${event.slug}`} className="event-card block group">
      {heroImageUrl && (
        <div className="relative h-32 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t-lg">
          <img
            src={heroImageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}

      <div className="space-y-2">
        {showDate && (
          <div className="text-mono text-muted-foreground">
            {format(startTime, "d. MMM", { locale: nb })}
          </div>
        )}

        <h3 className="text-display text-lg leading-tight group-hover:text-accent transition-colors">
          {event.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(startTime, "HH:mm")}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue.name}
            </span>
          )}
        </div>

        {event.lineup && event.lineup.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {event.lineup.slice(0, 3).map((ep) =>
              ep.project ? (
                <span key={ep.project_id} className="cosmic-tag">
                  {ep.project.name}
                </span>
              ) : null
            )}
            {event.lineup.length > 3 && (
              <span className="cosmic-tag">+{event.lineup.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
