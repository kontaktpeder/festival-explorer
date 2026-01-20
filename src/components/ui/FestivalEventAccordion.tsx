import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Event, EventProject, EventEntity } from "@/types/database";

// Support both legacy EventProject and new EventEntity lineup formats
type LineupItem = EventProject | EventEntity;

interface FestivalEventAccordionProps {
  events: Array<{
    event_id: string;
    sort_order: number;
    event: Event & {
      venue?: { name: string; slug: string } | null;
      lineup?: LineupItem[];
    };
  }>;
}

// Helper to extract entity/project name from lineup item
function getLineupItemName(item: LineupItem): string | undefined {
  if ('entity' in item && item.entity) {
    return item.entity.name;
  }
  if ('project' in item && item.project) {
    return item.project.name;
  }
  return undefined;
}

// Helper to extract entity/project slug from lineup item
function getLineupItemSlug(item: LineupItem): string | undefined {
  if ('entity' in item && item.entity) {
    return item.entity.slug;
  }
  if ('project' in item && item.project) {
    return item.project.slug;
  }
  return undefined;
}

// Helper to get the key for lineup item
function getLineupItemKey(item: LineupItem): string {
  if ('entity_id' in item) {
    return item.entity_id;
  }
  if ('project_id' in item) {
    return item.project_id;
  }
  return '';
}

export function FestivalEventAccordion({ events }: FestivalEventAccordionProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Group events by day
  const eventsByDay = events.reduce((acc, fe) => {
    if (!fe.event) return acc;
    const day = format(new Date(fe.event.start_at), "EEEE d. MMM", { locale: nb });
    if (!acc[day]) acc[day] = [];
    acc[day].push(fe);
    return acc;
  }, {} as Record<string, typeof events>);

  return (
    <div className="space-y-10">
      {Object.entries(eventsByDay).map(([day, dayEvents], dayIndex) => (
        <div key={day}>
          {/* Day header - minimal */}
          <div 
            className="text-mono text-[10px] uppercase tracking-[0.2em] text-accent/60 mb-6"
            style={{ animationDelay: `${dayIndex * 0.1}s` }}
          >
            {day}
          </div>

          {/* Events */}
          <div className="space-y-0">
            {dayEvents.map((fe, index) => {
              if (!fe.event) return null;
              const event = fe.event;
              const startTime = new Date(event.start_at);
              const endTime = event.end_at ? new Date(event.end_at) : null;
              const isExpanded = expandedEvent === fe.event_id;

              return (
                <div
                  key={fe.event_id}
                  className="py-5 border-b border-foreground/5 last:border-0"
                >
                  {/* Main row */}
                  <div className="flex items-start gap-4">
                    {/* Time column */}
                    <div className="flex-shrink-0 w-14 pt-1">
                      <span className="text-mono text-xs text-foreground/40">
                        {format(startTime, "HH:mm")}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/event/${event.slug}`}
                        className="block group"
                      >
                        <h3 className="text-display text-lg md:text-xl text-foreground/90 group-hover:text-accent transition-colors duration-300 leading-tight">
                          {event.title}
                        </h3>
                      </Link>

                      {/* Artists inline */}
                      {event.lineup && event.lineup.length > 0 && (
                        <p className="mt-1.5 text-sm text-foreground/50">
                          {event.lineup
                            .slice(0, 2)
                            .map((item) => getLineupItemName(item))
                            .filter(Boolean)
                            .join(" · ")}
                          {event.lineup.length > 2 && (
                            <span className="text-foreground/30"> +{event.lineup.length - 2}</span>
                          )}
                        </p>
                      )}

                      {/* Venue */}
                      {event.venue && (
                        <p className="mt-1 text-xs text-foreground/30">
                          {event.venue.name}
                        </p>
                      )}

                      {/* Expand toggle */}
                      {event.description && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setExpandedEvent(isExpanded ? null : fe.event_id);
                          }}
                          className="mt-3 text-[10px] uppercase tracking-widest text-foreground/30 hover:text-accent transition-colors"
                        >
                          {isExpanded ? "Lukk" : "Mer info"}
                        </button>
                      )}

                      {/* Expanded content */}
                      {isExpanded && event.description && (
                        <div className="mt-4 pt-4 border-t border-foreground/5 animate-fade-in">
                          <p className="text-sm text-foreground/50 leading-relaxed">
                            {event.description}
                          </p>

                          {event.lineup && event.lineup.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {event.lineup.map((item) => {
                                const name = getLineupItemName(item);
                                const slug = getLineupItemSlug(item);
                                const key = getLineupItemKey(item);
                                if (!name || !slug) return null;
                                
                                return (
                                  <Link
                                    key={key}
                                    to={`/project/${slug}`}
                                    className="text-xs text-foreground/40 hover:text-accent transition-colors"
                                  >
                                    {name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
