import { Music, Camera, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineupItem } from "@/components/ui/LineupItem";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";

interface EventZoneTabsProps {
  lineup: any[];
  backstage: any[];
  hostRoles: any[];
}

function EmptyZoneState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <Icon className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground text-center max-w-[240px]">
        {message}
      </p>
    </div>
  );
}

export function EventZoneTabs({ lineup, backstage, hostRoles }: EventZoneTabsProps) {
  // Determine default tab: first non-empty zone
  const defaultTab = lineup.length > 0
    ? "on_stage"
    : backstage.length > 0
      ? "backstage"
      : "host";

  return (
    <section className="py-20 md:py-32 border-t border-border/20">
      <div className="max-w-3xl mx-auto px-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full grid grid-cols-3 h-12 bg-transparent rounded-none border-b border-border/30 p-0">
            <TabsTrigger
              value="on_stage"
              className="h-12 rounded-none text-sm font-medium data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none"
            >
              På scenen
            </TabsTrigger>
            <TabsTrigger
              value="backstage"
              className="h-12 rounded-none text-sm font-medium data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none"
            >
              Bak scenen
            </TabsTrigger>
            <TabsTrigger
              value="host"
              className="h-12 rounded-none text-sm font-medium data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none"
            >
              Arrangør
            </TabsTrigger>
          </TabsList>

          <TabsContent value="on_stage" className="mt-8 md:mt-12">
            {lineup.length > 0 ? (
              <div className="space-y-8 md:space-y-12">
                {lineup.map((item: any, index: number) => (
                  <LineupItem
                    key={item.entity_id || item.participant_id || index}
                    item={item}
                    showBilling
                    isFirst={index === 0}
                  />
                ))}
              </div>
            ) : (
              <EmptyZoneState icon={Music} message="Ingen artister er lagt til ennå. Kom tilbake senere." />
            )}
          </TabsContent>

          <TabsContent value="backstage" className="mt-8">
            {backstage.length > 0 ? (
              <div className="space-y-4">
                {backstage.map((item: any, i: number) => (
                  <EventParticipantItem key={item.participant_id || i} item={item} />
                ))}
              </div>
            ) : (
              <EmptyZoneState icon={Camera} message="Ingen crew er kreditert ennå." />
            )}
          </TabsContent>

          <TabsContent value="host" className="mt-8">
            {hostRoles.length > 0 ? (
              <div className="space-y-4">
                {hostRoles.map((item: any, i: number) => (
                  <EventParticipantItem key={item.participant_id || i} item={item} />
                ))}
              </div>
            ) : (
              <EmptyZoneState icon={Building2} message="Ingen arrangør er kreditert ennå." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
