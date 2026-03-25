import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

export interface ProductionSignals {
  hasOpenIssue: boolean;
  hasCriticalIssue: boolean;
  hasHighIssue: boolean;
  hasMediumLowIssue: boolean;
  missingTechRider: boolean;
  missingContract: boolean;
  missingCrew: boolean;
  requiresAction: boolean;
  unclear: boolean;
  ready: boolean;
  badges: string[];
  filters: string[];
}

export interface ProductionSlot {
  slot: ExtendedEventProgramSlot;
  signals: ProductionSignals;
  issues: EventIssueRow[];
}

export interface ProductionKpis {
  totalSlots: number;
  requiresActionCount: number;
  unclearCount: number;
  readyCount: number;
  openIssuesCount: number;
  missingRiderCount: number;
  missingContractCount: number;
  missingCrewCount: number;
}

export type ProductionFilter =
  | "all"
  | "requires_action"
  | "unclear"
  | "ready"
  | "missing_rider"
  | "missing_contract"
  | "missing_crew"
  | "has_issue"
  | "concert_only"
  | `scene:${string}`;

export type ProductionSectionKey = "requires_action" | "unclear" | "ready";

// ── Signal mapper (single source of truth) ──

export function mapSlotToProductionSignals(
  slot: ExtendedEventProgramSlot,
  openIssuesForSlot: EventIssueRow[],
): ProductionSignals {
  const isCanceled = slot.is_canceled;

  // 1) Issues
  const hasOpenIssue = openIssuesForSlot.length > 0;
  const hasCriticalIssue = openIssuesForSlot.some((i) => i.severity === "critical");
  const hasHighIssue = openIssuesForSlot.some((i) => i.severity === "high");
  const hasMediumLowIssue = openIssuesForSlot.some(
    (i) => i.severity === "medium" || i.severity === "low",
  );

  // 2) Rider
  const isPerformanceSlot =
    !isCanceled &&
    !!slot.performer_entity_id &&
    (slot.slot_kind === "concert" || slot.slot_kind === "soundcheck");

  const missingTechRider =
    isPerformanceSlot &&
    !(slot as any).tech_rider_asset_id &&
    !slot.tech_rider_media_id;

  // 3) Contract
  const missingContract = isPerformanceSlot && !slot.contract_media_id;

  // 4) Crew proxy
  const missingCrew =
    (slot.slot_kind === "concert" || slot.slot_kind === "soundcheck") &&
    !isCanceled &&
    (!slot.stage_label || slot.stage_label.trim() === "");

  // 5) Status levels (mutually exclusive)
  const requiresAction =
    hasCriticalIssue || hasHighIssue || missingTechRider || missingContract || missingCrew;

  const unclear =
    !requiresAction &&
    (hasMediumLowIssue ||
      slot.internal_status === "pending" ||
      slot.internal_status === "draft");

  const ready = !requiresAction && !unclear;

  // 6) Badges
  const badges: string[] = [];
  if (hasCriticalIssue) badges.push("Issue: critical");
  else if (hasHighIssue) badges.push("Issue: high");
  else if (hasOpenIssue) badges.push("Issue");
  if (missingTechRider) badges.push("Mangler rider");
  if (missingContract) badges.push("Mangler kontrakt");
  if (missingCrew) badges.push("Mangler crew");
  if (ready) badges.push("Klar");

  // 7) Filters
  const filters: string[] = [];
  if (requiresAction) filters.push("requires_action");
  else if (unclear) filters.push("unclear");
  else filters.push("ready");
  if (missingTechRider) filters.push("missing_rider");
  if (missingContract) filters.push("missing_contract");
  if (missingCrew) filters.push("missing_crew");
  if (hasOpenIssue) filters.push("has_issue");
  if (slot.slot_kind === "concert") filters.push("concert_only");
  if (slot.stage_label) filters.push(`scene:${slot.stage_label}`);

  return {
    hasOpenIssue,
    hasCriticalIssue,
    hasHighIssue,
    hasMediumLowIssue,
    missingTechRider,
    missingContract,
    missingCrew,
    requiresAction,
    unclear,
    ready,
    badges,
    filters,
  };
}

// ── Build production data ──

export function buildProductionSlots(
  slots: ExtendedEventProgramSlot[],
  issues: EventIssueRow[],
): ProductionSlot[] {
  const issuesBySlot = new Map<string, EventIssueRow[]>();
  for (const issue of issues) {
    const key = issue.related_program_slot_id;
    if (!issuesBySlot.has(key)) issuesBySlot.set(key, []);
    issuesBySlot.get(key)!.push(issue);
  }

  return slots.map((slot) => {
    const slotIssues = issuesBySlot.get(slot.id) ?? [];
    return {
      slot,
      signals: mapSlotToProductionSignals(slot, slotIssues),
      issues: slotIssues,
    };
  });
}

export function computeKpis(items: ProductionSlot[], allIssues: EventIssueRow[]): ProductionKpis {
  return {
    totalSlots: items.length,
    requiresActionCount: items.filter((i) => i.signals.requiresAction).length,
    unclearCount: items.filter((i) => i.signals.unclear).length,
    readyCount: items.filter((i) => i.signals.ready).length,
    openIssuesCount: allIssues.length,
    missingRiderCount: items.filter((i) => i.signals.missingTechRider).length,
    missingContractCount: items.filter((i) => i.signals.missingContract).length,
    missingCrewCount: items.filter((i) => i.signals.missingCrew).length,
  };
}

export function filterProductionSlots(
  items: ProductionSlot[],
  filter: ProductionFilter,
): ProductionSlot[] {
  if (filter === "all") return items;
  return items.filter((i) => i.signals.filters.includes(filter));
}

function sortPriority(s: ProductionSignals): number {
  if (s.hasCriticalIssue) return 0;
  if (s.hasHighIssue) return 1;
  if (s.missingTechRider || s.missingContract || s.missingCrew) return 2;
  return 3;
}

export function groupBySections(
  items: ProductionSlot[],
): Record<ProductionSectionKey, ProductionSlot[]> {
  const sections: Record<ProductionSectionKey, ProductionSlot[]> = {
    requires_action: [],
    unclear: [],
    ready: [],
  };

  for (const item of items) {
    if (item.signals.requiresAction) sections.requires_action.push(item);
    else if (item.signals.unclear) sections.unclear.push(item);
    else sections.ready.push(item);
  }

  const sortFn = (a: ProductionSlot, b: ProductionSlot) => {
    const pa = sortPriority(a.signals);
    const pb = sortPriority(b.signals);
    if (pa !== pb) return pa - pb;
    const ta = a.slot.starts_at ? new Date(a.slot.starts_at).getTime() : Infinity;
    const tb = b.slot.starts_at ? new Date(b.slot.starts_at).getTime() : Infinity;
    return ta - tb;
  };

  sections.requires_action.sort(sortFn);
  sections.unclear.sort(sortFn);
  sections.ready.sort(sortFn);

  return sections;
}

export function getUniqueSceneLabels(slots: ExtendedEventProgramSlot[]): string[] {
  const set = new Set<string>();
  for (const s of slots) {
    if (s.stage_label) set.add(s.stage_label);
  }
  return [...set].sort();
}
