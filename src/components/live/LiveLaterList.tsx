import type { LiveCardItem } from "@/lib/runsheet-live-view-model";

type Props = {
  items: LiveCardItem[];
  maxItems?: number;
};

export function LiveLaterList({ items, maxItems = 5 }: Props) {
  if (!items.length) return null;

  const visible = items.slice(0, maxItems);
  const remaining = items.length - visible.length;

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-bold mb-2">
        Kommer ({items.length})
      </p>
      <div className="space-y-1">
        {visible.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/15 bg-card/20 px-4 py-2.5 flex items-center gap-3"
          >
            <span className="font-mono text-xs text-muted-foreground/70 tabular-nums w-10 shrink-0">
              {item.timeLabel}
            </span>
            <p className="text-sm text-foreground/60 truncate flex-1">{item.title}</p>
            {item.areaLabel && (
              <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden md:inline">
                {item.areaLabel}
              </span>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <p className="text-[10px] text-muted-foreground/40 text-center py-1">
            + {remaining} til
          </p>
        )}
      </div>
    </section>
  );
}
