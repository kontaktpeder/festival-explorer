import { format } from "date-fns";

interface RunSheetTimeBlockProps {
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  isCritical?: boolean;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function calcDuration(minutes: number | null, startsAt: string, endsAt: string | null): number | null {
  if (minutes) return minutes;
  if (endsAt) {
    const diff = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
    return diff > 0 ? diff : null;
  }
  return null;
}

function fmtDurationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}t ${m}m` : `${h}t`;
}

export function RunSheetTimeBlock({ startsAt, endsAt, durationMinutes, isCritical }: RunSheetTimeBlockProps) {
  const dur = calcDuration(durationMinutes, startsAt, endsAt);
  const hasEnd = endsAt || dur;

  return (
    <div className="flex flex-col items-center h-full tabular-nums font-mono py-1 gap-0">
      {/* Start time */}
      <span className={`text-sm font-bold ${isCritical ? 'text-accent' : 'text-foreground'}`}>
        {fmtTime(startsAt)}
      </span>

      {/* Vertical timeline connector */}
      {hasEnd && (
        <div className="flex flex-col items-center flex-1 min-h-[28px] my-0.5">
          <div className={`w-px flex-1 min-h-[6px] ${isCritical ? 'bg-accent/40' : 'bg-border/40'}`} />
          {dur && (
            <span className="text-[9px] text-muted-foreground/60 px-1 py-0 leading-tight">
              {fmtDurationLabel(dur)}
            </span>
          )}
          <div className={`w-px flex-1 min-h-[6px] ${isCritical ? 'bg-accent/40' : 'bg-border/40'}`} />
        </div>
      )}

      {/* End time */}
      {hasEnd && (
        <span className="text-xs text-muted-foreground/70">
          {endsAt ? fmtTime(endsAt) : dur ? fmtTime(new Date(new Date(startsAt).getTime() + dur * 60000).toISOString()) : ""}
        </span>
      )}
    </div>
  );
}
