import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Calendar, MapPin, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminTimelineEvents, useDeleteTimelineEvent } from "@/hooks/useTimeline";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { TimelineVisibility, TimelineEventType } from "@/types/database";

const EVENT_TYPE_LABELS: Record<TimelineEventType, { label: string; icon: string }> = {
  live_show: { label: "Konsert", icon: "🎤" },
  release: { label: "Utgivelse", icon: "💿" },
  milestone: { label: "Milepæl", icon: "⭐" },
  collaboration: { label: "Samarbeid", icon: "🤝" },
  media: { label: "Media", icon: "📸" },
  award: { label: "Pris", icon: "🏆" },
  personal_memory: { label: "Personlig minne", icon: "💭" },
};

const VISIBILITY_LABELS: Record<TimelineVisibility, { label: string; variant: "default" | "secondary" | "outline" }> = {
  public: { label: "Offentlig", variant: "default" },
  pro: { label: "Pro", variant: "secondary" },
  private: { label: "Privat", variant: "outline" },
};

export default function AdminTimelineEvents() {
  const [visibilityFilter, setVisibilityFilter] = useState<TimelineVisibility | null>(null);
  const { data: events, isLoading } = useAdminTimelineEvents(visibilityFilter);
  const deleteMutation = useDeleteTimelineEvent();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Hendelse slettet"),
      onError: (err) => toast.error("Kunne ikke slette: " + err.message),
    });
  };

  const formatEventDate = (date: string | null, year: number | null) => {
    if (date) {
      return format(new Date(date), "d. MMMM yyyy", { locale: nb });
    }
    if (year) {
      return year.toString();
    }
    return "Ukjent dato";
  };

  const formatLocation = (locationName: string | null, city: string | null, country: string | null) => {
    const parts = [locationName, city, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  if (isLoading) {
    return <div className="p-6">Laster timeline-hendelser...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timeline Hendelser</h1>
        <Button asChild>
          <Link to="/admin/timeline/new">
            <Plus className="w-4 h-4 mr-2" />
            Ny hendelse
          </Link>
        </Button>
      </div>

      <Tabs
        value={visibilityFilter || "all"}
        onValueChange={(v) => setVisibilityFilter(v === "all" ? null : (v as TimelineVisibility))}
      >
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="public">🌍 Offentlig</TabsTrigger>
          <TabsTrigger value="pro">🏷️ Pro</TabsTrigger>
          <TabsTrigger value="private">🔒 Privat</TabsTrigger>
        </TabsList>
      </Tabs>

      {events && events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ingen timeline-hendelser funnet.</p>
          <Button asChild className="mt-4">
            <Link to="/admin/timeline/new">Opprett første hendelse</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events?.map((event) => {
            const typeInfo = EVENT_TYPE_LABELS[event.event_type as TimelineEventType];
            const visInfo = VISIBILITY_LABELS[event.visibility as TimelineVisibility];
            const location = formatLocation(event.location_name, event.city, event.country);

            return (
              <div
                key={event.id}
                className="bg-card border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant={visInfo.variant}>{visInfo.label}</Badge>
                    <Badge variant="outline">
                      {typeInfo.icon} {typeInfo.label}
                    </Badge>
                  </div>

                  <h3 className="font-semibold truncate">{event.title}</h3>

                  {event.project && (
                    <Link
                      to={`/project/${event.project.slug}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Music className="w-3 h-3" />
                      {event.project.name}
                    </Link>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatEventDate(event.date, event.year)}
                    </span>
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/timeline/${event.id}`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slett hendelse?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Er du sikker på at du vil slette "{event.title}"? Denne handlingen kan ikke angres.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(event.id)}>
                          Slett
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
