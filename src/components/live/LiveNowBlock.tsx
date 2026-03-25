import { useMemo } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
};

function elapsedProgress(item: LiveCardItem): number | null {
  if (!item.durationMinutes || item.durationMinutes <= 0) return null;
  const now = new Date();
  const [h, m] = item.timeLabel.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const elapsed = (now.getTime() - start.getTime()) / 60_000;
  const pct = Math.max(0, Math.min(100, (elapsed / item.durationMinutes) * 100));
  return pct;
}

export function LiveNowBlock({ items, role, onAction, acting }: Props) {
  const vm = getLiveViewMode(role);

  if (!items.length) {
    return (
      <section className="flex-1 flex items-center justify-center">
        <p className="text-white/20 text-lg font-medium">Ingen poster er live akkurat nå</p>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col gap-6">
      <SectionLabel>Nå</SectionLabel>
      {items.map((item) => (
        <NowSlot
          key={item.id}
          item={item}
          vm={vm}
          onAction={onAction}
          acting={acting}
        />
      ))}
    </section>
  );
}

function NowSlot({
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
  const progress = useMemo(() => elapsedProgress(item), [item]);

  return (
    <div className="relative">
      {/* Subtle glow line left */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-red-500/80 via-red-500/40 to-transparent rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" />

      <div className="pl-5 md:pl-6">
        {/* Time + Title */}
        <div className="flex items-baseline gap-4 md:gap-6">
          <span className="font-mono text-5xl md:text-7xl font-bold text-white tabular-nums tracking-tight leading-none">
            {item.timeLabel}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-2xl md:text-3xl font-bold text-white truncate leading-tight">
              {item.title}
            </p>

            {/* Context row */}
            {vm.showContext && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {item.areaLabel && (
                  <span className="text-xs text-white/40 font-medium">{item.areaLabel}</span>
                )}
                {vm.showRichContext && item.slotTypeLabel && (
                  <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    {item.slotTypeLabel}
                  </span>
                )}
                {item.delayMinutes > 0 && (
                  <span className="text-xs font-bold text-yellow-400">
                    +{item.delayMinutes} min forsinket
                  </span>
                )}
                {vm.showRichContext && item.badges.hasTechRider && (
                  <span className="text-[10px] text-white/25 border border-white/8 rounded px-1.5 py-0.5">Tech</span>
                )}
                {vm.showRichContext && item.badges.hasHospRider && (
                  <span className="text-[10px] text-white/25 border border-white/8 rounded px-1.5 py-0.5">Hosp</span>
                )}
                {vm.showRichContext && item.badges.hasContract && (
                  <span className="text-[10px] text-white/25 border border-white/8 rounded px-1.5 py-0.5">Kontrakt</span>
                )}
              </div>
            )}

            {/* Notes */}
            {vm.showNotes && item.shortNote && (
              <p className="text-sm text-white/30 mt-2 line-clamp-2">{item.shortNote}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-4 h-[2px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500/60 to-red-400/80 rounded-full transition-all duration-1000 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        {vm.showActions && onAction && (
          <div className="flex items-center gap-3 mt-5">
            <button
              className="flex-1 md:flex-none min-h-[52px] md:min-h-[48px] px-8 rounded-lg bg-white text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.97] active:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              disabled={acting}
              onClick={() => onAction(item.id, "complete")}
            >
              <CheckCircle className="h-4 w-4 inline mr-2 -mt-0.5" />
              Ferdig
            </button>
            <button
              className="min-h-[52px] md:min-h-[48px] px-6 rounded-lg border border-white/15 text-white/70 font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.97] active:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={acting}
              onClick={() => onAction(item.id, "delay5")}
            >
              <Clock className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              +5 min
            </button>
            {vm.showCancel && (
              <button
                className="min-h-[52px] md:min-h-[48px] px-5 rounded-lg text-white/30 font-medium text-sm uppercase tracking-wider transition-all active:scale-[0.97] active:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={acting}
                onClick={() => onAction(item.id, "cancel")}
              >
                <XCircle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Avlys
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-red-500/70 font-bold">
      {children}
    </p>
  );
}
