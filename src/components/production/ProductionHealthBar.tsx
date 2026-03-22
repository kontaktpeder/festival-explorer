import { computeEventHealth, type EventHealth } from "@/lib/eventIssues";

interface Issue {
  severity: string;
  status: string;
}

const copy: Record<EventHealth, { label: string; className: string }> = {
  broken: {
    label: "Broken – kritisk åpent",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
  at_risk: {
    label: "At risk – må følges opp",
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40",
  },
  stable: {
    label: "Stabil",
    className: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  },
};

export function ProductionHealthBar({ issues }: { issues: Issue[] }) {
  const open = issues.filter((i) => i.status === "open");
  const health = computeEventHealth(open);
  const c = copy[health];

  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${c.className}`}>
      <span>{c.label}</span>
      {open.length > 0 && (
        <span className="text-xs opacity-70">({open.length} åpne)</span>
      )}
    </div>
  );
}
