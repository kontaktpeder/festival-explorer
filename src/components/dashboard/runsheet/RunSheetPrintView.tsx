import { useMemo } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { getPerformerDisplay } from "@/lib/program-performers";
import { getSlotKindConfig } from "@/lib/program-slots";
import type { SlotKind } from "@/types/database";
import {
  type RunSheetSectionKey,
  RUNSHEET_SECTION_KEYS,
  groupSlotsBySection,
} from "@/lib/runsheet-sections";

interface RunSheetPrintViewProps {
  festivalName?: string;
  festivalDate?: string;
  venueName?: string;
  slots: ExtendedEventProgramSlot[];
  sectionNames: Record<RunSheetSectionKey, string>;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function fmtDuration(startsAt: string, endsAt: string | null, durationMinutes: number | null): string {
  if (durationMinutes) {
    if (durationMinutes < 60) return `${durationMinutes} min`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m > 0 ? `${h}t ${m}m` : `${h}t`;
  }
  if (endsAt) {
    const diff = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
    if (diff > 0) {
      if (diff < 60) return `${diff} min`;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return m > 0 ? `${h}t ${m}m` : `${h}t`;
    }
  }
  return "";
}

/** Group adjacent parallel_group_id slots */
interface PrintRow {
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  seqNum: number;
  sectionPrefix: string;
  items: {
    scene: string | null;
    name: string;
    kind: string;
    kindLabel: string;
    note: string | null;
    isCanceled: boolean;
  }[];
}

function buildPrintRows(slots: ExtendedEventProgramSlot[], prefix: string): PrintRow[] {
  const parallelMap = new Map<string, ExtendedEventProgramSlot[]>();
  const rows: PrintRow[] = [];

  for (const s of slots) {
    if (s.parallel_group_id) {
      const arr = parallelMap.get(s.parallel_group_id) || [];
      arr.push(s);
      parallelMap.set(s.parallel_group_id, arr);
    } else {
      const performer = getPerformerDisplay(s);
      const kindConfig = getSlotKindConfig(s.slot_kind as SlotKind);
      const displayName = performer.name !== "Ukjent prosjekt" && performer.name !== "TBA"
        ? performer.name
        : s.title_override || kindConfig.label;
      rows.push({
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        durationMinutes: s.duration_minutes,
        seqNum: s.sequence_number ?? 0,
        sectionPrefix: prefix,
        items: [{
          scene: s.stage_label,
          name: displayName,
          kind: s.slot_kind,
          kindLabel: kindConfig.label,
          note: s.internal_note,
          isCanceled: s.is_canceled,
        }],
      });
    }
  }

  for (const [, arr] of parallelMap) {
    const primary = arr[0];
    rows.push({
      startsAt: primary.starts_at,
      endsAt: primary.ends_at,
      durationMinutes: primary.duration_minutes,
      seqNum: primary.sequence_number ?? 0,
      sectionPrefix: prefix,
      items: arr.map((s) => {
        const performer = getPerformerDisplay(s);
        const kindConfig = getSlotKindConfig(s.slot_kind as SlotKind);
        const displayName = performer.name !== "Ukjent prosjekt" && performer.name !== "TBA"
          ? performer.name
          : s.title_override || kindConfig.label;
        return {
          scene: s.stage_label,
          name: displayName,
          kind: s.slot_kind,
          kindLabel: kindConfig.label,
          note: s.internal_note,
          isCanceled: s.is_canceled,
        };
      }),
    });
  }

  rows.sort((a, b) => {
    if (a.seqNum !== b.seqNum) return a.seqNum - b.seqNum;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });

  return rows;
}

/** Kind → emoji for critical types */
const KIND_MARKERS: Record<string, string> = {
  doors: "🚪",
  closing: "🔒",
  break: "☕",
  stage_talk: "🎤",
  giggen_info: "ℹ️",
};

export function RunSheetPrintView({
  festivalName,
  festivalDate,
  venueName,
  slots,
  sectionNames,
}: RunSheetPrintViewProps) {
  const grouped = useMemo(() => groupSlotsBySection(slots), [slots]);

  const sectionPrefixes: Record<string, string> = { Lydprøver: "L", Event: "E" };

  const sections = RUNSHEET_SECTION_KEYS
    .map((key) => ({
      key,
      name: sectionNames[key] || key,
      prefix: sectionPrefixes[key] || "",
      rows: buildPrintRows(grouped[key], sectionPrefixes[key] || ""),
    }))
    .filter((s) => s.rows.length > 0);

  return (
    <div className="runsheet-print-doc hidden print:block" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* ── Document header ── */}
      <div style={{ borderBottom: "3px solid #111", paddingBottom: "10px", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "18pt", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", margin: 0, color: "#111" }}>
          {festivalName || "Kjøreplan"}
        </h1>
        <div style={{ fontSize: "9pt", color: "#666", marginTop: "4px", display: "flex", gap: "8px" }}>
          {venueName && <span>{venueName}</span>}
          {venueName && festivalDate && <span>·</span>}
          {festivalDate && <span>{festivalDate}</span>}
          <span>·</span>
          <span>Produksjonskjøreplan</span>
          <span>·</span>
          <span>{slots.length} punkt{slots.length !== 1 ? "er" : ""}</span>
        </div>
      </div>

      {/* ── Sections ── */}
      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: "28px", breakInside: "avoid" }}>
          {/* Section title */}
          <div style={{
            borderBottom: "2px solid #333",
            paddingBottom: "4px",
            marginBottom: "12px",
          }}>
            <h2 style={{
              fontSize: "11pt",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
              color: "#222",
            }}>
              {section.name}
            </h2>
          </div>

          {/* Rows */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: "4px 8px 4px 0", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", width: "50px" }}>Nr</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", width: "55px" }}>Tid</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", width: "70px" }}>Scene</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>Punkt</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", width: "70px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", width: "50px" }}>Var.</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, fontSize: "8pt", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>Notat</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIdx) => {
                const marker = KIND_MARKERS[row.items[0]?.kind] || "";
                const isMulti = row.items.length > 1;
                const dur = fmtDuration(row.startsAt, row.endsAt, row.durationMinutes);
                const endTime = row.endsAt ? fmtTime(row.endsAt) : "";

                if (!isMulti) {
                  const item = row.items[0];
                  return (
                    <tr key={rowIdx} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "6px 8px 6px 0", color: "#bbb", fontSize: "8pt", fontFamily: "monospace", verticalAlign: "top" }}>
                        {row.sectionPrefix}{String(row.seqNum).padStart(2, "0")}
                      </td>
                      <td style={{ padding: "6px 8px", fontFamily: "monospace", fontWeight: 600, verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {fmtTime(row.startsAt)}
                        {endTime && <span style={{ color: "#999", fontWeight: 400 }}> – {endTime}</span>}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "8.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#555", verticalAlign: "top" }}>
                        {item.scene || "–"}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 700, fontSize: "10.5pt", verticalAlign: "top", textDecoration: item.isCanceled ? "line-through" : "none" }}>
                        {marker && <span style={{ marginRight: "4px" }}>{marker}</span>}
                        {item.name}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "8pt", color: "#888", verticalAlign: "top" }}>
                        {item.kindLabel}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "8pt", color: "#888", fontFamily: "monospace", verticalAlign: "top" }}>
                        {dur}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "8pt", color: "#666", fontStyle: "italic", verticalAlign: "top" }}>
                        {item.note || ""}
                      </td>
                    </tr>
                  );
                }

                // Parallel rows
                return row.items.map((item, itemIdx) => (
                  <tr key={`${rowIdx}-${itemIdx}`} style={{ borderBottom: itemIdx === row.items.length - 1 ? "1px solid #eee" : "none" }}>
                    {itemIdx === 0 && (
                      <>
                        <td rowSpan={row.items.length} style={{ padding: "6px 8px 6px 0", color: "#bbb", fontSize: "8pt", fontFamily: "monospace", verticalAlign: "top" }}>
                          {row.sectionPrefix}{String(row.seqNum).padStart(2, "0")}
                        </td>
                        <td rowSpan={row.items.length} style={{ padding: "6px 8px", fontFamily: "monospace", fontWeight: 600, verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {fmtTime(row.startsAt)}
                          {endTime && <span style={{ color: "#999", fontWeight: 400 }}> – {endTime}</span>}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "4px 8px", fontSize: "8.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#555", verticalAlign: "top" }}>
                      {item.scene || "–"}
                    </td>
                    <td style={{ padding: "4px 8px", fontWeight: 700, fontSize: "10.5pt", verticalAlign: "top", textDecoration: item.isCanceled ? "line-through" : "none" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "4px 8px", fontSize: "8pt", color: "#888", verticalAlign: "top" }}>
                      {item.kindLabel}
                    </td>
                    {itemIdx === 0 && (
                      <td rowSpan={row.items.length} style={{ padding: "6px 8px", fontSize: "8pt", color: "#888", fontFamily: "monospace", verticalAlign: "top" }}>
                        {dur}
                      </td>
                    )}
                    <td style={{ padding: "4px 8px", fontSize: "8pt", color: "#666", fontStyle: "italic", verticalAlign: "top" }}>
                      {item.note || ""}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: "8px", marginTop: "16px", fontSize: "7pt", color: "#aaa", display: "flex", justifyContent: "space-between" }}>
        <span>Generert {format(new Date(), "d. MMM yyyy, HH:mm", { locale: nb })}</span>
        <span>GIGGEN · Produksjonsdokument</span>
      </div>
    </div>
  );
}
