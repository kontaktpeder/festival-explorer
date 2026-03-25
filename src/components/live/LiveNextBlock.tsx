import { useMemo } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
};

function minutesUntil(timeLabel: string): string | null {
  const now = new Date();
  const [h, m] = timeLabel.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diff <= 0 || diff > 180) return null;
  return `om ${diff} min`;
}

export function LiveNextBlock({ items, role, onAction, acting }: Props) {
  const vm = getLiveViewMode(role);

  if (!items.length) return null;

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.15em] text-accent-foreground/70 font-bold mb-2">
        Neste
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <NextCard
            key={item.id}
            item={item}
            vm={vm}
            onAction={onAction}
            acting={acting}
          />
        ))}
      </div>
    </section>
  );
}

function NextCard({
  item,
  vm,
  onAction,
  acting,
}: {
  item: LiveCardItem;
  vm: ReturnType<typeof getLiveViewMode>;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
}) {
  const countdown = useMemo(() => minutesUntil(item.timeLabel), [item.timeLabel]);

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 md:p-5">
      <div className="flex items-center gap-4">
        <span className="font-mono text-base md:text-lg font-semibold text-foreground tabular-nums w-14 shrink-0">
          {item.timeLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-semibold text-foreground truncate">{item.title}</p>
          {vm.showContext && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {item.areaLabel && (
                <span className="text-[11px] text-muted-foreground">{item.areaLabel}</span>
              )}
              {vm.showRichContext && item.slotTypeLabel && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {item.slotTypeLabel}
                </Badge>
              )}
              {item.delayMinutes > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  +{item.delayMinutes} min
                </Badge>
              )}
              {countdown && (
                <span className="text-[10px] text-muted-foreground font-medium">{countdown}</span>
              )}
            </div>
          )}
          {/* Viewer still sees countdown even without full context */}
          {vm.showMinimal && countdown && (
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">{countdown}</span>
          )}
          {vm.showNotes && item.shortNote && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.shortNote}</p>
          )}
        </div>
      </div>

      {vm.showActions && onAction && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-accent/20">
          <Button
            size="lg"
            className="flex-1 md:flex-none min-h-[44px] text-sm font-semibold"
            disabled={acting}
            onClick={() => onAction(item.id, "start")}
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
          {vm.showCancel && (
            <Button
              size="lg"
              variant="ghost"
              className="min-h-[44px] text-sm text-muted-foreground"
              disabled={acting}
              onClick={() => onAction(item.id, "cancel")}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Avlys
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
