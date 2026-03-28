import { useMemo } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";
import { Play, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";
import { displayRoundedPlanTime, formatMinutesUntil, shouldShowSlotKindTag } from "@/lib/live-display-time";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  wallNow: Date;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
};

export function LiveNextBlock({ items, role, wallNow, onAction, acting }: Props) {
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
            wallNow={wallNow}
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
  wallNow,
  vm,
  onAction,
  acting,
}: {
  item: LiveCardItem;
  wallNow: Date;
  vm: ReturnType<typeof getLiveViewMode>;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
}) {
  const countdown = useMemo(() => formatMinutesUntil(item.effectiveStartMs, wallNow), [item.effectiveStartMs, wallNow]);

  return (
    <div className="border-t border-white/[0.06] py-3">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xl md:text-2xl font-bold text-white/80 tabular-nums w-16 shrink-0">
          {displayRoundedPlanTime(item)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base md:text-lg font-semibold text-white/80 truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {vm.showContext && item.areaLabel && (
              <span className="text-[11px] text-white/25">{item.areaLabel}</span>
            )}
            {vm.showRichContext && shouldShowSlotKindTag(item.slotTypeLabel) && (
              <span className="text-[10px] text-white/20 border border-white/[0.08] rounded px-1.5 py-0">
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
