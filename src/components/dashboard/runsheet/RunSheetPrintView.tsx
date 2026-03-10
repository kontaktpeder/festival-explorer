import { useMemo } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Music, Radio, Coffee, Info, DoorOpen, DoorClosed,
  Mic, Headphones, Wrench, Users, SquarePen,
  type LucideIcon,
} from "lucide-react";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { getPerformerDisplay } from "@/lib/program-performers";
import {
  type RunSheetSectionKey,
  RUNSHEET_SECTION_KEYS,
  groupSlotsBySection,
} from "@/lib/runsheet-sections";

const KIND_ICONS: Record<string, LucideIcon> = {
  concert: Music, boiler: Radio, soundcheck: Headphones,
  rigging: Wrench, crew: Users, break: Coffee,
  giggen_info: Info, doors: DoorOpen, closing: DoorClosed,
  stage_talk: Mic, custom: SquarePen,
};

interface TimeGroup {
  time: string;
  timeEnd: string | null;
  items: { scene: string | null; name: string; kind: string; note: string | null; isCanceled: boolean }[];
}

interface RunSheetPrintViewProps {
  festivalName?: string;
  festivalDate?: string;
  venueName?: string;
  slots: ExtendedEventProgramSlot[];
  sectionNames: Record<string, string>;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function toItem(s: ExtendedEventProgramSlot) {
  const perf = getPerformerDisplay(s);
  const name = perf.name !== "Ukjent prosjekt" && perf.name !== "TBA"
    ? perf.name
    : s.title_override || s.slot_kind;
  return { scene: s.stage_label, name, kind: s.slot_kind, note: s.internal_note, isCanceled: s.is_canceled };
}

/** Group slots by start time so parallels are merged */
function groupByTime(slots: ExtendedEventProgramSlot[]): TimeGroup[] {
  const sorted = [...slots].sort((a, b) => {
    const sa = a.sequence_number ?? Infinity;
    const sb = b.sequence_number ?? Infinity;
    if (sa !== sb) return sa - sb;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  const groups: TimeGroup[] = [];
  let current: TimeGroup | null = null;

  for (const s of sorted) {
    const t = fmtTime(s.starts_at);
    // Merge into current group if same time OR same parallel_group_id
    if (current && (current.time === t || (s.parallel_group_id && current.items.length > 0))) {
      current.items.push(toItem(s));
      if (s.ends_at && (!current.timeEnd || new Date(s.ends_at) > new Date(current.timeEnd))) {
        current.timeEnd = s.ends_at;
      }
    } else {
      current = { time: t, timeEnd: s.ends_at, items: [toItem(s)] };
      groups.push(current);
    }
  }

  return groups;
}

export function RunSheetPrintView({
  festivalName, festivalDate, venueName, slots, sectionNames,
}: RunSheetPrintViewProps) {
  const grouped = useMemo(() => groupSlotsBySection(slots), [slots]);
  const lydGroups = useMemo(() => groupByTime(grouped["Lydprøver"]), [grouped]);
  const eventGroups = useMemo(() => groupByTime(grouped["Event"]), [grouped]);

  const s = {
    page: { fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", color: "#111", background: "#fff" } as React.CSSProperties,
    header: { borderBottom: "3px solid #111", paddingBottom: 10, marginBottom: 28 } as React.CSSProperties,
    title: { fontSize: "22pt", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" as const, lineHeight: 1.1 } as React.CSSProperties,
    sub: { fontSize: "10pt", color: "#555", marginTop: 4 } as React.CSSProperties,
    meta: { fontSize: "8pt", color: "#999", marginTop: 2, textTransform: "uppercase" as const, letterSpacing: "0.1em" } as React.CSSProperties,
    sectionTitle: { fontSize: "11pt", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#222", borderBottom: "2px solid #333", paddingBottom: 3, marginBottom: 14 } as React.CSSProperties,
    footer: { borderTop: "1px solid #ccc", paddingTop: 8, marginTop: 24, fontSize: "7pt", color: "#aaa", display: "flex", justifyContent: "space-between" } as React.CSSProperties,
  };

  return (
    <div className="runsheet-print-doc hidden print:block" style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>{festivalName || "Kjøreplan"}</div>
        {(venueName || festivalDate) && (
          <div style={s.sub}>{[venueName, festivalDate].filter(Boolean).join(" · ")}</div>
        )}
        <div style={s.meta}>
          Produksjonskjøreplan · {slots.length} punkt{slots.length !== 1 ? "er" : ""}
        </div>
      </div>

      {/* Lydprøver – compact table */}
      {lydGroups.length > 0 && (
        <div style={{ marginBottom: 28, breakInside: "avoid" }}>
          <div style={s.sectionTitle}>{sectionNames["Lydprøver"] || "Lydprøver"}</div>
          <LydproverTable groups={lydGroups} />
        </div>
      )}

      {/* Event – timeline */}
      {eventGroups.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={s.sectionTitle}>{sectionNames["Event"] || "Event"}</div>
          <EventTimeline groups={eventGroups} />
        </div>
      )}

      {/* Footer */}
      <div style={s.footer}>
        <span>Generert {format(new Date(), "d. MMM yyyy, HH:mm", { locale: nb })}</span>
        <span>GIGGEN · Produksjonsdokument</span>
      </div>
    </div>
  );
}

/** Lydprøver as compact rows – scene + artist per line */
function LydproverTable({ groups }: { groups: TimeGroup[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {groups.map((g, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "baseline", gap: 0,
          borderBottom: "1px solid #eee", padding: "5px 0",
        }}>
          <span style={{ width: 55, fontSize: "11pt", fontWeight: 700, fontFamily: "monospace", color: "#111", flexShrink: 0 }}>
            {g.time}
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {g.items.map((item, j) => (
              <div key={j} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ width: 50, fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#777", flexShrink: 0 }}>
                  {item.scene || "–"}
                </span>
                <span style={{ fontSize: "11pt", fontWeight: 600, color: "#222" }}>
                  {item.name}
                </span>
                {item.note && (
                  <span style={{ fontSize: "8pt", color: "#999", fontStyle: "italic", marginLeft: "auto" }}>
                    {item.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Event section as a visual timeline */
function EventTimeline({ groups }: { groups: TimeGroup[] }) {
  return (
    <div style={{ position: "relative", paddingLeft: 72 }}>
      {/* Vertical timeline line */}
      <div style={{
        position: "absolute", left: 54, top: 0, bottom: 0,
        width: 2, background: "#ddd",
      }} />

      {groups.map((g, i) => {
        const isMulti = g.items.length > 1;
        return (
          <div key={i} style={{
            position: "relative", marginBottom: isMulti ? 18 : 12,
            breakInside: "avoid", pageBreakInside: "avoid",
          }}>
            {/* Time dot */}
            <div style={{
              position: "absolute", left: -72 + 50, top: 8,
              width: 10, height: 10, borderRadius: "50%",
              background: "#333", border: "2px solid #fff",
              boxShadow: "0 0 0 1px #ccc",
            }} />

            {/* Time label */}
            <div style={{
              position: "absolute", left: -72, top: 0, width: 48,
              fontSize: "14pt", fontWeight: 700, fontFamily: "monospace",
              color: "#111", textAlign: "right",
            }}>
              {g.time}
            </div>

            {/* Content */}
            {isMulti ? (
              <div style={{
                border: "1px solid #ddd", borderRadius: 6,
                padding: "10px 14px", background: "#fafafa",
              }}>
                {g.items.map((item, j) => (
                  <TimelineItem key={j} item={item}
                    borderBottom={j < g.items.length - 1}
                    large={false}
                  />
                ))}
              </div>
            ) : (
              <TimelineItem item={g.items[0]} borderBottom={false} large />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineItem({ item, borderBottom, large }: {
  item: TimeGroup["items"][number];
  borderBottom: boolean;
  large: boolean;
}) {
  const Icon = KIND_ICONS[item.kind] || Music;
  const isCritical = ["doors", "closing", "break"].includes(item.kind);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      paddingBottom: borderBottom ? 8 : 0,
      marginBottom: borderBottom ? 8 : 0,
      borderBottom: borderBottom ? "1px solid #eee" : "none",
    }}>
      <Icon size={large ? 16 : 14} color={isCritical ? "#555" : "#888"} strokeWidth={2} style={{ marginTop: 3, flexShrink: 0 }} />

      <div style={{ flex: 1 }}>
        {/* Artist name – the hero */}
        <div style={{
          fontSize: large ? "15pt" : "12pt",
          fontWeight: 700,
          color: item.isCanceled ? "#bbb" : "#111",
          textDecoration: item.isCanceled ? "line-through" : "none",
          lineHeight: 1.2,
        }}>
          {item.name}
        </div>

        {/* Scene + note on same line */}
        {(item.scene || item.note) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {item.scene && (
              <span style={{
                fontSize: "8pt", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#666",
              }}>
                {item.scene}
              </span>
            )}
            {item.note && (
              <span style={{ fontSize: "8.5pt", color: "#999", fontStyle: "italic" }}>
                {item.note}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
