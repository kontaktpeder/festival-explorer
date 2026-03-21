import { Link, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventInvitationsEditor } from "@/components/dashboard/EventInvitationsEditor";
import { EventParticipantsZoneEditor } from "@/components/admin/EventParticipantsZoneEditor";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { Button } from "@/components/ui/button";

export default function EventParticipantsRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit, festivalTeam } = useEventBackstageAccess(id);

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster medvirkende..." />
      </div>
    );
  }

  if (!event || !id) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  return (
    <BackstageShell
      title="Medvirkende"
      subtitle={event.title}
      backTo={`/dashboard/events/${id}`}
      externalLink={
        event.slug
          ? { to: `/event/${event.slug}`, label: "Se live" }
          : undefined
      }
    >
      <div className="space-y-6">
        {/* Invitations */}
        <EventInvitationsEditor eventId={id} canEdit={canEdit} />

        {/* Participants by zone */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground/50" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Medvirkende
            </h2>
          </div>
          <Tabs defaultValue="on_stage">
            <TabsList className="w-full grid grid-cols-3 h-8 bg-muted/20">
              <TabsTrigger value="on_stage" className="text-[11px] data-[state=active]:bg-background">På scenen</TabsTrigger>
              <TabsTrigger value="backstage" className="text-[11px] data-[state=active]:bg-background">Bak scenen</TabsTrigger>
              <TabsTrigger value="host" className="text-[11px] data-[state=active]:bg-background">Arrangør</TabsTrigger>
            </TabsList>
            <TabsContent value="on_stage" className="mt-3">
              <EventParticipantsZoneEditor eventId={id} zone="on_stage" />
            </TabsContent>
            <TabsContent value="backstage" className="mt-3">
              <EventParticipantsZoneEditor eventId={id} zone="backstage" />
            </TabsContent>
            <TabsContent value="host" className="mt-3">
              <EventParticipantsZoneEditor eventId={id} zone="host" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Festival team (inherited, read-only) */}
        {festivalTeam && (festivalTeam.hostRoles.length > 0 || festivalTeam.backstage.length > 0) && (
          <div className="space-y-3 pt-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Festival-team ({festivalTeam.festival?.name})
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Arves fra festivalen
                </p>
              </div>
            </div>

            {festivalTeam.hostRoles.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Arrangør</p>
                {festivalTeam.hostRoles.map((item, i) => (
                  <div key={item.participant_id || i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {(item.persona as { name?: string } | null)?.name ||
                        (item.entity as { name?: string } | null)?.name}
                    </span>
                    {item.role_label && (
                      <span className="text-xs text-muted-foreground">· {item.role_label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {festivalTeam.backstage.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Bak scenen</p>
                {festivalTeam.backstage.map((item, i) => (
                  <div key={item.participant_id || i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {(item.persona as { name?: string } | null)?.name ||
                        (item.entity as { name?: string } | null)?.name}
                    </span>
                    {item.role_label && (
                      <span className="text-xs text-muted-foreground">· {item.role_label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </BackstageShell>
  );
}
