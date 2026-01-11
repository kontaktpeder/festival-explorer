import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Event, EventProject } from "@/types/database";

interface FestivalEventAccordionProps {
  events: Array<{
    event_id: string;
    sort_order: number;
    event: Event & {
      venue?: { name: string; slug: string } | null;
      lineup?: EventProject[];
    };
  }>;
}

export function FestivalEventAccordion({ events }: FestivalEventAccordionProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Grupper events per dag
  const eventsByDay = events.reduce((acc, fe) => {
    if (!fe.event) return acc;
    const day = format(new Date(fe.event.start_at), "EEEE d. MMM", { locale: nb });
    if (!acc[day]) acc[day] = [];
    acc[day].push(fe);
    return acc;
  }, {} as Record<string, typeof events>);

  return (
    <div className="space-y-12">
      {Object.entries(eventsByDay).map(([day, dayEvents]) => (
        <div key={day} className="space-y-6">
          {/* Dag-header */}
          <div className="text-mono text-xs uppercase tracking-widest text-accent/80">
            {day}
          </div>

          {/* Events for denne dagen */}
          <div className="space-y-8">
            {dayEvents.map((fe, index) => {
              if (!fe.event) return null;
              const event = fe.event;
              const startTime = new Date(event.start_at);
              const endTime = event.end_at ? new Date(event.end_at) : null;
              const isExpanded = expandedEvent === fe.event_id;
              const isLast = index === dayEvents.length - 1;

              return (
                <div
                  key={fe.event_id}
                  className={`pb-8 ${!isLast ? "border-b border-border/20" : ""}`}
                >
                  {/* Event-tittel - klikkbar til full side */}
                  <Link
                    to={`/event/${event.slug}`}
                    className="block group"
                  >
                    <h3 className="text-display text-xl md:text-2xl leading-tight group-hover:text-accent transition-colors">
                      {event.title}
                    </h3>
                  </Link>

                  {/* Artistnavn (hvis lineup finnes) */}
                  {event.lineup && event.lineup.length > 0 && (
                    <p className="mt-1 text-lg font-medium text-foreground/90">
                      {event.lineup
                        .slice(0, 3)
                        .map((ep) => ep.project?.name)
                        .filter(Boolean)
                        .join(" + ")}
                      {event.lineup.length > 3 && ` + ${event.lineup.length - 3} flere`}
                    </p>
                  )}

                  {/* Tid og venue - inline */}
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span>
                      {format(startTime, "HH:mm")}
                      {endTime && `–${format(endTime, "HH:mm")}`}
                    </span>
                    <span className="mx-2">·</span>
                    {event.venue && <span>{event.venue.name}</span>}
                  </p>

                  {/* Klikk for å vise mer (hvis description finnes) */}
                  {event.description && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setExpandedEvent(isExpanded ? null : fe.event_id);
                      }}
                      className="mt-3 text-xs text-muted-foreground hover:text-accent transition-colors"
                    >
                      {isExpanded ? "Vis mindre" : "Les mer"}
                    </button>
                  )}

                  {/* Utvidet innhold */}
                  {isExpanded && event.description && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                      <p className="text-sm text-foreground/80 leading-relaxed max-w-prose">
                        {event.description}
                      </p>

                      {/* Full lineup */}
                      {event.lineup && event.lineup.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {event.lineup.map((ep) =>
                            ep.project ? (
                              <Link
                                key={ep.project_id}
                                to={`/project/${ep.project.slug}`}
                                className="text-sm text-muted-foreground hover:text-accent transition-colors"
                              >
                                {ep.project.name}
                              </Link>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
