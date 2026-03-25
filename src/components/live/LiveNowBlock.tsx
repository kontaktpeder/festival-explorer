import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import { Badge } from "@/components/ui/badge";

type Props = {
  items: LiveCardItem[];
  showNotes?: boolean;
};

export function LiveNowBlock({ items, showNotes = true }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/40 p-8 text-center">
        <p className="text-muted-foreground text-sm">Ingen poster er live akkurat nå</p>
      </div>
    );
  }

  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-destructive font-semibold mb-2">
        Nå
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 flex items-center gap-4"
          >
            <span className="font-mono text-lg font-bold text-foreground w-14 shrink-0">
              {item.timeLabel}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
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
              {showNotes && item.shortNote && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.shortNote}</p>
              )}
            </div>
            <LiveDocBadges badges={item.badges} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveDocBadges({ badges }: { badges: LiveCardItem["badges"] }) {
  const items: string[] = [];
  if (badges.hasTechRider) items.push("TR");
  if (badges.hasHospRider) items.push("HR");
  if (badges.hasContract) items.push("K");
  if (!items.length) return null;
  return (
    <div className="flex gap-1 shrink-0">
      {items.map((label) => (
        <span
          key={label}
          className="h-6 w-6 rounded bg-accent/10 text-accent text-[9px] font-bold flex items-center justify-center"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
