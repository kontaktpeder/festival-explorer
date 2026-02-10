import { Music, Camera, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineupItem } from "@/components/ui/LineupItem";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";

interface ZoneGroup {
  festival: any[];
  event: any[];
}

interface EventZoneTabsProps {
  lineup: any[];
  backstage: ZoneGroup | any[];
  hostRoles: ZoneGroup | any[];
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

function normalizeZone(zone: ZoneGroup | any[]): ZoneGroup {
  if (Array.isArray(zone)) return { festival: [], event: zone };
  return zone;
}

function ZoneContent({ zone, emptyIcon, emptyMessage }: { zone: ZoneGroup; emptyIcon: React.ElementType; emptyMessage: string }) {
  const total = zone.festival.length + zone.event.length;
  if (total === 0) return <EmptyZoneState icon={emptyIcon} message={emptyMessage} />;

  return (
    <div className="space-y-4">
      {zone.festival.length > 0 && (
        <div className="space-y-4 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Festival-team</p>
          {zone.festival.map((item: any, i: number) => (
            <EventParticipantItem key={item.participant_id || i} item={item} />
          ))}
        </div>
      )}
      {zone.event.length > 0 && (
        <div className="space-y-4">
          {zone.festival.length > 0 && (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Denne kvelden</p>
          )}
          {zone.event.map((item: any, i: number) => (
            <EventParticipantItem key={item.participant_id || i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EventZoneTabs({ lineup, backstage, hostRoles }: EventZoneTabsProps) {
  const bs = normalizeZone(backstage);
  const hr = normalizeZone(hostRoles);

  return (
    <section className="py-20 md:py-32 border-t border-border/20">
      <div className="max-w-3xl mx-auto px-6">
        <Tabs defaultValue="on_stage">
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
              <EmptyZoneState icon={Music} message="Ingen oppføringer enda." />
            )}
          </TabsContent>

          <TabsContent value="backstage" className="mt-8">
            <ZoneContent zone={bs} emptyIcon={Camera} emptyMessage="Ingen oppføringer enda." />
          </TabsContent>

          <TabsContent value="host" className="mt-8">
            <ZoneContent zone={hr} emptyIcon={Building2} emptyMessage="Ingen oppføringer enda." />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
