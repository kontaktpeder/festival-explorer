import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import { Badge } from "@/components/ui/badge";

type Props = {
  items: LiveCardItem[];
};

export function LiveNextBlock({ items }: Props) {
  if (!items.length) return null;

  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-2">
        Neste
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-4"
          >
            <span className="font-mono text-base font-semibold text-foreground w-14 shrink-0">
              {item.timeLabel}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.areaLabel && (
                  <span className="text-[11px] text-muted-foreground">{item.areaLabel}</span>
                )}
                {item.slotTypeLabel && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {item.slotTypeLabel}
                  </Badge>
                )}
                {item.delayMinutes > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    +{item.delayMinutes} min
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
