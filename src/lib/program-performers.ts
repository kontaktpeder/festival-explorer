import type { ExtendedEventProgramSlot, PerformerKind } from "@/types/program-slots";
import { getEntityPublicHref, getPersonaPublicHref } from "@/lib/public-routes";

export type { PerformerKind };

export interface PerformerDisplay {
  name: string;
  href: string | null;
  isPublic: boolean;
  kind: PerformerKind;
}

/**
 * Felles sannhet for hvordan "På scenen" skal vises,
 * både i kjøreplan og offentlig program.
 */
export function getPerformerDisplay(slot: ExtendedEventProgramSlot): PerformerDisplay {
  // 1) Fri tekst
  if (slot.performer_kind === "text") {
    const name =
      slot.performer_name_override?.trim() ||
      slot.title_override?.trim() ||
      "TBA";
    return { name, href: null, isPublic: false, kind: "text" };
  }

  // 2) Persona
  if (slot.performer_kind === "persona") {
    const p = slot.performer_persona;
    if (!p) {
      return {
        name: slot.performer_name_override || "Ukjent medvirkende",
        href: null,
        isPublic: false,
        kind: "persona",
      };
    }
    const isPublic = p.is_public === true;
    const href = isPublic ? getPersonaPublicHref(p.slug) : null;
    return { name: p.name, href, isPublic, kind: "persona" };
  }

  // 3) Entity / prosjekt
  const e = slot.performer_entity || slot.entity;
  if (!e) {
    return {
      name:
        slot.performer_name_override ||
        slot.title_override ||
        "Ukjent prosjekt",
      href: null,
      isPublic: false,
      kind: "entity",
    };
  }
  const isPublic = (e as any).is_published === true;
  const href = isPublic ? getEntityPublicHref(e.slug) : null;
  return { name: e.name, href, isPublic, kind: "entity" };
}
