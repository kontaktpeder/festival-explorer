import { useMemo } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { getLiveViewMode } from "@/lib/live-view-mode";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";
import {
  formatHHMM,
  getLiveSlotPlannedEndMs,
  getLiveSlotStartMs,
  nowMarkerFraction,
  progressThroughLiveSlot,
  roundLocalTimeToNearestFiveMinutes,
  shouldShowSlotKindTag,
  formatDurationLine,
} from "@/lib/live-display-time";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  wallNow: Date;
  showPrimaryActions?: boolean;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
};

export function LiveNowBlock({ items, role, wallNow, showPrimaryActions = true, onAction, acting }: Props) {
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
          wallNow={wallNow}
          showPrimaryActions={showPrimaryActions}
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
  wallNow,
  showPrimaryActions,
  vm,
  onAction,
  acting,
}: {
  item: LiveCardItem;
  wallNow: Date;
  showPrimaryActions: boolean;
  vm: ReturnType<typeof getLiveViewMode>;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
}) {
  const displayStart = useMemo(() => {
    const raw = new Date(getLiveSlotStartMs(item));
    return formatHHMM(roundLocalTimeToNearestFiveMinutes(raw));
  }, [item]);

  const endLabel = useMemo(() => formatHHMM(new Date(getLiveSlotPlannedEndMs(item))), [item]);
  const durationLine = useMemo(() => formatDurationLine(item), [item]);
  const elapsedMin = useMemo(() => {
    const m = Math.round((wallNow.getTime() - getLiveSlotStartMs(item)) / 60_000);
    return m > 0 ? m : null;
  }, [item, wallNow]);

  const progress = useMemo(() => progressThroughLiveSlot(wallNow, item), [item, wallNow]);
  const marker = useMemo(() => nowMarkerFraction(wallNow, item), [item, wallNow]);

  return (
    <div className="relative">
      {/* Vertical glow axis */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-red-500/80 via-red-500/40 to-transparent rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" />

      <div className="pl-5 md:pl-6">
        {/* Time + Title block */}
        <div className="flex items-baseline gap-3 md:gap-5">
          <span className="font-mono text-6xl md:text-8xl font-black text-white tabular-nums tracking-tighter leading-none">
            {displayStart}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-2xl md:text-4xl font-bold text-white truncate leading-tight">
              {item.title}
            </p>

            {/* Area + end time */}
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-white/30 font-medium">
              {item.areaLabel && <span>{item.areaLabel}</span>}
              {item.areaLabel && <span>·</span>}
              <span>
                slutt ca. {endLabel}
                {durationLine ? <span> · {durationLine}</span> : null}
              </span>
            </div>

            {/* Elapsed / delay context */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {elapsedMin && elapsedMin > 0 && item.delayMinutes <= 0 && (
                <span className="text-xs text-white/30 font-medium">
                  Startet for {elapsedMin} min siden
                </span>
              )}
              {item.delayMinutes > 0 && (
                <span className="text-xs font-bold text-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.3)]">
                  +{item.delayMinutes} min forsinket
                </span>
              )}
            </div>

            {/* Context row */}
            {vm.showContext && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {vm.showRichContext && shouldShowSlotKindTag(item.slotTypeLabel) && (
                  <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    {item.slotTypeLabel}
                  </span>
                )}
                {vm.showRichContext && item.badges.hasTechRider && (
                  <span className="text-[10px] text-white/25 border border-white/[0.08] rounded px-1.5 py-0.5">Tech</span>
                )}
                {vm.showRichContext && item.badges.hasHospRider && (
                  <span className="text-[10px] text-white/25 border border-white/[0.08] rounded px-1.5 py-0.5">Hosp</span>
                )}
                {vm.showRichContext && item.badges.hasContract && (
                  <span className="text-[10px] text-white/25 border border-white/[0.08] rounded px-1.5 py-0.5">Kontrakt</span>
                )}
              </div>
            )}

            {/* Notes */}
            {vm.showNotes && item.shortNote && (
              <p className="text-sm text-white/30 mt-2 line-clamp-2">{item.shortNote}</p>
            )}
          </div>
        </div>

        {/* Progress bar with now marker */}
        {progress !== null && (
          <div className="mt-5">
            <div className="relative h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: item.delayMinutes > 0
                    ? 'linear-gradient(90deg, rgba(250,204,21,0.5), rgba(239,68,68,0.8))'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.4), rgba(239,68,68,0.8))',
                  boxShadow: item.delayMinutes > 0
                    ? '0 0 10px rgba(250,204,21,0.5)'
                    : '0 0 8px rgba(239,68,68,0.5)',
                }}
              />
              {marker !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                  style={{ left: `${marker * 100}%`, marginLeft: '-4px' }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/15">Start</span>
              <span className="text-[10px] text-white/20 font-medium">Nå</span>
              <span className="text-[10px] text-white/15">Slutt</span>
            </div>
          </div>
        )}

        {/* Action controls */}
        {vm.showActions && onAction && (
          <div className="flex items-center gap-4 mt-6">
            {showPrimaryActions && (
              <>
                <button
                  className="flex-1 md:flex-none min-h-[56px] md:min-h-[52px] px-10 rounded-lg bg-white text-black font-bold text-sm uppercase tracking-wider transition-all duration-150 active:scale-[0.96] active:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                  disabled={acting}
                  onClick={() => onAction(item.id, "complete")}
                >
                  <CheckCircle className="h-4 w-4 inline mr-2 -mt-0.5" />
                  Ferdig
                </button>
                <button
                  className="min-h-[56px] md:min-h-[52px] px-7 rounded-lg border border-white/15 text-white/70 font-semibold text-sm uppercase tracking-wider transition-all duration-150 active:scale-[0.96] active:bg-white/[0.06] active:shadow-[0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={acting}
                  onClick={() => onAction(item.id, "delay5")}
                >
                  <Clock className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  +5 min
                </button>
              </>
            )}
            {vm.showCancel && (
              <button
                className="min-h-[56px] md:min-h-[52px] px-5 rounded-lg text-white/25 font-medium text-sm uppercase tracking-wider transition-all duration-150 active:scale-[0.96] active:text-red-400 active:shadow-[0_0_12px_rgba(239,68,68,0.2)] disabled:opacity-30 disabled:cursor-not-allowed"
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
    <p className="text-[10px] uppercase tracking-[0.2em] text-red-500/50 font-bold">
      {children}
    </p>
  );
}
