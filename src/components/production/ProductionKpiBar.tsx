import type { ProductionKpis } from "@/lib/production-board-mappers";
import { AlertTriangle, HelpCircle, CheckCircle2, AlertCircle, FileWarning, FileText, Users, Hash } from "lucide-react";

interface Props {
  kpis: ProductionKpis;
}

const chips: {
  key: keyof ProductionKpis;
  label: string;
  icon: typeof AlertTriangle;
  variant: "neutral" | "danger" | "warning" | "success" | "info";
}[] = [
  { key: "totalSlots", label: "Totalt", icon: Hash, variant: "neutral" },
  { key: "requiresActionCount", label: "Krever handling", icon: AlertTriangle, variant: "danger" },
  { key: "unclearCount", label: "Uklart", icon: HelpCircle, variant: "warning" },
  { key: "readyCount", label: "Klar", icon: CheckCircle2, variant: "success" },
  { key: "openIssuesCount", label: "Åpne issues", icon: AlertCircle, variant: "danger" },
  { key: "missingRiderCount", label: "Mangler rider", icon: FileWarning, variant: "danger" },
  { key: "missingContractCount", label: "Mangler kontrakt", icon: FileText, variant: "warning" },
  { key: "missingCrewCount", label: "Mangler crew", icon: Users, variant: "info" },
];

const variantClasses: Record<string, string> = {
  neutral: "bg-card border-border text-foreground",
  danger: "bg-card border-destructive/20 text-destructive",
  warning: "bg-card border-border text-foreground",
  success: "bg-card border-border text-foreground",
  info: "bg-card border-border text-foreground",
};

export function ProductionKpiBar({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {chips.map(({ key, label, icon: Icon, variant }) => {
        const val = kpis[key];
        return (
          <div
            key={key}
            className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 ${variantClasses[variant]}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-60" />
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-none">{val}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
