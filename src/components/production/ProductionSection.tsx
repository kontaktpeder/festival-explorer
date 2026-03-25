import { useState } from "react";
import type { ProductionSlot, ProductionSectionKey } from "@/lib/production-board-mappers";
import { ProductionCard } from "./ProductionCard";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_META: Record<ProductionSectionKey, { label: string; colorClass: string }> = {
  requires_action: { label: "Krever handling", colorClass: "text-destructive" },
  unclear: { label: "Uklart", colorClass: "text-yellow-600" },
  ready: { label: "Klar", colorClass: "text-emerald-600" },
};

interface Props {
  sectionKey: ProductionSectionKey;
  items: ProductionSlot[];
  liveBasePath: string;
}

export function ProductionSection({ sectionKey, items, liveBasePath }: Props) {
  const [open, setOpen] = useState(sectionKey !== "ready");
  const meta = SECTION_META[sectionKey];

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/30 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", meta.colorClass)}>
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
            {items.length}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {items.map((item) => (
            <ProductionCard key={item.slot.id} item={item} liveBasePath={liveBasePath} />
          ))}
        </div>
      )}
    </div>
  );
}
