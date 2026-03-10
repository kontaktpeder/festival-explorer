import { useMemo } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Music,
  Radio,
  Coffee,
  Info,
  DoorOpen,
  DoorClosed,
  Mic,
  Headphones,
  Wrench,
  Users,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { getPerformerDisplay } from "@/lib/program-performers";
import {
  type RunSheetSectionKey,
  RUNSHEET_SECTION_KEYS,
  groupSlotsBySection,
} from "@/lib/runsheet-sections";

/* ── Icon map ── */
const KIND_ICONS: Record<string, LucideIcon> = {
  concert: Music,
  boiler: Radio,
  soundcheck: Headphones,
  rigging: Wrench,
  crew: Users,
  break: Coffee,
  giggen_info: Info,
  doors: DoorOpen,
  closing: DoorClosed,
  stage_talk: Mic,
  custom: SquarePen,
};

const KIND_LABELS: Record<string, string> = {
  concert: "Konsert",
  boiler: "Boiler Room",
  soundcheck: "Lydprøve",
  rigging: "Opprigg",
  crew: "Crew",
  break: "Pause",
  giggen_info: "Hva er GIGGEN",
  doors: "Dører",
  closing: "Stenging",
  stage_talk: "Snakk fra scenen",
  custom: "Egendefinert",
};

