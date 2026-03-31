import { Link, useParams, useNavigate } from "react-router-dom";
import { FileText, ClipboardList, Users, ChevronRight, ExternalLink, ArrowLeft, Radio, Wrench, UserCheck, Archive, ArchiveRestore } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { toast } from "sonner";

export default function EventDashboardRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { event, isLoading, canEdit, canViewRunsheet, festivalContext } = useEventBackstageAccess(id);

  const isArchived = !!(event as any)?.archived_at;

  const archiveEvent = useMutation({
    mutationFn: async ({ archive }: { archive: boolean }) => {
      const { error } = await supabase.rpc("archive_event", {
        p_event_id: id!,
        p_archive: archive,
      });
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["event-backstage"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success(archive ? "Event arkivert" : "Event gjenopprettet");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster event..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  if (!canEdit && !canViewRunsheet) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Du har ikke tilgang til dette eventet.</p>
        {event.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/event/${event.slug}`}>Se publikumsvisning</Link>
          </Button>
        )}
      </div>
    );
  }

  const base = `/dashboard/events/${id}`;
  const dateStr = event.start_at
    ? new Date(event.start_at).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const modules = [
    ...(canEdit
      ? [
          {
            title: "Detaljer",
            description: "Tittel, tid, sted, beskrivelse og hero",
            icon: FileText,
            to: `${base}/details`,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            title: "Plan",
            description: "Kjøreplan, tider og rekkefølge",
            icon: ClipboardList,
            to: `${base}/plan`,
          },
        ]
      : []),
    ...(canViewRunsheet || canEdit
      ? [
          {
            title: "Produksjon",
            description: "Statusoversikt, mangler og prioriteringer",
            icon: Wrench,
            to: `${base}/run-sheet`,
          },
        ]
      : []),
    ...(canViewRunsheet || canEdit
      ? [
          {
            title: "Live-visning",
            description: "Sanntids NÅ / NESTE oversikt",
            icon: Radio,
            to: `${base}/live`,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            title: "Aktører",
            description: "Lineup, crew, teknikk og invitasjoner",
            icon: UserCheck,
            to: `${base}/actors`,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {event.title}
                </h1>
                {isArchived && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                    Arkivert
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {[dateStr, event.city].filter(Boolean).join(" · ")}
                {festivalContext?.festival && (
                  <span>
                    · {(festivalContext.festival as { name?: string }).name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/30"
                onClick={() => archiveEvent.mutate({ archive: !isArchived })}
              >
                {isArchived ? (
                  <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Gjenopprett</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-1" />Arkiver</>
                )}
              </Button>
            )}
            {event.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/event/${event.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Se live
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Modules grid */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-4">
          Moduler
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                to={mod.to}
                className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
                <h3 className="text-sm font-medium text-foreground">{mod.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
