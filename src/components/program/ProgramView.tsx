// src/components/program/ProgramView.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSlotKindConfig } from "@/lib/program-slots";
import type { SlotKind } from "@/types/database";
import type { ProgramCategory, ProgramItem } from "@/types/program";

type Props = {
  categories: ProgramCategory[];
  title?: string;
  showTime?: boolean;
  accordion?: boolean;
  showEmptyState?: boolean;
  hideCategoryTitleInAccordion?: boolean;
  /** Hide categories with zero items (default true) */
  hideEmptyCategories?: boolean;
};

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm", { locale: nb });
}

function ItemRow({
  item,
  type,
  showTime,
}: {
  item: ProgramItem;
  type: ProgramCategory["type"];
  showTime?: boolean;
}) {
  const time = showTime ? formatTime(item.startAt) : "";
  const slotCfg =
    type === "slots" && item.slotKind
      ? getSlotKindConfig(item.slotKind as SlotKind)
      : null;
  const Icon = slotCfg?.icon ?? null;

  const isCanceled = !!(item.meta?.isCanceled);
  const isHighlighted = !!(item.meta?.isHighlighted);
  const highlightLabel = item.meta?.highlightLabel as string | undefined;
  const isPerformance = type === "slots"
    ? ["concert", "boiler", "stage_talk"].includes(item.slotKind ?? "")
    : true;

  const primaryLabel = item.label || (slotCfg?.label ?? "Program");
  const hasValidHref = !!(item.href && item.href.trim() && !isCanceled);

  const content = (
    <div className="flex items-center gap-3 w-full">
      {showTime && (
        <span className="text-xs font-mono text-muted-foreground/50 tabular-nums w-12 shrink-0">
          {time || "–"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
          )}
          <span
            className={cn(
              "text-sm",
              isCanceled && "line-through text-muted-foreground",
              !isCanceled && isPerformance && "font-medium text-foreground/90",
              !isCanceled && !isPerformance && "text-muted-foreground/60"
            )}
          >
            {primaryLabel}
          </span>
          {item.zone && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
              {item.zone}
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">
            {item.subtitle}
          </p>
        )}
      </div>

      {hasValidHref && (
        <span className="text-muted-foreground/30 text-sm shrink-0">›</span>
      )}
    </div>
  );

  const wrapperClassName = cn(
    "py-3 transition-colors",
    isHighlighted && "border-l-2 border-accent pl-3 -ml-3",
    isCanceled && "opacity-50"
  );

  if (hasValidHref) {
    return (
      <Link to={item.href!} className={cn(wrapperClassName, "block hover:bg-muted/10 rounded-md px-2")}>
        {highlightLabel && (
          <span className="text-[9px] uppercase tracking-widest text-accent font-bold mb-0.5 block">
            {highlightLabel}
          </span>
        )}
        {content}
      </Link>
    );
  }

  return (
    <div className={cn(wrapperClassName, "px-2")}>
      {highlightLabel && (
        <span className="text-[9px] uppercase tracking-widest text-accent font-bold mb-0.5 block">
          {highlightLabel}
        </span>
      )}
      {content}
    </div>
  );
}

function CategoryBlock({
  category,
  showTime,
  showEmptyState,
  hideTitle,
}: {
  category: ProgramCategory;
  showTime?: boolean;
  showEmptyState?: boolean;
  hideTitle?: boolean;
}) {
  const items = category.items ?? [];
  const showTimeForCategory = showTime && category.type === "slots";

  return (
    <div>
      {!hideTitle && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
            {category.label}
          </h3>
        </div>
      )}

      {items.length === 0 ? (
        showEmptyState ? (
          <p className="text-sm text-muted-foreground/40 py-4">
            Kommer snart.
          </p>
        ) : null
      ) : (
        <div className="divide-y divide-border/10">
          {items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              type={category.type}
              showTime={showTimeForCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgramView({
  categories,
  title = "Program",
  showTime = false,
  accordion = true,
  showEmptyState = false,
  hideCategoryTitleInAccordion = true,
  hideEmptyCategories = true,
}: Props) {
  const allCategories = categories ?? [];
  const finalCategories = hideEmptyCategories
    ? allCategories.filter((c) => (c.items?.length ?? 0) > 0)
    : allCategories;

  const [openId, setOpenId] = React.useState<string | null>(
    accordion && finalCategories.length > 0 ? finalCategories[0].id : null
  );

  // Sync openId if categories change and current is gone
  React.useEffect(() => {
    if (accordion && openId && !finalCategories.some((c) => c.id === openId)) {
      setOpenId(finalCategories.length > 0 ? finalCategories[0].id : null);
    }
  }, [accordion, openId, finalCategories]);

  if (finalCategories.length === 0 && !showEmptyState) return null;

  return (
    <div>
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          {title}
        </h2>
      )}

      {!accordion ? (
        <div className="space-y-8">
          {finalCategories.map((cat) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              showTime={showTime}
              showEmptyState={showEmptyState}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border/10">
          {finalCategories.map((cat) => {
            const isOpen = openId === cat.id;
            return (
              <div key={cat.id}>
                <button
                  onClick={() =>
                    setOpenId((prev) => (prev === cat.id ? null : cat.id))
                  }
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between text-left",
                    "hover:bg-muted/50 transition-colors rounded-md"
                  )}
                >
                  <span className="text-sm font-medium text-foreground/80">
                    {cat.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/40">
                      {cat.items?.length ?? 0}
                    </span>
                    <span className="text-muted-foreground/40 text-sm w-5 text-center">
                      {isOpen ? "−" : "+"}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-4 px-2">
                    <CategoryBlock
                      category={cat}
                      showTime={showTime}
                      showEmptyState={showEmptyState}
                      hideTitle={hideCategoryTitleInAccordion}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
