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
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
        Program
      </h2>

      {/* Timeline list */}
      <div className="divide-y divide-border/10">
        {slots.map((slot, index) => {
          const config = getSlotKindConfig(slot.slot_kind);
          const Icon = config.icon;
          const entity = slot.entity;
          const isHighlighted = slot.id === highlightSlotId;
          const isHeadliner = entity && headlinerSet.has(entity.id);
          const entityRoute = entity?.type
            ? getEntityPublicRoute(entity.type, entity.slug, entityTypes || [])
            : null;
          const isPerformance = HIGHLIGHT_KINDS.includes(slot.slot_kind);

          return (
            <div
              key={slot.id}
              className={`group relative flex items-center gap-3 py-3 transition-colors duration-150
                ${slot.is_canceled ? "opacity-30" : ""}
                ${isHighlighted ? "border-l-2 border-accent pl-3 -ml-3" : ""}
                ${!isPerformance && !slot.is_canceled ? "opacity-50" : ""}
                sm:hover:bg-muted/10 sm:hover:rounded-md
              `}
            >
              {/* Inline "NESTE" / "NÅ" chip */}
              {isHighlighted && (
                <span className="absolute -top-2.5 left-3 text-[9px] uppercase tracking-widest text-accent font-bold bg-background px-1.5">
                  {highlightLabel}
                </span>
              )}

              {/* Time + Icon (left) */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground/50 tabular-nums">
                  {format(new Date(slot.starts_at), "HH:mm", { locale: nb })}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Name (right) */}
              <div className="min-w-0 flex items-center gap-2">
                {slot.is_canceled ? (
                  <span className="text-sm text-muted-foreground line-through">
                    {entity?.name ?? config.label}
                  </span>
                ) : entity && entityRoute ? (
                  <Link
                    to={entityRoute}
                    className={`text-sm transition-colors sm:group-hover:underline underline-offset-2 ${
                      isPerformance ? "font-medium hover:text-accent" : "text-muted-foreground/60"
                    }`}
                  >
                    {entity.name}
                  </Link>
                ) : entity?.name ? (
                  <span className={`text-sm ${isPerformance ? "font-medium text-foreground/80" : "text-muted-foreground/60"}`}>
                    {entity.name}
                  </span>
                ) : isPerformance && !entity ? (
                  <span className="text-sm text-muted-foreground/40 italic">TBA</span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">{config.label}</span>
                )}
                {isHeadliner && !slot.is_canceled && (
                  <span className="text-[9px] uppercase tracking-widest text-accent/70 font-semibold">
                    Headliner
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
