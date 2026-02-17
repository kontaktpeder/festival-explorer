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
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
        Kommende opptredener
      </h2>

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
  const now = new Date();
  const start = new Date(gig.startsAt);
  const end = gig.endsAt ? new Date(gig.endsAt) : null;
  const isLive = now >= start && (!end || now <= end);
  const dateStr = format(start, "EEE d. MMM", { locale: nb });
  const timeStr = format(start, "HH:mm");

  return (
    <Link
      to={`/event/${gig.eventSlug}`}
      className="flex items-center gap-3 py-3 group hover:bg-accent/5 -mx-2 px-2 rounded-md transition-colors"
    >
      <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground/50 capitalize">{dateStr} · {timeStr}</span>
        <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
          {gig.eventTitle}
        </p>
        {gig.venueName && (
          <p className="text-xs text-muted-foreground/40 truncate">{gig.venueName}</p>
        )}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-red-400 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
}
