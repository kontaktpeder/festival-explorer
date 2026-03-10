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
    <div className="flex flex-col items-center h-full tabular-nums font-mono py-1 gap-0.5">
      {/* Start time */}
      <span className={`text-lg md:text-xl font-extrabold tracking-tight leading-none ${isCritical ? 'text-accent' : 'text-foreground'}`}>
        {fmtTime(startsAt)}
      </span>

      {/* Duration label */}
      {dur && (
        <span className="text-[10px] text-muted-foreground/50 leading-tight">
          {fmtDurationLabel(dur)}
        </span>
      )}

      {/* End time */}
      {hasEnd && (
        <span className="text-xs text-muted-foreground/60 leading-none">
          {endsAt ? fmtTime(endsAt) : dur ? fmtTime(new Date(new Date(startsAt).getTime() + dur * 60000).toISOString()) : ""}
        </span>
      )}
    </div>
  );
}
