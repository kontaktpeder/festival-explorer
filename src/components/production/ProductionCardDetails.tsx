import { Link } from "react-router-dom";
import type { ProductionSlot } from "@/lib/production-board-mappers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Radio } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Props {
  item: ProductionSlot;
  liveBasePath: string;
}

export function ProductionCardDetails({ item, liveBasePath }: Props) {
  const { slot, signals, issues } = item;

  const title =
    slot.title_override ||
    slot.performer_entity?.name ||
    slot.performer_persona?.name ||
    slot.performer_name_override ||
    "Uten tittel";

  return (
    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/20">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Tid:</span>{" "}
          {slot.starts_at
            ? format(new Date(slot.starts_at), "HH:mm", { locale: nb })
            : "—"}
          {slot.ends_at &&
            ` – ${format(new Date(slot.ends_at), "HH:mm", { locale: nb })}`}
        </div>
        <div>
          <span className="text-muted-foreground">Scene:</span>{" "}
          {slot.stage_label || "Ikke satt"}
        </div>
        <div>
          <span className="text-muted-foreground">Type:</span> {slot.slot_kind}
        </div>
        <div>
          <span className="text-muted-foreground">Navn:</span> {title}
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Issues ({issues.length})
          </p>
          {issues.map((iss) => (
            <div
              key={iss.id}
              className="flex items-center gap-2 text-xs"
            >
              <Badge
                variant={
                  iss.severity === "critical" || iss.severity === "high"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[9px] px-1.5 py-0"
              >
                {iss.severity}
              </Badge>
              <span className="text-muted-foreground">
                {iss.type.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Status signals */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <StatusRow label="Rider" ok={!signals.missingTechRider} />
          <StatusRow label="Kontrakt" ok={!signals.missingContract} />
          <StatusRow label="Crew/scene" ok={!signals.missingCrew} />
        </div>
      </div>

      {/* Internal note */}
      {slot.internal_note && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Notat
          </p>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {slot.internal_note}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2 pt-1">
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to={liveBasePath}>
            <Radio className="h-3 w-3 mr-1.5" />
            Åpne Live
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {ok ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      ) : (
        <XCircle className="h-3 w-3 text-destructive" />
      )}
      <span className={ok ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
    </div>
  );
}
