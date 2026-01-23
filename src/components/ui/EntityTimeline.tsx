import { useEffect, useRef, useState } from "react";
import { 
  MapPin, Sparkles, Palette, Users2, Star, Mic2, 
  GraduationCap, BookOpen, Trophy, RefreshCw, Target, LucideIcon 
} from "lucide-react";
import { usePublicEntityTimelineEvents } from "@/hooks/useEntityTimeline";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { TimelineEventType } from "@/types/database";

const EVENT_TYPE_CONFIG: Record<TimelineEventType, { icon: LucideIcon }> = {
  start_identity: { icon: Sparkles },
  artistic_development: { icon: Palette },
  collaboration: { icon: Users2 },
  milestone: { icon: Star },
  live_performance: { icon: Mic2 },
  education: { icon: GraduationCap },
  course_competence: { icon: BookOpen },
  recognition: { icon: Trophy },
  transitions_life: { icon: RefreshCw },
  present_direction: { icon: Target },
};

interface EntityTimelineProps {
  entityId?: string;
  personaId?: string;
  viewerRole?: "fan" | "pro" | "owner" | "admin";
}

export function EntityTimeline({ entityId, personaId, viewerRole = "fan" }: EntityTimelineProps) {
  const { data: events, isLoading } = usePublicEntityTimelineEvents(entityId, personaId);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Laster historikk...
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ingen hendelser lagt til ennå.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 md:pl-12">
      {/* Vertical timeline line - subtle, elegant */}
      <div className="absolute left-3 md:left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

      {/* More breathing room between events */}
      <div className="space-y-14 md:space-y-20">
        {events.map((event, index) => (
          <TimelineItem key={event.id} event={event} index={index} />
        ))}
      </div>
    </div>
  );
}

interface TimelineItemProps {
  event: {
    id: string;
    event_type: string;
    title: string;
    description?: string | null;
    date?: string | null;
    date_to?: string | null;
    year?: number | null;
    year_to?: number | null;
    location_name?: string | null;
    city?: string | null;
    country?: string | null;
    media?: Array<{ type: "image" | "video"; url: string }> | null;
  };
  index: number;
}

function TimelineItem({ event, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type as TimelineEventType] || {
    icon: Sparkles,
  };
  const EventIcon = typeConfig.icon;

  const formatEventDate = () => {
    if (event.year) {
      if (event.year_to) {
        return `${event.year}–${event.year_to}`;
      }
      return event.year.toString();
    }
    if (event.date) {
      const year = format(new Date(event.date), "yyyy", { locale: nb });
      if (event.date_to) {
        const yearTo = format(new Date(event.date_to), "yyyy", { locale: nb });
        if (year !== yearTo) {
          return `${year}–${yearTo}`;
        }
        // Same year - show month range
        return `${format(new Date(event.date), "MMM", { locale: nb })}–${format(new Date(event.date_to), "MMM yyyy", { locale: nb })}`;
      }
      return year;
    }
    return null;
  };

  const formatLocation = () => {
    const parts = [event.location_name, event.city, event.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const dateStr = formatEventDate();
  const locationStr = formatLocation();

  return (
    <div
      ref={ref}
      className={`
        relative transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Timeline dot - larger, more presence */}
      <div className="absolute -left-6 md:-left-8 top-2 w-3 h-3 rounded-full bg-primary/80 ring-4 ring-background" />

      {/* Content - spacious, magazine-like */}
      <div className="space-y-3">
        {/* Year - large, editorial */}
        {dateStr && (
          <div className="text-2xl md:text-3xl font-display font-light text-primary/60 tracking-wide">
            {dateStr}
          </div>
        )}

        {/* Title - prominent */}
        <h3 className="text-lg md:text-xl font-medium text-foreground leading-snug">
          {event.title}
        </h3>

        {/* Location - subtle */}
        {locationStr && (
          <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {locationStr}
          </p>
        )}

        {/* Description - readable */}
        {event.description && (
          <p className="text-base text-foreground/70 whitespace-pre-line leading-relaxed max-w-xl font-light">
            {event.description}
          </p>
        )}

        {/* Media - larger thumbnails */}
        {event.media && event.media.length > 0 && (
          <div className="pt-4 flex gap-3 flex-wrap">
            {event.media.map((m, i) => (
              <div key={i} className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden ring-1 ring-border/10">
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
