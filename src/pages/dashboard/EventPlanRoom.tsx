import { useParams, Link, useLocation } from "react-router-dom";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { LoadingState } from "@/components/ui/LoadingState";
import { ArrowLeft } from "lucide-react";

const NAV_ITEMS = [
  { label: "Plan", suffix: "/plan" },
  { label: "Produksjon", suffix: "/run-sheet" },
  { label: "Live", suffix: "/live" },
] as const;

export default function EventPlanRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit } = useEventBackstageAccess(id);
  const location = useLocation();
  const base = `/dashboard/events/${id}`;

  if (isLoading) {
    return (
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <LoadingState message="Laster plan..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  return (
    <div className="finance-theme min-h-[100svh]">
      <div className="max-w-[1400px] mx-auto px-3 py-4 md:px-6 md:py-8 space-y-6">
        <Link
          to={base}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbake til eventet</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Plan
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
              {event.title} · fokusmodus
            </p>
          </div>

          {/* Segmented nav */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {NAV_ITEMS.map((item) => {
              const to = `${base}${item.suffix}`;
              const isActive = location.pathname === to;
              return (
                <Link
                  key={item.suffix}
                  to={to}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <FestivalRunSheet
          eventId={id!}
          readOnly={!canEdit}
          canOperate={false}
        />
      </div>
    </div>
  );
}
