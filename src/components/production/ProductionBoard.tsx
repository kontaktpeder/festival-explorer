import { useState } from "react";
import { Link } from "react-router-dom";
import { useProductionBoardData } from "@/hooks/useProductionBoardData";
import { ProductionKpiBar } from "./ProductionKpiBar";
import { ProductionFilters } from "./ProductionFilters";
import { ProductionSection } from "./ProductionSection";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";
import type { ProductionFilter, ProductionSectionKey } from "@/lib/production-board-mappers";

interface Props {
  festivalId: string | null;
  eventId: string | null;
  liveBasePath: string;
}

const SECTION_ORDER: ProductionSectionKey[] = ["requires_action", "unclear", "ready"];

export function ProductionBoard({ festivalId, eventId, liveBasePath }: Props) {
  const [filter, setFilter] = useState<ProductionFilter>("all");

  const { isLoading, kpis, sections, sceneLabels } = useProductionBoardData({
    festivalId,
    eventId,
    filter,
  });

  if (isLoading) {
    return <LoadingState message="Laster produksjonsdata..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Produksjon</h2>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to={liveBasePath}>
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Åpne Live
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <ProductionKpiBar kpis={kpis} />

      {/* Filters */}
      <ProductionFilters active={filter} onChange={setFilter} sceneLabels={sceneLabels} />

      {/* Sections */}
      <div className="space-y-3">
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
      </div>
    </div>
  );
}
