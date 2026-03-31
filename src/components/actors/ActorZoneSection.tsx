import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ActorCard } from "./ActorCard";
import type { ActorItem, ActorZoneKey } from "@/hooks/useEventActors";

interface ActorZoneSectionProps {
  zoneKey: ActorZoneKey;
  label: string;
  items: ActorItem[];
  onAddClick: (zone: ActorZoneKey) => void;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  onRemove: (id: string) => void;
  onChangeZone: (id: string, zone: ActorZoneKey) => void;
  onChangeLiveRole: (id: string, role: string) => void;
}

export function ActorZoneSection({
  zoneKey,
  label,
  items,
  onAddClick,
  onResend,
  onRevoke,
  onRemove,
  onChangeZone,
  onChangeLiveRole,
}: ActorZoneSectionProps) {
  const [open, setOpen] = useState(true);
  const count = items.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between py-2">
        <CollapsibleTrigger className="flex items-center gap-2 group">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
            {count}
          </span>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => onAddClick(zoneKey)}
        >
          <Plus className="h-3 w-3" />
          Legg til
        </Button>
      </div>

      <CollapsibleContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground/40 py-4 text-center">
            Ingen aktører i denne sonen
          </p>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => {
              const key = item.type === "participant"
                ? `p-${item.data.id}`
                : `i-${item.data.id}`;
              return (
                <ActorCard
                  key={key}
                  item={item}
                  currentZone={zoneKey}
                  onResend={onResend}
                  onRevoke={onRevoke}
                  onRemove={
                    item.type === "participant"
                      ? onRemove
                      : item.status === "declined"
                      ? onRevoke // For declined, "remove" = revoke
                      : undefined
                  }
                  onChangeZone={item.type === "participant" ? onChangeZone : undefined}
                  onChangeLiveRole={item.type === "participant" ? onChangeLiveRole : undefined}
                />
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
