import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFestivalDetails } from "@/hooks/useFestival";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import AdminFestivalProgram from "@/pages/admin/AdminFestivalProgram";
import { ProgramView } from "@/components/program/ProgramView";
import { mapFestivalToProgramCategories } from "@/lib/program-mappers";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Music,
  Calendar,
  Users,
  Smartphone,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface FestivalProgramTabsProps {
  festivalId: string;
  festivalName?: string | null;
  festivalSlug?: string | null;
  canEditProgram?: boolean;
}

export function FestivalProgramTabs({
  festivalId,
  festivalName,
  festivalSlug,
  canEditProgram,
}: FestivalProgramTabsProps) {
  const { data: details, isLoading: detailsLoading } =
    useFestivalDetails(festivalId);

  const lineup = details?.allArtistsWithEventSlug ?? [];
  const festivalTeam = details?.festivalTeam;
  const teamList = [
    ...(festivalTeam?.hostRoles ?? []),
    ...(festivalTeam?.backstage ?? []),
  ];
  const validEvents = (details?.festivalEvents ?? []).filter(
    (fe: any) => fe.event?.status === "published" && fe.show_in_program !== false
  );

  const programCategories = useMemo(
    () =>
      mapFestivalToProgramCategories({
        events: validEvents.map((fe: any) => fe.event).filter(Boolean),
        lineup,
        team: teamList,
      }),
    [validEvents, lineup, teamList]
  );

  return (
    <Tabs defaultValue="events" className="w-full">
      {/* Mobile-first scrollable tab bar */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="inline-flex w-auto min-w-full md:w-full h-auto p-1 gap-1 bg-muted/50 rounded-xl">
          <TabsTrigger
            value="lineup"
            className="flex-1 min-w-[5rem] min-h-[2.75rem] gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <Music className="w-3.5 h-3.5" />
            Lineup
            {lineup.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">
                {lineup.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="flex-1 min-w-[5rem] min-h-[2.75rem] gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <Calendar className="w-3.5 h-3.5" />
            Events
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex-1 min-w-[5rem] min-h-[2.75rem] gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <Users className="w-3.5 h-3.5" />
            Team
            {teamList.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">
                {teamList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="flex-1 min-w-[5rem] min-h-[2.75rem] gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Forhåndsvisning
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── LINEUP ── */}
      <TabsContent value="lineup" className="mt-4">
        <p className="text-xs text-muted-foreground mb-4">
          Lineup bygges fra hvert events deltakere. Her vises alle artister knyttet til festivalens events.
        </p>
        {detailsLoading ? (
          <LoadingState message="Laster..." />
        ) : lineup.length > 0 ? (
          <div className="divide-y divide-border">
            {lineup.map((a: any) => (
              <Link
                key={a.id}
                to={`/project/${a.slug}`}
                className="flex items-center justify-between py-3 px-2 hover:bg-muted/30 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">
                    {a.name}
                  </span>
                  {a.event_slug && (
                    <span className="text-[10px] text-muted-foreground">
                      {a.event_slug}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            <p className="text-sm">Ingen artister ennå.</p>
            <p className="text-xs mt-1">Legg til events og fyll ut lineup på hvert event.</p>
          </div>
        )}
      </TabsContent>

      {/* ── EVENTS ── */}
      <TabsContent value="events" className="mt-4">
        <AdminFestivalProgram />
      </TabsContent>

      {/* ── TEAM ── */}
      <TabsContent value="team" className="mt-4">
        <p className="text-xs text-muted-foreground mb-4">
          Team (host og backstage) vises under «Team» på forsiden.
        </p>
        {detailsLoading ? (
          <LoadingState message="Laster..." />
        ) : teamList.length > 0 ? (
          <div className="divide-y divide-border">
            {teamList.map((item: any, i: number) => (
              <div key={item.participant_id ?? i} className="py-3 px-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {item.persona?.name ?? item.entity?.name ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.role_label ?? (item.zone === "host" ? "Host" : "Backstage")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Ingen teammedlemmer ennå.
          </p>
        )}
        <Link
          to={`/dashboard/festival/${festivalId}/team`}
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
        >
          Rediger team
          <ExternalLink className="w-3 h-3" />
        </Link>
      </TabsContent>

      {/* ── PREVIEW ── */}
      <TabsContent value="preview" className="mt-4">
        <p className="text-xs text-muted-foreground mb-4">
          Slik ser programmodulen ut på forsiden (Lineup, Events, Team).
        </p>
        {programCategories.some((c) => c.items.length > 0) ? (
          <div className="border border-border rounded-xl p-4 bg-muted/20">
            <ProgramView
              categories={programCategories}
              title="Program"
              showTime={false}
              accordion
              showEmptyState={false}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            <p className="text-sm">Legg til events eller lineup for å se forhåndsvisning.</p>
          </div>
        )}
        {festivalSlug && (
          <Link
            to={`/festival/${festivalSlug}#program`}
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            Åpne program på forsiden
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </TabsContent>
    </Tabs>
  );
}
