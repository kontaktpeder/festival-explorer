import type { LiveCardItem } from "@/lib/runsheet-live-view-model";
import type { LiveRolePreset } from "@/types/live-role";
import { roleToSurface, isFieldVisible, isFieldBadge, getLiveActions } from "@/lib/field-view-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";

type Props = {
  items: LiveCardItem[];
  role: LiveRolePreset;
  onAction?: (slotId: string, action: LiveAction) => void;
  acting?: boolean;
};

export function LiveNowBlock({ items, role, onAction, acting }: Props) {
  const surface = roleToSurface(role);
  const actions = getLiveActions(role);

  if (!items.length) {
    return (
      <section>
        <SectionLabel>Nå</SectionLabel>
        <div className="rounded-2xl border border-border/30 bg-card/40 p-8 md:p-12 text-center">
          <p className="text-muted-foreground text-sm">Ingen poster er live akkurat nå</p>
        </div>
      </section>
    );
  }

  const showStageLabel = isFieldVisible("stage_label", surface);
  const showSlotType = isFieldVisible("slot_type", surface);
  const showDelay = isFieldVisible("delay_minutes", surface);
  const showInternalNote = isFieldVisible("internal_note", surface);
  const showLiveNote = isFieldVisible("live_note", surface);
  const showRiders = isFieldVisible("tech_rider_asset_id", surface);
  const showContract = isFieldVisible("contract_media_id", surface);
  const showLiveStatus = isFieldVisible("live_status", surface);
  const hasAnyAction = actions.complete || actions.delay5 || actions.cancel;

  return (
    <section>
      <SectionLabel>Nå</SectionLabel>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-4 md:p-6"
          >
            {/* Top row: time + title */}
            <div className="flex items-start gap-4">
              <span className="font-mono text-2xl md:text-3xl font-bold text-foreground tabular-nums shrink-0">
                {item.timeLabel}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-lg md:text-xl font-bold text-foreground truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {showStageLabel && item.areaLabel && (
                    <span className="text-xs text-muted-foreground">{item.areaLabel}</span>
                  )}
                  {showSlotType && item.slotTypeLabel && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {item.slotTypeLabel}
                    </Badge>
                  )}
                  {showDelay && item.delayMinutes > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      +{item.delayMinutes} min forsinket
                    </Badge>
                  )}
                  {showLiveStatus && item.liveStatus !== "not_started" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.liveStatus}
                    </Badge>
                  )}
                  {showRiders && item.badges.hasTechRider && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Tech</Badge>
                  )}
                  {showRiders && item.badges.hasHospRider && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Hosp</Badge>
                  )}
                  {showContract && item.badges.hasContract && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Kontrakt</Badge>
                  )}
                </div>
                {showInternalNote && item.shortNote && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.shortNote}</p>
                )}
                {showLiveNote && (item as any).liveNote && (
                  <p className="text-xs text-accent-foreground mt-1 italic line-clamp-2">
                    {(item as any).liveNote}
                  </p>
                )}
              </div>
            </div>

            {/* Actions — driven by matrix */}
            {hasAnyAction && onAction && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-destructive/20">
                {actions.complete && (
                  <Button
                    size="lg"
                    className="flex-1 md:flex-none min-h-[44px] text-sm font-semibold"
                    disabled={acting}
                    onClick={() => onAction(item.id, "complete")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ferdig
                  </Button>
                )}
                {actions.delay5 && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-[44px] text-sm"
                    disabled={acting}
                    onClick={() => onAction(item.id, "delay5")}
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    +5 min
                  </Button>
                )}
                {actions.cancel && (
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
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-destructive font-bold mb-2">
      {children}
    </p>
  );
}
