import { useMemo } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">
        Neste
      </p>
      <div className="space-y-0">
        {items.map((item) => (
          <NextRow
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

function NextRow({
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
    <div className="border-t border-white/[0.06] py-3">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xl md:text-2xl font-bold text-white/80 tabular-nums w-16 shrink-0">
          {item.timeLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base md:text-lg font-semibold text-white/80 truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {vm.showContext && item.areaLabel && (
              <span className="text-[11px] text-white/25">{item.areaLabel}</span>
            )}
            {vm.showRichContext && item.slotTypeLabel && (
              <span className="text-[10px] text-white/20 border border-white/8 rounded px-1.5 py-0">
                {item.slotTypeLabel}
              </span>
            )}
            {item.delayMinutes > 0 && (
              <span className="text-[10px] font-bold text-yellow-400">
                +{item.delayMinutes} min
              </span>
            )}
            {countdown && (
              <span className="text-xs text-white/40 font-semibold">{countdown}</span>
            )}
          </div>
          {vm.showNotes && item.shortNote && (
            <p className="text-[11px] text-white/20 mt-1 truncate">{item.shortNote}</p>
          )}
        </div>

        {/* Inline start action */}
        {vm.showActions && onAction && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="min-h-[48px] px-6 rounded-lg border border-white/15 text-white/70 font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.96] active:bg-white/[0.06] active:shadow-[0_0_10px_rgba(255,255,255,0.05)] disabled:opacity-30"
              disabled={acting}
              onClick={() => onAction(item.id, "start")}
            >
              <Play className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Start
            </button>
            {vm.showCancel && (
              <button
                className="min-h-[48px] px-3 rounded-lg text-white/20 text-xs transition-all duration-150 active:text-red-400 active:shadow-[0_0_8px_rgba(239,68,68,0.15)] disabled:opacity-30"
                disabled={acting}
                onClick={() => onAction(item.id, "cancel")}
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
