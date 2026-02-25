import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { cn } from "@/lib/utils";
import type { ProgramSlotItem } from "./LineupWithTimeSection";

interface EventForProgram {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  hero_image_url?: string | null;
}

interface ProgramTimelineSectionProps {
  events: EventForProgram[];
  slots: ProgramSlotItem[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small wrapper so useSignedMediaUrl hook can be called per-event */
function EventColumnImage({ url, alt }: { url: string; alt: string }) {
  const signed = useSignedMediaUrl(url, "public");
  if (!signed) return null;
  return (
    <img
      src={signed}
      alt={alt}
      className="w-full aspect-[16/9] object-cover rounded-lg"
      loading="lazy"
    />
  );
}

function EventColumn({
  event,
  eventSlots,
}: {
  event: EventForProgram;
  eventSlots: ProgramSlotItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {event.hero_image_url && (
        <EventColumnImage url={event.hero_image_url} alt={event.title} />
      )}
      <div className="space-y-1">
        <Link
          to={`/event/${event.slug}`}
          className="text-display text-lg md:text-xl font-bold hover:text-accent transition-colors"
        >
          {event.title}
        </Link>
        <div className="space-y-0.5 mt-2">
          {eventSlots.map((slot, i) => (
            <div key={i} className="flex items-baseline gap-3 py-1.5 border-b border-foreground/5 last:border-0">
              <span className="text-xs text-muted-foreground font-mono tabular-nums w-12 flex-shrink-0">
                {formatTime(slot.starts_at)}
              </span>
              {slot.slug ? (
                <Link
                  to={`/project/${slot.slug}`}
                  className="text-sm font-semibold text-foreground/80 hover:text-accent transition-colors"
                >
                  {slot.name ?? "TBA"}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-foreground/80">
                  {slot.name ?? "TBA"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProgramTimelineSection({ events, slots }: ProgramTimelineSectionProps) {
  const slotsByEventId = useMemo(() => {
    const m: Record<string, ProgramSlotItem[]> = {};
    slots.forEach((s) => {
      if (!m[s.event_id]) m[s.event_id] = [];
      m[s.event_id].push(s);
    });
    return m;
  }, [slots]);

  if (events.length === 0) return null;

  return (
    <section className="relative bg-background py-16 md:py-24 px-6" id="program">
      <div className="max-w-5xl mx-auto space-y-8">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">
          Program
        </h2>
        <div
          className={cn(
            "grid gap-8 md:gap-10",
            events.length === 1
              ? "grid-cols-1 max-w-md"
              : events.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-3"
          )}
        >
          {events.map((event) => (
            <EventColumn
              key={event.id}
              event={event}
              eventSlots={slotsByEventId[event.id] ?? []}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
