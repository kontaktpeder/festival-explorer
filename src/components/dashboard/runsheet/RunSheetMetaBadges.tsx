import { cn } from "@/lib/utils";
import { Eye, EyeOff, FileText } from "lucide-react";

interface RunSheetMetaBadgesProps {
  stageLabel?: string | null;
  visibility: string;
  internalStatus: string;
  hasContract: boolean;
  slotTypeLabel?: string;
  isLydprøve?: boolean;
  isParallel?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Bekreftet",
  contract_pending: "Kontrakt venter",
  canceled: "Avlyst",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  contract_pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
};

export function RunSheetMetaBadges({
  stageLabel,
  visibility,
  internalStatus,
  hasContract,
  slotTypeLabel,
  isLydprøve,
  isParallel,
}: RunSheetMetaBadgesProps) {
  const isPublic = visibility === "public";

  // Lydprøve: only show stage label
  if (isLydprøve) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {stageLabel && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 bg-muted/40 text-muted-foreground font-medium">
            {stageLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {stageLabel && (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 bg-muted/40 text-muted-foreground font-medium">
          {stageLabel}
        </span>
      )}
      {slotTypeLabel && (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 bg-muted/30 text-muted-foreground">
          {slotTypeLabel}
        </span>
      )}
      <span
        className={cn(
          "text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
          STATUS_STYLES[internalStatus] ?? "bg-muted/30 text-muted-foreground border-border/40"
        )}
      >
        {STATUS_LABELS[internalStatus] ?? internalStatus}
      </span>
      <span
        className={cn(
          "text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
          isPublic
            ? "bg-emerald-500/8 text-emerald-500 border-emerald-500/15"
            : "bg-muted/30 text-muted-foreground/60 border-border/30"
        )}
      >
        {isPublic ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
        {isPublic ? "Publikum" : "Intern"}
      </span>
      {hasContract && (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent/20 bg-accent/8 text-accent inline-flex items-center gap-1">
          <FileText className="h-2.5 w-2.5" />
          Dok
        </span>
      )}
      {isParallel && (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent/20 bg-accent/8 text-accent font-medium">
          Parallell
        </span>
      )}
    </div>
  );
}