/* ── Types ── */
interface PrintBlock {
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  seqNum: number;
  prefix: string;
  items: {
    scene: string | null;
    name: string;
    kind: string;
    note: string | null;
    isCanceled: boolean;
  }[];
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

function fmtDuration(startsAt: string, endsAt: string | null, mins: number | null): string {
  const m = mins || (endsAt ? Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000) : 0);
  if (!m || m <= 0) return "";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}t ${r}m` : `${h}t`;
}

function buildBlocks(slots: ExtendedEventProgramSlot[], prefix: string): PrintBlock[] {
  const parallelMap = new Map<string, ExtendedEventProgramSlot[]>();
  const blocks: PrintBlock[] = [];

  const toItem = (s: ExtendedEventProgramSlot) => {
    const perf = getPerformerDisplay(s);
    const name = perf.name !== "Ukjent prosjekt" && perf.name !== "TBA"
      ? perf.name
      : s.title_override || KIND_LABELS[s.slot_kind] || s.slot_kind;
    return { scene: s.stage_label, name, kind: s.slot_kind, note: s.internal_note, isCanceled: s.is_canceled };
  };

  for (const s of slots) {
    if (s.parallel_group_id) {
      const arr = parallelMap.get(s.parallel_group_id) || [];
      arr.push(s);
      parallelMap.set(s.parallel_group_id, arr);
    } else {
      blocks.push({
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        durationMinutes: s.duration_minutes,
        seqNum: s.sequence_number ?? 0,
        prefix,
        items: [toItem(s)],
      });
    }
  }

  for (const [, arr] of parallelMap) {
    const p = arr[0];
    blocks.push({
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      durationMinutes: p.duration_minutes,
      seqNum: p.sequence_number ?? 0,
      prefix,
      items: arr.map(toItem),
    });
  }

  blocks.sort((a, b) => {
    if (a.seqNum !== b.seqNum) return a.seqNum - b.seqNum;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });

  return blocks;
}

/* ── Component ── */
export function RunSheetPrintView({
  festivalName,
  festivalDate,
  venueName,
  slots,
  sectionNames,
}: RunSheetPrintViewProps) {
  const grouped = useMemo(() => groupSlotsBySection(slots), [slots]);
  const prefixes: Record<string, string> = { Lydprøver: "L", Event: "E" };

  const sections = RUNSHEET_SECTION_KEYS
    .map((key) => ({
      key,
      name: sectionNames[key] || key,
      blocks: buildBlocks(grouped[key], prefixes[key] || ""),
    }))
    .filter((s) => s.blocks.length > 0);

  return (
    <div className="runsheet-print-doc hidden print:block">
      {/* ── Header ── */}
      <div style={{ borderBottom: "3px solid #111", paddingBottom: 12, marginBottom: 28 }}>
        <div style={{ fontSize: "22pt", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "#111", lineHeight: 1.1 }}>
          {festivalName || "Kjøreplan"}
        </div>
        {(venueName || festivalDate) && (
          <div style={{ fontSize: "10pt", color: "#555", marginTop: 4 }}>
            {[venueName, festivalDate].filter(Boolean).join(" · ")}
          </div>
        )}
        <div style={{ fontSize: "8pt", color: "#999", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Produksjonskjøreplan · {slots.length} punkt{slots.length !== 1 ? "er" : ""}
        </div>
      </div>

      {/* ── Sections ── */}
      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: 32, breakInside: "avoid" }}>
          {/* Section title */}
          <div style={{ borderBottom: "2px solid #333", paddingBottom: 4, marginBottom: 16 }}>
            <div style={{ fontSize: "12pt", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#222" }}>
              {section.name}
            </div>
          </div>

          {/* Blocks */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {section.blocks.map((block, idx) => (
              <PrintBlock key={idx} block={block} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, marginTop: 20, fontSize: "7pt", color: "#aaa", display: "flex", justifyContent: "space-between" }}>
        <span>Generert {format(new Date(), "d. MMM yyyy, HH:mm", { locale: nb })}</span>
        <span>GIGGEN · Produksjonsdokument</span>
      </div>
    </div>
  );
}

/* ── Block row ── */
function PrintBlock({ block }: { block: PrintBlock }) {
  const dur = fmtDuration(block.startsAt, block.endsAt, block.durationMinutes);
  const endTime = block.endsAt ? fmtTime(block.endsAt) : "";
  const isMulti = block.items.length > 1;

  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: "14px 18px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}>
      {/* Time row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: isMulti ? 10 : 6 }}>
        <span style={{ fontSize: "18pt", fontWeight: 700, fontFamily: "monospace", color: "#111", letterSpacing: "-0.02em" }}>
          {fmtTime(block.startsAt)}
        </span>
        {endTime && (
          <span style={{ fontSize: "11pt", fontFamily: "monospace", color: "#999" }}>
            – {endTime}
          </span>
        )}
        {dur && (
          <span style={{ fontSize: "9pt", color: "#aaa", fontFamily: "monospace", marginLeft: 4 }}>
            ({dur})
          </span>
        )}
        {/* Sequence badge */}
        <span style={{ fontSize: "8pt", color: "#ccc", fontFamily: "monospace", marginLeft: "auto" }}>
          {block.prefix}{String(block.seqNum).padStart(2, "0")}
        </span>
      </div>

      {/* Items */}
      {block.items.map((item, i) => (
        <PrintItem key={i} item={item} isMulti={isMulti} isLast={i === block.items.length - 1} />
      ))}
    </div>
  );
}

/* ── Single item within a block ── */
function PrintItem({ item, isMulti, isLast }: {
  item: PrintBlock["items"][number];
  isMulti: boolean;
  isLast: boolean;
}) {
  const Icon = KIND_ICONS[item.kind] || Music;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      paddingBottom: isMulti && !isLast ? 8 : 0,
      marginBottom: isMulti && !isLast ? 8 : 0,
      borderBottom: isMulti && !isLast ? "1px solid #eee" : "none",
    }}>
      {/* Icon */}
      <div style={{ marginTop: 3, flexShrink: 0 }}>
        <Icon size={18} color="#666" strokeWidth={2} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name – the hero element */}
        <div style={{
          fontSize: "16pt",
          fontWeight: 700,
          color: item.isCanceled ? "#bbb" : "#111",
          textDecoration: item.isCanceled ? "line-through" : "none",
          lineHeight: 1.2,
        }}>
          {item.name}
        </div>

        {/* Scene chip + note */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          {item.scene && (
            <span style={{
              fontSize: "8pt",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#555",
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "2px 8px",
              background: "#f5f5f5",
            }}>
              {item.scene}
            </span>
          )}
          {item.note && (
            <span style={{ fontSize: "9pt", color: "#888", fontStyle: "italic" }}>
              {item.note}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
