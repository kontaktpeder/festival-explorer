import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Link } from "react-router-dom";
import { getSlotKindConfig } from "@/lib/program-slots";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { Badge } from "@/components/ui/badge";
import type { EventProgramSlot } from "@/types/database";

interface EventProgramSlotsProps {
  slots: EventProgramSlot[];
}

export function EventProgramSlots({ slots }: EventProgramSlotsProps) {
  const { data: entityTypes } = useEntityTypes();

  if (!slots || slots.length === 0) return null;

  const now = new Date();
  const activeSlot = slots.find(
    (s) => !s.is_canceled && s.ends_at && new Date(s.starts_at) <= now && new Date(s.ends_at) >= now
  );
  const nextSlot = !activeSlot
    ? slots.find((s) => !s.is_canceled && new Date(s.starts_at) > now)
    : null;
  const highlightSlot = activeSlot || nextSlot;
  const highlightLabel = activeSlot ? "Nå" : "Neste";

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
        Program
      </h2>
      <p className="text-muted-foreground/60 text-sm mb-5">
        Billetten gjelder alle konserter på denne scenen – og flere opplevelser i festivalen.
      </p>

      {highlightSlot && (
        <div className="mb-5 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
            {highlightLabel}
          </span>
          <p className="text-sm font-medium mt-0.5">
            {format(new Date(highlightSlot.starts_at), "HH:mm", { locale: nb })}{" "}
            {highlightSlot.entity?.name ?? getSlotKindConfig(highlightSlot.slot_kind).label}
          </p>
        </div>
      )}

      <div className="space-y-0">
        {slots.map((slot) => {
          const config = getSlotKindConfig(slot.slot_kind);
          const Icon = config.icon;
          const entity = slot.entity;
          const isNow =
            slot.ends_at &&
            new Date(slot.starts_at) <= now &&
            new Date(slot.ends_at) >= now;
          const entityRoute = entity?.type
            ? getEntityPublicRoute(entity.type, entity.slug, entityTypes || [])
            : null;

          return (
            <div
              key={slot.id}
              className={`flex items-center gap-3 py-3 border-b border-border/10 last:border-0 ${
                slot.is_canceled ? "opacity-50" : ""
              } ${isNow ? "bg-accent/5 -mx-2 px-2 rounded-md" : ""}`}
            >
              <div className="flex items-center gap-2 w-24 shrink-0">
                <span className="text-xs font-mono text-muted-foreground/70">
                  {format(new Date(slot.starts_at), "HH:mm", { locale: nb })}
                  {slot.ends_at &&
                    ` – ${format(new Date(slot.ends_at), "HH:mm", { locale: nb })}`}
                </span>
              </div>

              <Icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />

              <div className="flex-1 min-w-0">
                {slot.is_canceled && (
                  <Badge variant="destructive" className="text-[9px] h-4 px-1 mr-2">Avlyst</Badge>
                )}
                {entity && entityRoute ? (
                  <Link
                    to={entityRoute}
                    className="text-sm font-medium hover:text-accent transition-colors"
                  >
                    {entity.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">{entity?.name || config.label}</span>
                )}
                {entity?.tagline && (
                  <p className="text-xs text-muted-foreground/50 truncate">{entity.tagline}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
