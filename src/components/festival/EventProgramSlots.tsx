import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Link } from "react-router-dom";
import { getSlotKindConfig } from "@/lib/program-slots";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import type { EventProgramSlot } from "@/types/database";

interface EventProgramSlotsProps {
  slots: EventProgramSlot[];
  headlinerEntityIds?: string[];
}

export function EventProgramSlots({ slots, headlinerEntityIds = [] }: EventProgramSlotsProps) {
  const { data: entityTypes } = useEntityTypes();

  if (!slots || slots.length === 0) return null;

  const now = new Date();
  const HIGHLIGHT_KINDS = ["concert", "boiler", "stage_talk"];
  const activeSlot = slots.find(
    (s) => !s.is_canceled && s.ends_at && HIGHLIGHT_KINDS.includes(s.slot_kind) && new Date(s.starts_at) <= now && new Date(s.ends_at) >= now
  );
  const nextSlot = !activeSlot
    ? slots.find((s) => !s.is_canceled && HIGHLIGHT_KINDS.includes(s.slot_kind) && new Date(s.starts_at) > now)
    : null;
  const highlightSlot = activeSlot || nextSlot;
  const highlightLabel = activeSlot ? "Nå" : "Neste";
  const highlightSlotId = highlightSlot?.id;

  const headlinerSet = new Set(headlinerEntityIds);

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
        Program
      </h2>
      <p className="text-muted-foreground/60 text-sm mb-5 hidden sm:block">
        Billetten gjelder alle konserter på denne scenen – og flere opplevelser i festivalen.
      </p>

      {/* Slim highlight bar */}
      {highlightSlot && (
        <div className="mb-5 flex items-center gap-3 px-3 py-2 rounded-full bg-background/60 border border-accent/15 backdrop-blur-sm">
          <span className="text-[10px] uppercase tracking-widest text-accent font-bold shrink-0">
            {highlightLabel}
          </span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-sm font-mono text-muted-foreground/70">
            {format(new Date(highlightSlot.starts_at), "HH:mm", { locale: nb })}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {highlightSlot.entity?.name ?? getSlotKindConfig(highlightSlot.slot_kind).label}
          </span>
        </div>
      )}

      {/* Timeline list */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[68px] top-3 bottom-3 w-px bg-border/20 hidden sm:block" />

        <div>
          {slots.map((slot, index) => {
            const config = getSlotKindConfig(slot.slot_kind);
            const Icon = config.icon;
            const entity = slot.entity;
            const isHighlighted = slot.id === highlightSlotId;
            const isHeadliner = entity && headlinerSet.has(entity.id);
            const entityRoute = entity?.type
              ? getEntityPublicRoute(entity.type, entity.slug, entityTypes || [])
              : null;
            const isPerformance = ["concert", "boiler", "stage_talk"].includes(slot.slot_kind);
            const isLast = index === slots.length - 1;

            return (
              <div
                key={slot.id}
                className={`group relative flex items-start gap-0 sm:gap-0 py-2.5 sm:py-3 transition-colors duration-150 
                  ${slot.is_canceled ? "opacity-40" : ""}
                  ${isHighlighted ? "sm:-mx-3 sm:px-3 sm:rounded-lg sm:bg-accent/[0.04] border-l-2 border-accent sm:border-l-0" : "border-l-2 border-transparent"}
                  ${!isLast ? "" : ""}
                  sm:hover:bg-muted/20 sm:hover:-mx-3 sm:hover:px-3 sm:hover:rounded-lg
                `}
              >
                {/* Time column */}
                <div className="w-[60px] sm:w-[62px] shrink-0 pt-0.5 pl-2 sm:pl-0">
                  <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
                    {format(new Date(slot.starts_at), "HH:mm", { locale: nb })}
                  </span>
                </div>

                {/* Timeline dot (desktop only) */}
                <div className="hidden sm:flex w-4 shrink-0 flex-col items-center pt-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isHighlighted ? "bg-accent" : isPerformance ? "bg-muted-foreground/40" : "bg-border/40"
                  }`} />
                </div>

                {/* Icon */}
                <div className="w-6 shrink-0 pt-0.5 flex justify-center">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/30" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pl-2">
                  <div className="flex items-center gap-2">
                    {slot.is_canceled ? (
                      <span className="text-sm text-muted-foreground line-through">
                        {entity?.name ?? config.label}
                      </span>
                    ) : entity && entityRoute ? (
                      <Link
                        to={entityRoute}
                        className="text-sm font-medium hover:text-accent transition-colors sm:group-hover:underline underline-offset-2"
                      >
                        {entity.name}
                      </Link>
                    ) : entity?.name ? (
                      <span className="text-sm font-medium text-foreground/80">{entity.name}</span>
                    ) : isPerformance && !entity ? (
                      <span className="text-sm text-muted-foreground/50 italic">TBA</span>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">{config.label}</span>
                    )}
                    {isHeadliner && !slot.is_canceled && (
                      <span className="text-[9px] uppercase tracking-widest text-accent/70 font-semibold">
                        Headliner
                      </span>
                    )}
                  </div>
                </div>

                {/* End time (desktop) */}
                {slot.ends_at && (
                  <span className="hidden sm:block text-[10px] font-mono text-muted-foreground/30 tabular-nums shrink-0 pt-1">
                    {format(new Date(slot.ends_at), "HH:mm", { locale: nb })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
