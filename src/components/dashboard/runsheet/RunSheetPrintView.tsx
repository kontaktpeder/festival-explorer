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
import { groupSlotsBySection } from "@/lib/runsheet-sections";

/* ── Icon map ── */
const KIND_ICONS: Record<string, LucideIcon> = {
  concert: Music, boiler: Radio, soundcheck: Headphones,
  rigging: Wrench, crew: Users, break: Coffee,
  giggen_info: Info, doors: DoorOpen, closing: DoorClosed,
  stage_talk: Mic, custom: SquarePen,
};

/* ── Types ── */
interface PrintBlock {
  time: string;
  timeEnd: string | null;
  items: PrintItem[];
}

interface PrintItem {
  name: string;
  scene: string | null;
  kind: string;
  note: string | null;
  isCanceled: boolean;
  startsAt: string;
  endsAt: string | null;
}

interface RunSheetPrintViewProps {
  festivalName?: string;
  festivalDate?: string;
  venueName?: string;
  slots: ExtendedEventProgramSlot[];
  sectionNames: Record<string, string>;
}

/* ── Helpers ── */
function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function toItem(s: ExtendedEventProgramSlot): PrintItem {
  const perf = getPerformerDisplay(s);
  const name = perf.name !== "Ukjent prosjekt" && perf.name !== "TBA"
    ? perf.name
    : s.title_override || s.slot_kind;
  return { scene: s.stage_label, name, kind: s.slot_kind, note: s.internal_note, isCanceled: s.is_canceled, startsAt: s.starts_at, endsAt: s.ends_at };
}

function groupByTime(slots: ExtendedEventProgramSlot[]): PrintBlock[] {
  const sorted = [...slots].sort((a, b) => {
    const sa = a.sequence_number ?? Infinity;
    const sb = b.sequence_number ?? Infinity;
    if (sa !== sb) return sa - sb;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  const blocks: PrintBlock[] = [];
  let current: PrintBlock | null = null;

  for (const s of sorted) {
    const t = fmtTime(s.starts_at);
    if (current && (current.time === t || (s.parallel_group_id && current.items.length > 0))) {
      current.items.push(toItem(s));
      if (s.ends_at && (!current.timeEnd || new Date(s.ends_at) > new Date(current.timeEnd))) {
        current.timeEnd = s.ends_at;
      }
    } else {
      current = { time: t, timeEnd: s.ends_at, items: [toItem(s)] };
      blocks.push(current);
    }
  }
  return blocks;
}

/* ── Inline styles (print-only, no Tailwind) ── */
const S = {
  page: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    color: "#111",
    background: "#fff",
  } as React.CSSProperties,

  header: {
    marginBottom: 48,
    paddingBottom: 20,
    borderBottom: "3px solid #111",
  } as React.CSSProperties,

  title: {
    fontSize: "32pt",
    fontWeight: 800,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    lineHeight: 1.1,
  } as React.CSSProperties,

  subtitle: {
    fontSize: "13pt",
    color: "#555",
    marginTop: 8,
  } as React.CSSProperties,

  meta: {
    fontSize: "9pt",
    color: "#999",
    marginTop: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
  } as React.CSSProperties,

  sectionWrap: {
    marginBottom: 56,
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "20pt",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#222",
    borderBottom: "2px solid #333",
    paddingBottom: 6,
    marginBottom: 32,
  } as React.CSSProperties,

  block: {
    border: "1.5px solid #ddd",
    borderRadius: 10,
    padding: "22px 26px",
    marginBottom: 20,
    breakInside: "avoid" as const,
    pageBreakInside: "avoid" as const,
    background: "#fff",
  } as React.CSSProperties,

  blockTime: {
    fontSize: "24pt",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    color: "#111",
    lineHeight: 1,
  } as React.CSSProperties,

  blockTimeEnd: {
    fontSize: "12pt",
    fontWeight: 400,
    color: "#999",
    marginLeft: 8,
  } as React.CSSProperties,

  itemRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 14,
  } as React.CSSProperties,

  itemName: {
    fontSize: "22pt",
    fontWeight: 700,
    color: "#111",
    lineHeight: 1.15,
  } as React.CSSProperties,

  itemNameCanceled: {
    fontSize: "22pt",
    fontWeight: 700,
    color: "#bbb",
    lineHeight: 1.15,
    textDecoration: "line-through",
  } as React.CSSProperties,

  itemScene: {
    fontSize: "11pt",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#666",
    marginTop: 4,
  } as React.CSSProperties,

  itemNote: {
    fontSize: "11pt",
    color: "#888",
    fontStyle: "italic" as const,
    marginTop: 6,
    lineHeight: 1.3,
  } as React.CSSProperties,

  itemSep: {
    borderTop: "1px solid #eee",
    marginTop: 16,
    paddingTop: 16,
  } as React.CSSProperties,

  footer: {
    borderTop: "1px solid #ccc",
    paddingTop: 10,
    marginTop: 40,
    fontSize: "8pt",
    color: "#aaa",
    display: "flex",
    justifyContent: "space-between",
  } as React.CSSProperties,
};

