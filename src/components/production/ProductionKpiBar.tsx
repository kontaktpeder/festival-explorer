import type { ProductionKpis } from "@/lib/production-board-mappers";
import { AlertTriangle, HelpCircle, CheckCircle2, AlertCircle, FileWarning, FileText, Users } from "lucide-react";

interface Props {
  kpis: ProductionKpis;
}

const chips: {
  key: keyof ProductionKpis;
  label: string;
  icon: typeof AlertTriangle;
  colorClass: string;
}[] = [
  { key: "totalSlots", label: "Totalt", icon: AlertCircle, colorClass: "text-muted-foreground bg-muted/40" },
  { key: "requiresActionCount", label: "Krever handling", icon: AlertTriangle, colorClass: "text-destructive bg-destructive/10" },
  { key: "unclearCount", label: "Uklart", icon: HelpCircle, colorClass: "text-yellow-600 bg-yellow-500/10" },
  { key: "readyCount", label: "Klar", icon: CheckCircle2, colorClass: "text-emerald-600 bg-emerald-500/10" },
  { key: "openIssuesCount", label: "Åpne issues", icon: AlertCircle, colorClass: "text-orange-600 bg-orange-500/10" },
  { key: "missingRiderCount", label: "Mangler rider", icon: FileWarning, colorClass: "text-rose-600 bg-rose-500/10" },
  { key: "missingContractCount", label: "Mangler kontrakt", icon: FileText, colorClass: "text-amber-600 bg-amber-500/10" },
  { key: "missingCrewCount", label: "Mangler crew", icon: Users, colorClass: "text-violet-600 bg-violet-500/10" },
];

export function ProductionKpiBar({ kpis }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ key, label, icon: Icon, colorClass }) => {
        const val = kpis[key];
        return (
          <div
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${colorClass}`}
          >
            <Icon className="h-3 w-3" />
            {val} {label}
          </div>
        );
      })}
    </div>
  );
}
