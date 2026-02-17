import { Link } from "react-router-dom";
import { format, isToday } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useUpcomingGigsForEntity, type UpcomingGig } from "@/hooks/useUpcomingGigs";

interface Props {
  entityId: string;
  festivalSlug?: string | null;
}

export function UpcomingGigsSection({ entityId, festivalSlug }: Props) {
  const { data: gigs, isLoading } = useUpcomingGigsForEntity(entityId);

  if (isLoading || !gigs) return null;
  if (gigs.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
        Spiller snart
      </h2>
      <p className="text-xs text-muted-foreground/40 mb-4">Kommende opptredener.</p>

      <div className="divide-y divide-border/10">
        {gigs.map((gig) => (
          <GigRow key={gig.slotId} gig={gig} />
        ))}
      </div>

      {festivalSlug && (
        <Link
          to={`/festival/${festivalSlug}`}
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-4"
        >
          Se fullt program <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function GigRow({ gig }: { gig: UpcomingGig }) {
  const date = new Date(gig.startsAt);
  const today = isToday(date);
  const dateStr = format(date, "EEE d. MMM", { locale: nb });
  const timeStr = format(date, "HH:mm");

  return (
    <Link
      to={`/event/${gig.eventSlug}`}
      className="flex items-center gap-3 py-3 group hover:bg-accent/5 -mx-2 px-2 rounded-md transition-colors"
    >
      <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 capitalize">{dateStr} · {timeStr}</span>
          {today && (
            <span className="text-[9px] uppercase tracking-widest font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              I kveld
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
          {gig.eventTitle}
        </p>
        {gig.venueName && (
          <p className="text-xs text-muted-foreground/40 truncate">{gig.venueName}</p>
        )}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
}