/* ── Components ── */

function CueBlock({ block }: { block: PrintBlock }) {
  const endStr = block.timeEnd ? fmtTime(block.timeEnd) : null;

  return (
    <div style={S.block}>
      {/* Time */}
      <div>
        <span style={S.blockTime}>{block.time}</span>
        {endStr && endStr !== block.time && (
          <span style={S.blockTimeEnd}>– {endStr}</span>
        )}
      </div>

      {/* Items */}
      {block.items.map((item, i) => {
        const Icon = KIND_ICONS[item.kind] || Music;
        const isMulti = block.items.length > 1;
        const itemTime = fmtTime(item.startsAt);
        const itemEnd = item.endsAt ? fmtTime(item.endsAt) : null;
        return (
          <div
            key={i}
            style={i > 0 ? { ...S.itemRow, ...S.itemSep } : S.itemRow}
          >
            <Icon
              size={22}
              color="#666"
              strokeWidth={2}
              style={{ marginTop: 4, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={item.isCanceled ? S.itemNameCanceled : S.itemName}>
                  {item.name}
                </div>
                {/* Show individual time per item when parallel or for clarity */}
                {isMulti && (
                  <span style={{ fontSize: "11pt", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#888", whiteSpace: "nowrap" }}>
                    {itemTime}{itemEnd && itemEnd !== itemTime ? `–${itemEnd}` : ""}
                  </span>
                )}
              </div>
              {item.scene && (
                <div style={S.itemScene}>{item.scene}</div>
              )}
              {item.note && (
                <div style={S.itemNote}>{item.note}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RunSheetPrintView({
  festivalName, festivalDate, venueName, slots, sectionNames,
}: RunSheetPrintViewProps) {
  const grouped = useMemo(() => groupSlotsBySection(slots), [slots]);
  const lydBlocks = useMemo(() => groupByTime(grouped["Lydprøver"]), [grouped]);
  const eventBlocks = useMemo(() => groupByTime(grouped["Event"]), [grouped]);

  return (
    <div className="runsheet-print-doc hidden print:block" style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>{festivalName || "Kjøreplan"}</div>
        {(venueName || festivalDate) && (
          <div style={S.subtitle}>
            {[venueName, festivalDate].filter(Boolean).join(" · ")}
          </div>
        )}
        <div style={S.meta}>
          Produksjonskjøreplan · {slots.length} punkt{slots.length !== 1 ? "er" : ""}
        </div>
      </div>

      {/* Lydprøver */}
      {lydBlocks.length > 0 && (
        <div style={S.sectionWrap}>
          <div style={S.sectionTitle}>
            {sectionNames["Lydprøver"] || "Lydprøver"}
          </div>
          {lydBlocks.map((b, i) => (
            <CueBlock key={i} block={b} />
          ))}
        </div>
      )}

      {/* Event */}
      {eventBlocks.length > 0 && (
        <div style={S.sectionWrap}>
          <div style={S.sectionTitle}>
            {sectionNames["Event"] || "Event"}
          </div>
          {eventBlocks.map((b, i) => (
            <CueBlock key={i} block={b} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={S.footer}>
        <span>Generert {format(new Date(), "d. MMM yyyy, HH:mm", { locale: nb })}</span>
        <span>GIGGEN · Produksjonsdokument</span>
      </div>
    </div>
  );
}
