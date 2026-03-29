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

// ── Contributor grouping ──

export interface ContributorSignals {
  requiresAction: boolean;
  unclear: boolean;
  ready: boolean;
  badges: string[];
}

export interface ProductionContributor {
  id: string;
  name: string;
  slug?: string;
  kind: "entity" | "persona" | "text";
  slots: ProductionSlot[];
  signals: ContributorSignals;
  stageLabels: string[];
  slotKinds: string[];
}

export function groupByContributors(items: ProductionSlot[]): ProductionContributor[] {
  const map = new Map<string, { name: string; slug?: string; kind: "entity" | "persona" | "text"; slots: ProductionSlot[] }>();

  for (const item of items) {
    const { slot } = item;
    let id: string;
    let name: string;
    let slug: string | undefined;
    let kind: "entity" | "persona" | "text";

    if (slot.performer_entity_id && slot.performer_entity) {
      id = `entity:${slot.performer_entity_id}`;
      name = slot.performer_entity.name;
      slug = slot.performer_entity.slug;
      kind = "entity";
    } else if (slot.performer_persona_id && slot.performer_persona) {
      id = `persona:${slot.performer_persona_id}`;
      name = slot.performer_persona.name;
      slug = slot.performer_persona.slug;
      kind = "persona";
    } else if (slot.performer_name_override) {
      id = `text:${slot.performer_name_override}`;
      name = slot.performer_name_override;
      kind = "text";
    } else {
      // No performer — skip from contributor view
      continue;
    }

    if (!map.has(id)) map.set(id, { name, slug, kind, slots: [] });
    map.get(id)!.slots.push(item);
  }

  const contributors: ProductionContributor[] = [];
  for (const [id, entry] of map) {
    const hasReqAction = entry.slots.some(s => s.signals.requiresAction);
    const hasUnclear = entry.slots.some(s => s.signals.unclear);
    const allReady = !hasReqAction && !hasUnclear;

    const badges: string[] = [];
    const badgeCounts = new Map<string, number>();
    for (const s of entry.slots) {
      for (const b of s.signals.badges) {
        if (b === "Klar") continue;
        badgeCounts.set(b, (badgeCounts.get(b) ?? 0) + 1);
      }
    }
    for (const [b] of badgeCounts) badges.push(b);
    if (allReady) badges.push("Klar");

    const stageLabels = [...new Set(entry.slots.map(s => s.slot.stage_label).filter(Boolean))] as string[];
    const slotKinds = [...new Set(entry.slots.map(s => s.slot.slot_kind))];

    contributors.push({
      id,
      name: entry.name,
      slug: entry.slug,
      kind: entry.kind,
      slots: entry.slots,
      signals: { requiresAction: hasReqAction, unclear: hasUnclear && !hasReqAction, ready: allReady, badges },
      stageLabels,
      slotKinds,
    });
  }

  // Sort: requires_action first, then unclear, then ready. Within same status, alphabetical.
  contributors.sort((a, b) => {
    const pa = a.signals.requiresAction ? 0 : a.signals.unclear ? 1 : 2;
    const pb = b.signals.requiresAction ? 0 : b.signals.unclear ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, "nb");
  });

  return contributors;
}

export function groupContributorsBySections(
  contributors: ProductionContributor[],
): Record<ProductionSectionKey, ProductionContributor[]> {
  const sections: Record<ProductionSectionKey, ProductionContributor[]> = {
    requires_action: [],
    unclear: [],
    ready: [],
  };
  for (const c of contributors) {
    if (c.signals.requiresAction) sections.requires_action.push(c);
    else if (c.signals.unclear) sections.unclear.push(c);
    else sections.ready.push(c);
  }
  return sections;
}

export interface ContributorKpis {
  totalContributors: number;
  withIssues: number;
  ready: number;
}

// ── Performer link helpers (v1: no new slots, only UPDATE existing) ──

// TODO: When DB has e.g. event_program_slots.contributor_role (Artist|Gjest|…),
// show type badge in Production. v1: only name (persona/entity/text).

/** Check if a slot already has a performer linked */
export function slotHasPerformer(slot: ExtendedEventProgramSlot): boolean {
  return !!(
    slot.performer_entity_id ||
    slot.performer_persona_id ||
    (slot.performer_name_override?.trim())
  );
}

/** Candidates for "Add performer": existing non-canceled slots without a performer */
export function slotsEligibleForPerformerLink(
  slots: ExtendedEventProgramSlot[],
): ExtendedEventProgramSlot[] {
  return slots.filter((s) => !slotHasPerformer(s) && !s.is_canceled);
}

/** Contributor-specific bucket counts for the chips bar */
export interface ContributorBucketCounts {
  missingDocs: number;
  pendingContract: number;
  ready: number;
}

export function countContributorBuckets(
  contributors: ProductionContributor[],
): ContributorBucketCounts {
  let missingDocs = 0;
  let pendingContract = 0;
  let ready = 0;

  for (const c of contributors) {
    const anyMissing = c.slots.some(
      (s) => s.signals.missingTechRider || s.signals.missingContract,
    );
    const anyPending = c.slots.some(
      (s) => s.slot.internal_status === "contract_pending" && !s.slot.is_canceled,
    );
    if (anyMissing) missingDocs++;
    else if (anyPending) pendingContract++;
    else ready++;
  }
  return { missingDocs, pendingContract, ready };
}

export interface ContributorDocumentStatus {
  missingTechRider: boolean;
  missingHospRider: boolean;
  missingContract: boolean;
  allComplete: boolean;
}

export function contributorDocumentStatus(c: ProductionContributor): ContributorDocumentStatus {
  const performanceSlots = c.slots.filter(
    (s) =>
      !s.slot.is_canceled &&
      (s.slot.slot_kind === "concert" || s.slot.slot_kind === "soundcheck"),
  );
  if (performanceSlots.length === 0) {
    return { missingTechRider: false, missingHospRider: false, missingContract: false, allComplete: true };
  }
  const missingTechRider = performanceSlots.some(
    (s) => !(s.slot as any).tech_rider_asset_id && !s.slot.tech_rider_media_id,
  );
  const missingHospRider = performanceSlots.some(
    (s) => !(s.slot as any).hosp_rider_asset_id && !s.slot.hosp_rider_media_id,
  );
  const missingContract = performanceSlots.some((s) => !s.slot.contract_media_id);
  return {
    missingTechRider,
    missingHospRider,
    missingContract,
    allComplete: !missingTechRider && !missingHospRider && !missingContract,
  };
}
