import { useState } from "react";
import { Link } from "react-router-dom";
import { useProductionBoardData } from "@/hooks/useProductionBoardData";
import { ProductionKpiBar } from "./ProductionKpiBar";
import { ProductionFilters } from "./ProductionFilters";
import { ProductionSection } from "./ProductionSection";
import { ContributorSection } from "./ContributorSection";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Radio, LayoutList, Users } from "lucide-react";
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

  const {
    isLoading, kpis, sections, sceneLabels,
    contributorSections, contributorKpis,
  } = useProductionBoardData({
    festivalId,
    eventId,
    filter,
  });

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
            onClick={() => setTab("slots")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "slots"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/30",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Poster
          </button>
          <button
            onClick={() => setTab("contributors")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border",
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
        </div>

        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to={liveBasePath}>
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Åpne Live
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <ProductionKpiBar kpis={kpis} />

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
    </div>
  );
}
