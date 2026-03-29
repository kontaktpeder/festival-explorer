import { useState } from "react";
import type { ProductionContributor } from "@/lib/production-board-mappers";
import { contributorDocumentStatus } from "@/lib/production-board-mappers";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Music, User, Type, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Props {
  contributor: ProductionContributor;
}

const kindIcon = {
  entity: Music,
  persona: User,
  text: Type,
} as const;

function badgeVariant(badge: string) {
  if (badge.includes("critical")) return "destructive" as const;
  if (badge.includes("high")) return "destructive" as const;
  if (badge === "Issue") return "outline" as const;
  if (badge.startsWith("Mangler")) return "secondary" as const;
  if (badge === "Klar") return "default" as const;
  return "secondary" as const;
}

export function ContributorCard({ contributor }: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = kindIcon[contributor.kind];
  const docStatus = contributorDocumentStatus(contributor);

  return (
    <div className={cn("transition-colors", expanded && "bg-muted/20")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block truncate">
            {contributor.name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {contributor.stageLabels.map((s) => (
              <span key={s} className="text-[10px] text-muted-foreground">{s}</span>
            ))}
            {contributor.slotKinds.map((k) => (
              <span key={k} className="text-[10px] text-muted-foreground/60">{k}</span>
            ))}
            <span className="text-[10px] text-muted-foreground/40">
              {contributor.slots.length} {contributor.slots.length === 1 ? "post" : "poster"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[200px]">
          {contributor.signals.badges.map((b) => (
            <Badge key={b} variant={badgeVariant(b)} className="text-[9px] px-1.5 py-0">
              {b}
            </Badge>
          ))}
        </div>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-3 pl-11 space-y-3">
          {/* Document status summary */}
          {(docStatus.missingTechRider || docStatus.missingContract || docStatus.missingHospRider) ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              <FileText className="h-3 w-3 text-muted-foreground/50" />
              {docStatus.missingTechRider && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Mangler tech rider
                </span>
              )}
              {docStatus.missingHospRider && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Mangler hosp rider
                </span>
              )}
              {docStatus.missingContract && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Mangler kontrakt
                </span>
              )}
            </div>
          ) : docStatus.allComplete && contributor.slots.some(s => s.slot.slot_kind === "concert" || s.slot.slot_kind === "soundcheck") ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-600">Alle dokumenter på plass</span>
            </div>
          ) : null}

          {/* Linked slots */}
          {contributor.slots.map((item) => {
            const { slot, signals } = item;
            const time = slot.starts_at
              ? format(new Date(slot.starts_at), "HH:mm", { locale: nb })
              : "—";
            const title =
              slot.title_override || slot.performer_name_override || slot.slot_kind;
            return (
              <div key={slot.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground w-10 tabular-nums shrink-0">{time}</span>
                <span className="text-foreground truncate flex-1">
                  {title}
                  {slot.stage_label && (
                    <span className="text-muted-foreground ml-1">· {slot.stage_label}</span>
                  )}
                </span>
                <div className="flex gap-1 shrink-0">
                  {signals.badges.filter(b => b !== "Klar").map((b) => (
                    <Badge key={b} variant={badgeVariant(b)} className="text-[8px] px-1 py-0">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
