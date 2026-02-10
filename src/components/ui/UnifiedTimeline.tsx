import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useUnifiedTimelineEvents } from "@/hooks/useUnifiedTimeline";
import type { TimelineSource, EventTypeOption, UnifiedTimelineEvent } from "@/types/timeline";
import { getEventTypeConfig, ALL_EVENT_TYPE_OPTIONS } from "@/lib/timeline-config";

interface UnifiedTimelineProps {
  source: TimelineSource;
  eventTypeOptions?: EventTypeOption[];
}

/**
 * Public-facing timeline display.
 * Returns null when there are no events so parents can conditionally hide the section.
 */
export function UnifiedTimeline({ source, eventTypeOptions }: UnifiedTimelineProps) {
  const { data: events, isLoading } = useUnifiedTimelineEvents(source, { visibility: "public" });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Laster historikk...
      </div>
    );
  }

  if (!events || events.length === 0) return null;

  return (
    <div className="relative pl-8 md:pl-12">
      <div className="absolute left-3 md:left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
      <div className="space-y-14 md:space-y-20">
        {events.map((event, index) => (
          <TimelineDisplayItem
            key={event.id}
            event={event}
            index={index}
            eventTypeOptions={eventTypeOptions}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual item ────────────────────────────────────────

interface TimelineDisplayItemProps {
  event: UnifiedTimelineEvent;
  index: number;
  eventTypeOptions?: EventTypeOption[];
}

function TimelineDisplayItem({ event, index, eventTypeOptions }: TimelineDisplayItemProps) {
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
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const typeConfig = getEventTypeConfig(event.event_type, eventTypeOptions);
  const EventIcon = typeConfig.icon;

  const dateStr = formatEventDate(event);
  const locationStr = formatLocation(event);

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="absolute -left-6 md:-left-8 top-2 w-3 h-3 rounded-full bg-primary/80 ring-4 ring-background" />

      <div className="space-y-3">
        {dateStr && (
          <div className="text-2xl md:text-3xl font-display font-light text-primary/60 tracking-wide">
            {dateStr}
          </div>
        )}

        <h3 className="text-lg md:text-xl font-medium text-foreground leading-snug">
          {event.title}
        </h3>

        {locationStr && (
          <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {locationStr}
          </p>
        )}

        {event.description && (
          <p className="text-base text-foreground/70 whitespace-pre-line leading-relaxed max-w-xl font-light">
            {event.description}
          </p>
        )}

        {event.media && event.media.length > 0 && (
          <div className="pt-4 flex gap-3 flex-wrap">
            {event.media.map((m, i) => (
              <div key={i} className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden ring-1 ring-border/10">
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function formatSingleDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
  const isFirstOfMonth = d.getUTCDate() === 1 && !hasTime;
  if (isFirstOfMonth) {
    return format(d, "MMMM yyyy", { locale: nb });
  }
  const base = format(d, "d. MMMM yyyy", { locale: nb });
  if (hasTime) {
    return `${base} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  return base;
}

function formatEventDate(event: UnifiedTimelineEvent): string | null {
  // Prefer exact date over year-only
  if (event.date) {
    const from = formatSingleDate(event.date);
    if (!from) return event.year?.toString() ?? null;
    if (event.date_to) {
      const to = formatSingleDate(event.date_to);
      if (to && to !== from) return `${from} – ${to}`;
    }
    return from;
  }
  if (event.year != null) {
    if (event.year_to != null && event.year_to !== event.year) return `${event.year}–${event.year_to}`;
    return event.year.toString();
  }
  return null;
}

function formatLocation(event: UnifiedTimelineEvent): string | null {
  const parts = [event.location_name, event.city, event.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
