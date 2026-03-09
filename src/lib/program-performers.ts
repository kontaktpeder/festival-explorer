import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { getEntityPublicHref, getPersonaPublicHref } from "@/lib/public-routes";

export type PerformerKind = "entity" | "persona" | "text";

export interface PerformerDisplay {
  name: string;
  href: string | null;
  isPublic: boolean;
  kind: PerformerKind;
}

export function getPerformerDisplay(slot: ExtendedEventProgramSlot): PerformerDisplay {
  // 1) Fri tekst
  if ((slot as any).performer_kind === "text") {
    const name =
      (slot as any).performer_name_override?.trim() ||
      slot.title_override?.trim() ||
      "TBA";
    return { name, href: null, isPublic: false, kind: "text" };
  }

  // 2) Persona
  if ((slot as any).performer_kind === "persona") {
    const p = (slot as any).performer_persona;
    if (!p) {
      return {
        name: (slot as any).performer_name_override || "Ukjent medvirkende",
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
  const e = (slot as any).performer_entity || slot.entity;
  if (!e) {
    return {
      name:
        (slot as any).performer_name_override ||
        slot.title_override ||
        "Ukjent prosjekt",
      href: null,
      isPublic: false,
      kind: "entity",
    };
  }
  const isPublic = e.is_published === true;
  const href = isPublic ? getEntityPublicHref(e.slug) : null;
  return { name: e.name, href, isPublic, kind: "entity" };
}
