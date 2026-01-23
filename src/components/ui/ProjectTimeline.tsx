import { useEffect, useRef, useState } from "react";
import { 
  MapPin, Sparkles, Palette, Users2, Star, Mic2, 
  GraduationCap, BookOpen, Trophy, RefreshCw, Target, LucideIcon,
  // Venue icons
  Building2, Lightbulb, Calendar, Music, Wrench, AlertCircle, RotateCw, Compass
} from "lucide-react";
import { usePublicTimelineEvents } from "@/hooks/useTimeline";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { TimelineEventType } from "@/types/database";

const EVENT_TYPE_CONFIG: Record<TimelineEventType, { icon: LucideIcon }> = {
  // Persona/Artist categories
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
  // Venue categories
  establishment: { icon: Building2 },
  concept: { icon: Lightbulb },
  program: { icon: Calendar },
  artists: { icon: Music },
  development: { icon: Wrench },
  pause: { icon: AlertCircle },
  relaunch: { icon: RotateCw },
  focus_now: { icon: Compass },
};

interface ProjectTimelineProps {
  projectId: string;
  viewerRole?: "fan" | "pro" | "owner" | "admin";
}

export function ProjectTimeline({ projectId, viewerRole = "fan" }: ProjectTimelineProps) {
  const { data: events, isLoading } = usePublicTimelineEvents(projectId);

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
    <div className="relative pl-6">
      {/* Vertical timeline line - themed */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />

      <div className="space-y-8">
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
    description: string | null;
    date: string | null;
    year: number | null;
    location_name: string | null;
    city: string | null;
    country: string | null;
    media: Array<{ type: "image" | "video"; url: string }> | null;
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
      return event.year.toString();
    }
    if (event.date) {
      return format(new Date(event.date), "yyyy", { locale: nb });
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
        relative transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Timeline dot */}
      <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-primary" />

      {/* Content - no card, clean layout */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-primary/70">
          <EventIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Year prominent */}
          {dateStr && (
            <span className="text-xs font-medium text-primary/80 tracking-wider uppercase">
              {dateStr}
            </span>
          )}

          {/* Title */}
          <h3 className="font-medium text-foreground leading-snug mt-0.5">
            {event.title}
          </h3>

          {/* Location inline */}
          {locationStr && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {locationStr}
            </p>
          )}

          {/* Description */}
          {event.description && (
            <p className="mt-2 text-sm text-foreground/70 whitespace-pre-line leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Media */}
          {event.media && event.media.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {event.media.map((m, i) => (
                <div key={i} className="w-20 h-20 rounded overflow-hidden">
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
    </div>
  );
}
