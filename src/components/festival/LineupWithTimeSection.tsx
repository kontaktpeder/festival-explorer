import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type ProgramSlotItem = {
  event_id: string;
  starts_at: string;
  ends_at?: string | null;
  name: string | null;
  slug: string | null;
  entity_id: string | null;
  slot_kind?: string;
};

interface LineupWithTimeSectionProps {
  slots: ProgramSlotItem[];
  eventIdToSlug: Record<string, string>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ZONE_CONFIG = [
  { key: "2-etasje", label: "2. ETASJE", accentClass: "text-emerald-400" },
  { key: "1-etasje", label: "1. ETASJE", accentClass: "text-accent" },
  { key: "boiler-room", label: "BOILER ROOM", accentClass: "text-foreground/60" },
] as const;

export function LineupWithTimeSection({ slots, eventIdToSlug }: LineupWithTimeSectionProps) {
  const grouped = useMemo(() => {
    const g: Record<string, ProgramSlotItem[]> = {
      "2-etasje": [],
      "1-etasje": [],
      "boiler-room": [],
    };
    slots.forEach((s) => {
      const slug = eventIdToSlug[s.event_id] ?? "1-etasje";
      if (g[slug]) g[slug].push(s);
      else g["1-etasje"].push(s);
    });
    return g;
  }, [slots, eventIdToSlug]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-10">
      {ZONE_CONFIG.map((zone) => {
        const zoneSlots = grouped[zone.key] ?? [];
        if (zoneSlots.length === 0) return null;
        return (
          <div key={zone.key} className="space-y-3">
            <h3
              className={cn(
                "text-xs font-black tracking-[0.35em] uppercase",
                zone.accentClass
              )}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {zone.label}
            </h3>
            <div className="space-y-1">
              {zoneSlots.map((slot, i) => (
                <div
                  key={`${slot.event_id}-${i}`}
                  className="flex items-baseline gap-4 py-2 border-b border-foreground/5 last:border-0"
                >
                  <span
                    className="text-sm text-muted-foreground font-mono tabular-nums w-14 flex-shrink-0"
                  >
                    {formatTime(slot.starts_at)}
                  </span>
                  <span className="flex-1">
                    {slot.slug ? (
                      <Link
                        to={`/project/${slot.slug}`}
                        className="text-lg md:text-xl font-black uppercase text-foreground/90 hover:text-accent transition-colors"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {slot.name ?? "TBA"}
                      </Link>
                    ) : (
                      <span
                        className="text-lg md:text-xl font-black uppercase text-foreground/90"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {slot.name ?? "TBA"}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
