import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePublicTimelineEvents } from "@/hooks/useTimeline";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { TimelineEventType } from "@/types/database";

const EVENT_TYPE_CONFIG: Record<TimelineEventType, { label: string; icon: string }> = {
  live_show: { label: "Konsert", icon: "🎤" },
  release: { label: "Utgivelse", icon: "💿" },
  milestone: { label: "Milepæl", icon: "⭐" },
  collaboration: { label: "Samarbeid", icon: "🤝" },
  media: { label: "Media", icon: "📸" },
  award: { label: "Pris", icon: "🏆" },
  personal_memory: { label: "Personlig minne", icon: "💭" },
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
      <div className="cosmic-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ingen hendelser lagt til ennå.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
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
    label: event.event_type,
    icon: "📌",
  };

  const formatEventDate = () => {
    if (event.date) {
      return format(new Date(event.date), "d. MMMM yyyy", { locale: nb });
    }
    if (event.year) {
      return event.year.toString();
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
        relative pl-10 transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Timeline dot */}
      <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />

      {/* Event card */}
      <div className="cosmic-card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="text-2xl flex-shrink-0">{typeConfig.icon}</div>

          <div className="flex-1 min-w-0">
            {/* Badge and title */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="secondary" className="text-xs">
                {typeConfig.label}
              </Badge>
            </div>

            <h3 className="font-semibold text-foreground">{event.title}</h3>

            {/* Date and location */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {dateStr && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateStr}
                </span>
              )}
              {locationStr && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {locationStr}
                </span>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <p className="mt-3 text-sm text-foreground/80 whitespace-pre-line">
                {event.description}
              </p>
            )}

            {/* Media */}
            {event.media && event.media.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {event.media.map((m, i) => (
                  <div key={i} className="w-24 h-24 rounded overflow-hidden">
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
    </div>
  );
}
