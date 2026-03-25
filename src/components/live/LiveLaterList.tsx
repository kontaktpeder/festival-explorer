import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  maxItems?: number;
};

export function LiveLaterList({ items, role, maxItems = 8 }: Props) {
  const vm = getLiveViewMode(role);

  if (!items.length) return null;

  const visible = items.slice(0, maxItems);
  const remaining = items.length - visible.length;

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/15 font-bold mb-1">
        Kommer ({items.length})
      </p>
      <div>
        {visible.map((item, i) => {
          const opacity = Math.max(0.12, 0.45 - i * 0.05);
          return (
            <div
              key={item.id}
              className="border-t border-white/[0.03] flex items-center gap-3 py-1.5 md:py-2"
            >
              <span
                className="font-mono text-xs tabular-nums w-10 shrink-0"
                style={{ color: `rgba(255,255,255,${opacity})` }}
              >
                {item.timeLabel}
              </span>
              <p
                className="text-sm truncate flex-1"
                style={{ color: `rgba(255,255,255,${opacity * 0.85})` }}
              >
                {item.title}
              </p>
              {vm.showContext && item.areaLabel && (
                <span className="text-[10px] text-white/10 shrink-0 hidden md:inline">
                  {item.areaLabel}
                </span>
              )}
              {vm.showRichContext && item.slotTypeLabel && (
                <span className="text-[10px] text-white/8 border border-white/[0.04] rounded px-1 py-0 shrink-0 hidden md:inline">
                  {item.slotTypeLabel}
                </span>
              )}
            </div>
          );
        })}
        {remaining > 0 && (
          <p className="text-[10px] text-white/10 py-1.5">
            + {remaining} til
          </p>
        )}
      </div>
    </section>
  );
}
