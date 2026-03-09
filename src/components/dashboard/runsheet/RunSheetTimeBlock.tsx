import { format } from "date-fns";

interface RunSheetTimeBlockProps {
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function fmtDuration(minutes: number | null, startsAt: string, endsAt: string | null): string {
  if (minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `0:${String(m).padStart(2, "0")}`;
  }
  if (endsAt) {
    const diff = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
    if (diff > 0) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `0:${String(m).padStart(2, "0")}`;
    }
  }
  return "—";
}

export function RunSheetTimeBlock({ startsAt, endsAt, durationMinutes }: RunSheetTimeBlockProps) {
  return (
    <div className="flex flex-col gap-0.5 tabular-nums font-mono select-none">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 w-8">Start</span>
        <span className="text-sm font-semibold text-foreground">{fmtTime(startsAt)}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 w-8">Tid</span>
        <span className="text-xs text-muted-foreground">{fmtDuration(durationMinutes, startsAt, endsAt)}</span>
      </div>
      {endsAt && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 w-8">Slutt</span>
          <span className="text-xs text-muted-foreground">{fmtTime(endsAt)}</span>
        </div>
      )}
    </div>
  );
}
