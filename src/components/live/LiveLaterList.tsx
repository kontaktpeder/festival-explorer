import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import { Badge } from "@/components/ui/badge";

type Props = {
  items: LiveCardItem[];
};

export function LiveLaterList({ items }: Props) {
  if (!items.length) return null;

  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">
        Senere ({items.length})
      </p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/20 bg-card/30 px-4 py-3 flex items-center gap-3"
          >
            <span className="font-mono text-sm text-muted-foreground w-12 shrink-0">
              {item.timeLabel}
            </span>
            <p className="text-sm text-foreground/80 truncate flex-1">{item.title}</p>
            {item.areaLabel && (
              <span className="text-[10px] text-muted-foreground shrink-0">{item.areaLabel}</span>
            )}
            {item.delayMinutes > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 shrink-0">
                +{item.delayMinutes}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
