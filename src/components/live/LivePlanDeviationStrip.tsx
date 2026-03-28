import type { LivePlanDeviation } from "@/lib/runsheet-live-plan-deviation";

type Props = {
  deviation: LivePlanDeviation;
  showAckButtons?: boolean;
  onAcknowledge?: () => void | Promise<void>;
  onFollowPlan?: () => void | Promise<void>;
  acting?: boolean;
};

export function LivePlanDeviationStrip({
  deviation,
  showAckButtons,
  onAcknowledge,
  onFollowPlan,
  acting,
}: Props) {
  if (deviation.kind === "none") return null;

  const showFollow =
    showAckButtons && (deviation.kind === "wrong_slot" || deviation.kind === "nothing_live_but_plan");

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
      {deviation.kind === "overdue" && (
        <p className="text-xs text-amber-300/80 font-medium">
          ⚠ Over planlagt slutt:{" "}
          <span className="text-amber-200 font-bold">
            {deviation.items.map((i) => i.title).join(" · ")}
          </span>
          {" · "}Marker ferdig eller +5 under.
        </p>
      )}
      {deviation.kind === "early_start" && (
        <p className="text-xs text-amber-300/80 font-medium">
          ⚠ Start ser ut til å være før plan:{" "}
          <span className="text-amber-200 font-bold">
            {deviation.items.map((i) => i.title).join(" · ")}
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

      {showAckButtons && onAcknowledge && (
        <div className="flex items-center gap-2 mt-2">
          <button
            disabled={acting}
            onClick={() => void onAcknowledge()}
            className="text-[11px] font-bold uppercase tracking-wider rounded-md bg-white text-black px-3 py-2 disabled:opacity-40"
          >
            Bekreft faktisk live
          </button>
          {showFollow && onFollowPlan && (
            <button
              disabled={acting}
              onClick={() => void onFollowPlan()}
              className="text-[11px] font-bold uppercase tracking-wider rounded-md border border-white/20 text-white/85 px-3 py-2 disabled:opacity-40"
            >
              Følg plan (instruks)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
