import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductionBoardData } from "@/hooks/useProductionBoardData";
import { countContributorBuckets } from "@/lib/production-board-mappers";
import { ProductionKpiBar } from "./ProductionKpiBar";
import { ProductionFilters } from "./ProductionFilters";
import { ProductionSection } from "./ProductionSection";
import { ContributorSection } from "./ContributorSection";
import { AddPerformerToSlotDialog } from "./AddPerformerToSlotDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Radio, LayoutList, Users, Plus, FileWarning, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductionFilter, ProductionSectionKey } from "@/lib/production-board-mappers";

interface Props {
  festivalId: string | null;
  eventId: string | null;
  liveBasePath: string;
}

type ViewTab = "slots" | "contributors";

const SECTION_ORDER: ProductionSectionKey[] = ["requires_action", "unclear", "ready"];

export function ProductionBoard({ festivalId, eventId, liveBasePath }: Props) {
  const [filter, setFilter] = useState<ProductionFilter>("all");
  const [tab, setTab] = useState<ViewTab>("contributors");
  const [addPerformerOpen, setAddPerformerOpen] = useState(false);

  const {
    isLoading, kpis, sections, sceneLabels, slots,
    contributors, contributorSections, contributorKpis,
  } = useProductionBoardData({
    festivalId,
    eventId,
    filter,
  });

  // Fetch festival entities for the performer picker
  const { data: festivalEntities = [] } = useQuery({
    queryKey: ["production-festival-entities", festivalId],
    enabled: !!festivalId,
    queryFn: async () => {
      const { data: feRows } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId!);
      if (!feRows?.length) return [];
      const eventIds = feRows.map((r) => r.event_id);
      const { data: eeRows } = await supabase
        .from("event_entities")
        .select("entity_id")
        .in("event_id", eventIds);
      if (!eeRows?.length) return [];
      const entityIds = [...new Set(eeRows.map((r) => r.entity_id))];
      const { data: entities } = await supabase
        .from("entities")
        .select("id, name, slug")
        .in("id", entityIds)
        .order("name");
      return (entities ?? []) as { id: string; name: string; slug: string }[];
    },
  });

  const buckets = useMemo(
    () => countContributorBuckets(contributors),
    [contributors],
  );

  if (isLoading) {
    return <LoadingState message="Laster produksjonsdata..." />;
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        {/* Tab toggle */}
        <div className="flex rounded-md border border-border overflow-hidden bg-card">
          <button
            onClick={() => setTab("contributors")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "contributors"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/30",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Medvirkende
            {contributorKpis.withIssues > 0 && (
              <span className="ml-1 text-[9px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0 leading-relaxed tabular-nums">
                {contributorKpis.withIssues}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("slots")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border",
              tab === "slots"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/30",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Poster
          </button>
        </div>

        <div className="flex items-center gap-2">
          {tab === "contributors" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setAddPerformerOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Legg til medvirkende
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to={liveBasePath}>
              <Radio className="h-3.5 w-3.5 mr-1.5" />
              Åpne Live
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <ProductionKpiBar kpis={kpis} />

      {/* Contributor bucket chips (contributor tab only) */}
      {tab === "contributors" && contributors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {buckets.missingDocs > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-destructive/20 bg-destructive/8 text-destructive font-medium">
              <FileWarning className="h-3 w-3" />
              {buckets.missingDocs} mangler dokumenter
            </span>
          )}
          {buckets.pendingContract > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/8 text-amber-600 font-medium">
              <Clock className="h-3 w-3" />
              {buckets.pendingContract} venter bekreftelse
            </span>
          )}
          {buckets.ready > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {buckets.ready} klar
            </span>
          )}
        </div>
      )}

      {/* Filters (slot view only) */}
      {tab === "slots" && (
        <ProductionFilters active={filter} onChange={setFilter} sceneLabels={sceneLabels} />
      )}

      {/* Content */}
      <div className="space-y-3">
        {tab === "slots" ? (
          <>
            {SECTION_ORDER.map((key) => (
              <ProductionSection
                key={key}
                sectionKey={key}
                items={sections[key]}
                liveBasePath={liveBasePath}
              />
            ))}
            {kpis.totalSlots === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Ingen poster i kjøreplanen ennå.
              </div>
            )}
          </>
        ) : (
          <>
            {SECTION_ORDER.map((key) => (
              <ContributorSection
                key={key}
                sectionKey={key}
                items={contributorSections[key]}
              />
            ))}
            {contributorKpis.totalContributors === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Ingen medvirkende med tildelte poster ennå.
              </div>
            )}
          </>
        )}
      </div>

      {/* Add performer dialog */}
      <AddPerformerToSlotDialog
        open={addPerformerOpen}
        onOpenChange={setAddPerformerOpen}
        candidateSlots={slots}
        festivalEntities={festivalEntities}
        festivalId={festivalId}
        eventId={eventId}
        onSaved={() => {}}
      />
    </div>
  );
}
