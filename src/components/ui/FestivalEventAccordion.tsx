import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Clock, MapPin, ArrowRight, Ticket } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {events.map((fe, index) => {
        if (!fe.event) return null;
        const event = fe.event;
        const startTime = new Date(event.start_at);
        const endTime = event.end_at ? new Date(event.end_at) : null;

        return (
          <AccordionItem
            key={fe.event_id}
            value={fe.event_id}
            className="cosmic-card border-none animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <AccordionTrigger className="px-4 py-4 hover:no-underline group">
              <div className="flex-1 text-left space-y-1.5">
                {/* Date badge */}
                <div className="text-mono text-xs text-accent">
                  {format(startTime, "EEEE d. MMM", { locale: nb })}
                </div>

                {/* Title */}
                <h3 className="text-display text-lg leading-tight pr-4">
                  {event.title}
                </h3>

                {/* Time & Venue */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {format(startTime, "HH:mm")}
                    {endTime && ` – ${format(endTime, "HH:mm")}`}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.venue.name}
                    </span>
                  )}
                </div>

                {/* Lineup preview tags */}
                {event.lineup && event.lineup.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {event.lineup.slice(0, 3).map((ep) =>
                      ep.project ? (
                        <span key={ep.project_id} className="cosmic-tag text-xs">
                          {ep.project.name}
                        </span>
                      ) : null
                    )}
                    {event.lineup.length > 3 && (
                      <span className="cosmic-tag text-xs">
                        +{event.lineup.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4 pt-2">
                {/* Description */}
                {event.description && (
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* Full Lineup */}
                {event.lineup && event.lineup.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Lineup
                    </h4>
                    <div className="space-y-1">
                      {event.lineup.map((ep) =>
                        ep.project ? (
                          <Link
                            key={ep.project_id}
                            to={`/project/${ep.project.slug}`}
                            className="block py-2 px-3 -mx-3 rounded-lg hover:bg-secondary/50 transition-colors group/lineup"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium group-hover/lineup:text-accent transition-colors">
                                  {ep.project.name}
                                </span>
                                {ep.project.tagline && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {ep.project.tagline}
                                  </span>
                                )}
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/lineup:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* CTA & Full page link */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button className="btn-accent flex-1 flex items-center justify-center gap-2">
                    <Ticket className="w-4 h-4" />
                    <span>Kjøp billett</span>
                  </button>
                  <Link
                    to={`/event/${event.slug}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-accent transition-colors"
                  >
                    <span>Se full side</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
