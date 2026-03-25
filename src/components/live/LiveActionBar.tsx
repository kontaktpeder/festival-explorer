import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Clock, XCircle } from "lucide-react";
import type { LiveAction } from "@/lib/runsheet-live";

type Props = {
  slotId: string;
  liveStatus: string;
  canStartDelayComplete: boolean;
  canCancel: boolean;
  onAction: (slotId: string, action: LiveAction) => void;
  disabled?: boolean;
};

export function LiveActionBar({
  slotId,
  liveStatus,
  canStartDelayComplete,
  canCancel,
  onAction,
  disabled,
}: Props) {
  if (!canStartDelayComplete && !canCancel) return null;

  return (
    <div className="flex items-center gap-1.5">
      {canStartDelayComplete && liveStatus === "not_started" && (
        <Button
          size="sm"
          variant="default"
          className="text-xs h-7 px-2.5"
          disabled={disabled}
          onClick={() => onAction(slotId, "start")}
        >
          <Play className="h-3 w-3 mr-1" />
          Start
        </Button>
      )}
      {canStartDelayComplete && liveStatus === "in_progress" && (
        <>
          <Button
            size="sm"
            variant="default"
            className="text-xs h-7 px-2.5"
            disabled={disabled}
            onClick={() => onAction(slotId, "complete")}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Ferdig
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2.5"
            disabled={disabled}
            onClick={() => onAction(slotId, "delay5")}
          >
            <Clock className="h-3 w-3 mr-1" />
            +5 min
          </Button>
        </>
      )}
      {canCancel && (liveStatus === "not_started" || liveStatus === "in_progress") && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2 text-muted-foreground"
          disabled={disabled}
          onClick={() => onAction(slotId, "cancel")}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Avlys
        </Button>
      )}
    </div>
  );
}
