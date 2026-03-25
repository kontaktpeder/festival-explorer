import { useState } from "react";
import type { ProductionSlot } from "@/lib/production-board-mappers";
import { ProductionCardDetails } from "./ProductionCardDetails";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  item: ProductionSlot;
  liveBasePath: string;
}

function badgeVariant(badge: string) {
  if (badge.includes("critical")) return "destructive" as const;
  if (badge.includes("high")) return "destructive" as const;
  if (badge === "Issue") return "outline" as const;
  if (badge.startsWith("Mangler")) return "secondary" as const;
  if (badge === "Klar") return "default" as const;
  return "secondary" as const;
}

export function ProductionCard({ item, liveBasePath }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { slot, signals } = item;

  const title =
    slot.title_override ||
    slot.performer_entity?.name ||
    slot.performer_persona?.name ||
    slot.performer_name_override ||
    "Uten tittel";

  const timeStr = slot.starts_at
    ? format(new Date(slot.starts_at), "HH:mm", { locale: nb })
    : "—";

  return (
    <div
      className={cn(
        "transition-colors",
        expanded && "bg-muted/20",
        slot.is_canceled && "opacity-50",
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
      >
        <span className="text-xs font-mono text-muted-foreground w-12 shrink-0 tabular-nums">
          {timeStr}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block truncate">
            {title}
            {slot.is_canceled && (
              <span className="text-destructive ml-1.5 text-[10px] font-semibold">AVLYST</span>
            )}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {slot.stage_label && (
              <span className="text-[10px] text-muted-foreground">
                {slot.stage_label}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60">{slot.slot_kind}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[200px]">
          {signals.badges.map((b) => (
            <Badge
              key={b}
              variant={badgeVariant(b)}
              className="text-[9px] px-1.5 py-0"
            >
              {b}
            </Badge>
          ))}
        </div>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <ProductionCardDetails item={item} liveBasePath={liveBasePath} />
      )}
    </div>
  );
}
