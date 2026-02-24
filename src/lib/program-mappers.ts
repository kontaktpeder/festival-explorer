// src/lib/program-mappers.ts
import type { ProgramCategory, ProgramItem } from "@/types/program";
import { getSlotKindConfig } from "@/lib/program-slots";
import type { SlotKind } from "@/types/database";

/** Map event_program_slots til én ProgramCategory (slots). */
export function mapEventSlotsToProgramCategory(
  programSlots: Array<{
    id: string;
    starts_at?: string | null;
    ends_at?: string | null;
    slot_kind?: string | null;
    is_visible_public?: boolean;
    is_canceled?: boolean;
    entity_id?: string | null;
    entity?: { id: string; name?: string; slug?: string; type?: string } | null;
  }>,
  getHrefForEntity?: (entity: { type?: string; slug?: string }) => string | undefined
): ProgramCategory {
  const visible = (programSlots ?? []).filter(
    (s) => (s as any).is_visible_public !== false
  );

  const now = new Date();
  const HIGHLIGHT_KINDS: SlotKind[] = ["concert", "boiler", "stage_talk"];

  const activeSlot = visible.find(
    (s) =>
      !s.is_canceled &&
      s.ends_at &&
      HIGHLIGHT_KINDS.includes((s.slot_kind as SlotKind) ?? "concert") &&
      new Date(s.starts_at!) <= now &&
      new Date(s.ends_at) >= now
  );
  const nextSlot = !activeSlot
    ? visible.find(
        (s) =>
          !s.is_canceled &&
          HIGHLIGHT_KINDS.includes((s.slot_kind as SlotKind) ?? "concert") &&
          new Date(s.starts_at!) > now
      )
    : null;
  const highlightSlot = activeSlot ?? nextSlot;
  const highlightLabel = activeSlot ? "Nå" : nextSlot ? "Neste" : undefined;

  const items: ProgramItem[] = visible.map((s) => {
    const slotCfg = getSlotKindConfig((s.slot_kind as SlotKind) ?? "concert");
    const label = s.entity?.name ?? slotCfg?.label ?? "Program";
    const href = s.entity ? getHrefForEntity?.(s.entity) : undefined;

    return {
      id: s.id,
      label,
      href: s.is_canceled ? undefined : href ?? undefined,
      startAt: s.starts_at ?? null,
      endAt: s.ends_at ?? null,
      slotKind: s.slot_kind ?? null,
      meta: {
        ...(s.entity_id ? { entityId: s.entity_id } : {}),
        isCanceled: s.is_canceled === true,
        isHighlighted: highlightSlot?.id === s.id,
        highlightLabel: highlightSlot?.id === s.id ? highlightLabel : undefined,
      },
    };
  });

  return {
    id: "program",
    label: "Program",
    type: "slots",
    items,
  };
}

/** Map festival-data til Lineup + Events kategorier. */
export function mapFestivalToProgramCategories(args: {
  events: Array<{
    id: string;
    title?: string | null;
    slug?: string | null;
    start_at?: string | null;
    venue?: { name?: string | null } | null;
    zone?: string | null;
  }>;
  lineup: Array<{ id: string; name: string; slug: string; event_slug?: string }>;
  team: Array<{
    participant_id?: string;
    persona?: { name?: string; slug?: string } | null;
    entity?: { name?: string; slug?: string } | null;
    role_label?: string | null;
  }>;
}): ProgramCategory[] {
  const { events, lineup, team } = args;

  const lineupCategory: ProgramCategory = {
    id: "lineup",
    label: "Lineup",
    type: "lineup",
    items: (lineup ?? []).map((a) => ({
      id: a.id,
      label: a.name,
      href: a.slug ? `/project/${a.slug}` : undefined,
      subtitle: a.event_slug ? undefined : null,
    })),
  };

  const eventsCategory: ProgramCategory = {
    id: "events",
    label: "Events",
    type: "events",
    items: (events ?? [])
      .filter((e) => e?.slug)
      .sort(
        (a, b) =>
          new Date(a.start_at ?? 0).getTime() -
          new Date(b.start_at ?? 0).getTime()
      )
      .map((e) => ({
        id: e.id,
        label: e.title ?? "Event",
        href: e.slug ? `/event/${e.slug}` : undefined,
        startAt: e.start_at ?? null,
        subtitle: e.venue?.name ?? e.zone ?? null,
        zone: e.zone ?? null,
      })),
  };

  const profilerCategory: ProgramCategory = {
    id: "profiler",
    label: "Team",
    type: "profiler",
    items: (team ?? []).map((t, i) => ({
      id: (t.participant_id as string) ?? `team-${i}`,
      label:
        (t.persona as any)?.name ?? (t.entity as any)?.name ?? "Team",
      href: (t.persona as any)?.slug
        ? `/p/${(t.persona as any).slug}`
        : (t.entity as any)?.slug
          ? `/project/${(t.entity as any).slug}`
          : undefined,
      subtitle: (t.role_label as string) ?? null,
    })),
  };

  return [lineupCategory, eventsCategory, profilerCategory];
}
