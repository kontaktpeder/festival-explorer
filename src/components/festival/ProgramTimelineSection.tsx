import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ProgramSlotItem } from "./LineupWithTimeSection";
import {
  DoorOpen,
  DoorClosed,
  Mic,
  Music,
  Coffee,
  Info,
  Radio,
  Filter,
} from "lucide-react";

interface FestivalSlotItem {
  starts_at: string;
  ends_at?: string | null;
  name: string | null;
  slug: string | null;
  slot_kind?: string;
  title_override?: string | null;
  performer_kind?: string;
  stage_label?: string | null;
}

interface ProgramTimelineSectionProps {
  events: {
    id: string;
    title: string;
    slug: string;
    start_at: string;
    hero_image_url?: string | null;
  }[];
  slots: ProgramSlotItem[];
  festivalSlots?: FestivalSlotItem[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Scene colors ── */
const SCENE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "1etg": { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
  "2etg": { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  "kjeller": { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
  "boiler room": { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  "boiler": { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
};
const FALLBACK_COLORS = [
  { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/30" },
  { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/30" },
];
const dynamicColorMap = new Map<string, number>();
function getSceneStyle(label: string | null | undefined) {
  if (!label) return null;
  const key = label.toLowerCase().trim();
  if (SCENE_COLORS[key]) return SCENE_COLORS[key];
  if (!dynamicColorMap.has(key)) dynamicColorMap.set(key, dynamicColorMap.size % FALLBACK_COLORS.length);
  return FALLBACK_COLORS[dynamicColorMap.get(key)!];
}

/* ── Slot kind icons ── */
const SLOT_ICONS: Record<string, typeof DoorOpen> = {
  doors: DoorOpen,
  closing: DoorClosed,
  stage_talk: Mic,
  concert: Music,
  boiler: Radio,
  break: Coffee,
  giggen_info: Info,
};

function isCriticalKind(kind: string) {
  return kind === "doors" || kind === "closing";
}

function isSpecialKind(kind: string) {
  return ["doors", "closing", "stage_talk", "giggen_info", "break"].includes(kind);
}

/* ── Merged timeline item ── */
interface TimelineItem {
  time: string;
  startsAt: string;
  items: Array<{
    name: string | null;
    slug: string | null;
    title_override: string | null;
    performer_kind: string;
    slot_kind: string;
    stage_label: string | null;
  }>;
}

function mergeAllSlots(
  eventSlots: ProgramSlotItem[],
  festivalSlots: FestivalSlotItem[]
): TimelineItem[] {
  const all = [
    ...eventSlots.map((s) => ({
      startsAt: s.starts_at,
      name: s.name,
      slug: s.slug,
      title_override: s.title_override ?? null,
      performer_kind: s.performer_kind || "entity",
      slot_kind: s.slot_kind || "concert",
      stage_label: s.stage_label ?? null,
    })),
    ...festivalSlots.map((s) => ({
      startsAt: s.starts_at,
      name: s.name,
      slug: s.slug,
      title_override: s.title_override ?? null,
      performer_kind: s.performer_kind || "entity",
      slot_kind: s.slot_kind || "concert",
      stage_label: s.stage_label ?? null,
    })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const groups: TimelineItem[] = [];
  for (const item of all) {
    const time = formatTime(item.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.time === time) {
      last.items.push(item);
    } else {
      groups.push({ time, startsAt: item.startsAt, items: [item] });
    }
  }
  return groups;
}

/* ── Single slot row ── */
function SlotRow({
  item,
  showTreePrefix,
  isLast,
}: {
  item: TimelineItem["items"][number];
  showTreePrefix?: boolean;
  isLast?: boolean;
}) {
  const isSpecial = isSpecialKind(item.slot_kind);
  const critical = isCriticalKind(item.slot_kind);
  const Icon = SLOT_ICONS[item.slot_kind];
  const sceneStyle = getSceneStyle(item.stage_label);
  const isPersona = item.performer_kind === "persona";
  const linkBase = isPersona ? "/p/" : "/project/";

  const hasTitle = !!item.title_override?.trim();
  const performerName = item.name ?? "TBA";
  // For special slots, show title_override or the kind label as primary
  const displayTitle = hasTitle ? item.title_override : null;

  return (
    <div className={cn(
      "flex items-center gap-3 min-h-[36px]",
      critical && "py-1"
    )}>
      {/* Tree prefix for parallel items */}
      {showTreePrefix && (
        <span className="text-muted-foreground/30 font-mono text-xs shrink-0 w-3 text-center">
          {isLast ? "└" : "├"}
        </span>
      )}

      {/* Icon for special slots */}
      {Icon && isSpecial && (
        <Icon className={cn(
          "h-4 w-4 shrink-0",
          critical ? "text-accent" : "text-muted-foreground/60"
        )} />
      )}

      {/* Scene badge */}
      {item.stage_label && !isSpecial && (
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
          sceneStyle ? `${sceneStyle.bg} ${sceneStyle.text} ${sceneStyle.border}` : "text-muted-foreground/50 border-border/30"
        )}>
          {item.stage_label}
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isSpecial ? (
          <span className={cn(
            "text-sm font-semibold",
            critical ? "text-accent" : "text-foreground/70"
          )}>
            {displayTitle || performerName}
            {hasTitle && item.name && (
              <span className="text-muted-foreground font-normal text-xs ml-2">
                {item.slug ? (
                  <Link to={`${linkBase}${item.slug}`} className="hover:text-accent transition-colors">
                    {performerName}
                  </Link>
                ) : performerName}
              </span>
            )}
          </span>
        ) : (
          <div className="flex flex-col">
            {/* Artist name – primary, larger */}
            {item.slug ? (
              <Link
                to={`${linkBase}${item.slug}`}
                className="text-base font-bold text-foreground hover:text-accent transition-colors truncate"
              >
                {performerName}
              </Link>
            ) : (
              <span className="text-base font-bold text-foreground/90 truncate">
                {performerName}
              </span>
            )}
            {/* Title override – secondary, smaller */}
            {hasTitle && (
              <span className="text-xs text-muted-foreground/60">
                {displayTitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProgramTimelineSection({ events, slots, festivalSlots = [] }: ProgramTimelineSectionProps) {
  const [sceneFilter, setSceneFilter] = useState<string | null>(null);

  const timeline = useMemo(() => mergeAllSlots(slots, festivalSlots), [slots, festivalSlots]);

  // Collect unique scene labels
  const sceneLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const group of timeline) {
      for (const item of group.items) {
        if (item.stage_label) labels.add(item.stage_label);
      }
    }
    return Array.from(labels).sort();
  }, [timeline]);

  // Filter timeline by scene
  const filteredTimeline = useMemo(() => {
    if (!sceneFilter) return timeline;
    return timeline
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.stage_label === sceneFilter || isSpecialKind(item.slot_kind)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [timeline, sceneFilter]);

  // NOW marker
  const nowTime = useMemo(() => {
    const now = Date.now();
    for (let i = filteredTimeline.length - 1; i >= 0; i--) {
      if (new Date(filteredTimeline[i].startsAt).getTime() <= now) {
        return filteredTimeline[i].time;
      }
    }
    return null;
  }, [filteredTimeline]);

  const hasContent = timeline.length > 0;
  if (!hasContent) return null;

  return (
    <section className="relative bg-background py-16 md:py-24 px-6" id="program">
      <div className="max-w-2xl mx-auto space-y-8">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">
          Program
        </h2>

        {/* Scene filter */}
        {sceneLabels.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/40" />
            <button
              onClick={() => setSceneFilter(null)}
              className={cn(
                "text-[11px] px-3 py-1 rounded-full border transition-colors font-medium",
                !sceneFilter
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border/30 hover:border-foreground/30"
              )}
            >
              Alle
            </button>
            {sceneLabels.map((label) => {
              const style = getSceneStyle(label);
              const isActive = sceneFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setSceneFilter(isActive ? null : label)}
                  className={cn(
                    "text-[11px] px-3 py-1 rounded-full border transition-colors font-semibold uppercase tracking-wider",
                    isActive && style
                      ? `${style.bg} ${style.text} ${style.border}`
                      : isActive
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border/30 hover:border-foreground/30"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border/30" />

          <div className="space-y-0">
            {filteredTimeline.map((group, gi) => {
              const isNow = group.time === nowTime;
              const hasParallel = group.items.length > 1;
              const firstItem = group.items[0];
              const critical = firstItem && isCriticalKind(firstItem.slot_kind);

              return (
                <div
                  key={gi}
                  className={cn(
                    "relative flex gap-4 py-3",
                    isNow && "bg-accent/5 -mx-4 px-4 rounded-xl"
                  )}
                >
                  {/* Time column */}
                  <div className="w-[56px] shrink-0 flex flex-col items-center pt-1 relative z-10">
                    {/* Dot on the timeline */}
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full border-2 mb-1",
                      isNow
                        ? "bg-accent border-accent shadow-[0_0_8px_rgba(var(--accent),0.4)]"
                        : critical
                          ? "bg-accent/60 border-accent/60"
                          : "bg-background border-border/60"
                    )} />
                    <span className={cn(
                      "text-xs font-mono tabular-nums font-bold",
                      isNow ? "text-accent" : critical ? "text-accent/80" : "text-muted-foreground"
                    )}>
                      {group.time}
                    </span>
                    {isNow && (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent mt-0.5">
                        NÅ
                      </span>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {hasParallel ? (
                      <div className="space-y-0.5">
                        {group.items.map((item, idx) => (
                          <SlotRow
                            key={idx}
                            item={item}
                            showTreePrefix
                            isLast={idx === group.items.length - 1}
                          />
                        ))}
                      </div>
                    ) : firstItem ? (
                      <SlotRow item={firstItem} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
