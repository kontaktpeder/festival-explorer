import type { LivePlanDeviation } from "@/lib/runsheet-live-plan-deviation";

type Props = { deviation: LivePlanDeviation };

export function LivePlanDeviationStrip({ deviation }: Props) {
  if (deviation.kind === "none") return null;

  return (
    <div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05]">
      {deviation.kind === "nothing_live_but_plan" && (
        <p className="text-xs text-amber-300/80 font-medium">
          ⚠ Planen tilsier at{" "}
          <span className="text-amber-200 font-bold">
            {deviation.planned.map((p) => p.title).join(" · ")}
          </span>{" "}
          skal være live nå.
        </p>
      )}
      {deviation.kind === "wrong_slot" && (
        <p className="text-xs text-amber-300/80 font-medium">
          ⚠ Planlagt nå:{" "}
          <span className="text-amber-200 font-bold">
            {deviation.planned.map((p) => p.title).join(" · ")}
          </span>
          {" · "}
          Faktisk live:{" "}
          <span className="text-red-300 font-bold">
            {deviation.actual.map((a) => a.title).join(" · ")}
          </span>
        </p>
      )}
      {deviation.kind === "behind_plan_minutes" && (
        <p className="text-xs text-amber-300/80 font-medium">
          ⚠ Du ligger ca.{" "}
          <span className="text-amber-200 font-bold">{deviation.minutes} min</span> bak plan
          {deviation.label ? (
            <span className="text-white/40"> ({deviation.label})</span>
          ) : null}
        </p>
      )}
    </div>
  );
}
