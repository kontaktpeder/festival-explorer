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

interface FestivalSlotItem {
  starts_at: string;
  ends_at?: string | null;
  name: string | null;
  slug: string | null;
  slot_kind?: string;
  title_override?: string | null;
  performer_kind?: string;
  stage_label?: string | null;
}

interface ProgramTimelineSectionProps {
  events: EventForProgram[];
  slots: ProgramSlotItem[];
  festivalSlots?: FestivalSlotItem[];
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
          {eventSlots.map((slot, i) => {
            const hasTitle = !!slot.title_override?.trim();
            const performerName = slot.name ?? "TBA";
            const isPersona = slot.performer_kind === "persona";
            const linkBase = isPersona ? "/p/" : "/project/";

            return (
              <div key={i} className="flex items-baseline gap-3 py-1.5 border-b border-foreground/5 last:border-0">
                <span className="text-xs text-muted-foreground font-mono tabular-nums w-12 flex-shrink-0">
                  {formatTime(slot.starts_at)}
                </span>
                <span className="text-sm font-semibold text-foreground/80 truncate min-w-0">
                  {hasTitle && slot.name ? (
                    <>
                      {slot.title_override}
                      <span className="font-normal text-muted-foreground"> med </span>
                      {slot.slug ? (
                        <Link
                          to={`${linkBase}${slot.slug}`}
                          className="text-accent hover:underline underline-offset-2"
                        >
                          {performerName}
                        </Link>
                      ) : (
                        performerName
                      )}
                    </>
                  ) : slot.slug ? (
                    <Link
                      to={`${linkBase}${slot.slug}`}
                      className="text-foreground/80 hover:text-accent transition-colors"
                    >
                      {performerName}
                    </Link>
                  ) : (
                    performerName
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FestivalSlotRow({ slot }: { slot: FestivalSlotItem }) {
  const hasTitle = !!slot.title_override?.trim();
  const performerName = slot.name ?? "TBA";
  const isPersona = slot.performer_kind === "persona";
  const linkBase = isPersona ? "/p/" : "/project/";
  const displayName = hasTitle ? slot.title_override : performerName;

  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-foreground/5 last:border-0">
      <span className="text-xs text-muted-foreground font-mono tabular-nums w-12 flex-shrink-0">
        {formatTime(slot.starts_at)}
      </span>
      {slot.stage_label && (
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider flex-shrink-0">
          {slot.stage_label}
        </span>
      )}
      <span className="text-sm font-semibold text-foreground/80 truncate min-w-0">
        {hasTitle && slot.name ? (
          <>
            {slot.title_override}
            <span className="font-normal text-muted-foreground"> med </span>
            {slot.slug ? (
              <Link
                to={`${linkBase}${slot.slug}`}
                className="text-accent hover:underline underline-offset-2"
              >
                {performerName}
              </Link>
            ) : (
              performerName
            )}
          </>
        ) : slot.slug ? (
          <Link
            to={`${linkBase}${slot.slug}`}
            className="text-foreground/80 hover:text-accent transition-colors"
          >
            {displayName}
          </Link>
        ) : (
          displayName
        )}
      </span>
    </div>
  );
}

export function ProgramTimelineSection({ events, slots, festivalSlots = [] }: ProgramTimelineSectionProps) {
  const slotsByEventId = useMemo(() => {
    const m: Record<string, ProgramSlotItem[]> = {};
    slots.forEach((s) => {
      if (!m[s.event_id]) m[s.event_id] = [];
      m[s.event_id].push(s);
    });
    return m;
  }, [slots]);

  const hasEvents = events.length > 0;
  const hasFestivalSlots = festivalSlots.length > 0;

  if (!hasEvents && !hasFestivalSlots) return null;

  return (
    <section className="relative bg-background py-16 md:py-24 px-6" id="program">
      <div className="max-w-5xl mx-auto space-y-8">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">
          Program
        </h2>

        {/* Event columns */}
        {hasEvents && (
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
        )}

        {/* Festival-level slots (not tied to a specific event) */}
        {hasFestivalSlots && (
          <div className="space-y-1 max-w-2xl">
            {!hasEvents && null}
            {festivalSlots.map((slot, i) => (
              <FestivalSlotRow key={i} slot={slot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
