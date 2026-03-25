import { useState } from "react";
import type { ProductionSlot, ProductionSectionKey } from "@/lib/production-board-mappers";
import { ProductionCard } from "./ProductionCard";
import { ChevronDown, AlertTriangle, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_META: Record<
  ProductionSectionKey,
  { label: string; colorClass: string; icon: typeof AlertTriangle }
> = {
  requires_action: { label: "Krever handling", colorClass: "text-destructive", icon: AlertTriangle },
  unclear: { label: "Uklart", colorClass: "text-muted-foreground", icon: HelpCircle },
  ready: { label: "Klar", colorClass: "text-foreground", icon: CheckCircle2 },
};

interface Props {
  sectionKey: ProductionSectionKey;
  items: ProductionSlot[];
  liveBasePath: string;
}

export function ProductionSection({ sectionKey, items, liveBasePath }: Props) {
  const [open, setOpen] = useState(sectionKey !== "ready");
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;

  if (items.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-4 w-4", meta.colorClass)} />
          <span className={cn("text-sm font-semibold", meta.colorClass)}>
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            ({items.length})
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
        <div className="border-t border-border divide-y divide-border">
          {items.map((item) => (
            <ProductionCard key={item.slot.id} item={item} liveBasePath={liveBasePath} />
          ))}
        </div>
      )}
    </div>
  );
}
