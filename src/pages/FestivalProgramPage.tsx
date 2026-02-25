import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { ProgramTimelineSection } from "@/components/festival/ProgramTimelineSection";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { BackToFestival } from "@/components/ui/BackToFestival";
import { Calendar } from "lucide-react";

export default function FestivalProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const festivalSlug = slug || "giggen-festival-for-en-kveld";

  const { data: shell, isLoading, error } = useFestivalShell(festivalSlug);
  const { data: details } = useFestivalDetails(shell?.id);

  const festivalProgramSlots = details?.festivalProgramSlots || [];

  const validEvents = (details?.festivalEvents || []).filter(
    (fe: any) => fe.event && fe.event.status === "published"
  );

  const eventsForProgram = useMemo(
    () =>
      validEvents
        .filter((fe: any) => fe?.event)
        .slice(0, 3)
        .map((fe: any) => ({
          id: fe.event.id,
          title: fe.event.title,
          slug: fe.event.slug,
          start_at: fe.event.start_at,
          hero_image_url: fe.event.hero_image_url,
        })),
    [validEvents]
  );

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster program..." />
      </PageLayout>
    );
  }

  if (error || !shell) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Program ikke funnet"
          description="Festivalen du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <StaticLogo />
      <div className="pt-20 md:pt-24 pb-8 px-4">
        <BackToFestival festivalSlug={festivalSlug} festivalName={shell.name} />
      </div>
      <div>
        {festivalProgramSlots.length > 0 ? (
          <ProgramTimelineSection
            events={eventsForProgram}
            slots={festivalProgramSlots}
          />
        ) : (
          <div className="py-24 text-center text-muted-foreground">
            Programmet kommer snart.
          </div>
        )}
      </div>
      <FestivalFooter />
    </PageLayout>
  );
}
