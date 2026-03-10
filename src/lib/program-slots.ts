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
  type LucideIcon,
} from "lucide-react";
import type { SlotKind } from "@/types/database";

export const SLOT_KIND_OPTIONS: {
  value: SlotKind;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "concert", label: "Konsert", icon: Music },
  { value: "boiler", label: "Boiler Room", icon: Radio },
  { value: "soundcheck", label: "Lydprøve", icon: Headphones },
  { value: "rigging", label: "Opprigg", icon: Wrench },
  { value: "break", label: "Pause", icon: Coffee },
  { value: "giggen_info", label: "Hva er GIGGEN", icon: Info },
  { value: "doors", label: "Dører", icon: DoorOpen },
  { value: "closing", label: "Stenging", icon: DoorClosed },
  { value: "stage_talk", label: "Snakk fra scenen", icon: Mic },
];

export const INTERNAL_STATUS_OPTIONS: {
  value: "contract_pending" | "confirmed" | "canceled";
  label: string;
}[] = [
  { value: "contract_pending", label: "Kontrakt venter" },
  { value: "confirmed", label: "Bekreftet" },
  { value: "canceled", label: "Avlyst" },
];

export function getSlotKindConfig(kind: SlotKind) {
  return SLOT_KIND_OPTIONS.find((o) => o.value === kind) ?? SLOT_KIND_OPTIONS[0];
}

/** Which fields to show in the edit dialog per slot kind */
export type SlotFieldKey =
  | "event"
  | "time"
  | "duration"
  | "sequence"
  | "title"
  | "scene"
  | "performer"
  | "note"
  | "category"
  | "visibilityStatus"
  | "toggles";

export const SLOT_KIND_FIELDS: Record<SlotKind, SlotFieldKey[]> = {
  concert: ["event", "time", "duration", "sequence", "title", "scene", "performer", "note", "category", "visibilityStatus", "toggles"],
  boiler: ["event", "time", "duration", "sequence", "title", "scene", "performer", "note", "category", "visibilityStatus", "toggles"],
  soundcheck: ["event", "time", "duration", "sequence", "title", "scene", "performer", "note", "category"],
  rigging: ["event", "time", "duration", "sequence", "title", "scene", "performer", "note", "category"],
  break: ["time", "duration", "sequence", "title", "scene", "performer", "note"],
  doors: ["time", "sequence", "title", "scene", "performer", "note", "visibilityStatus", "toggles"],
  closing: ["time", "sequence", "title", "scene", "performer", "note", "visibilityStatus", "toggles"],
  stage_talk: ["event", "time", "duration", "sequence", "title", "scene", "performer", "note", "category", "visibilityStatus", "toggles"],
  giggen_info: ["time", "duration", "sequence", "title", "scene", "performer", "note", "visibilityStatus", "toggles"],
};

export function getFieldsForSlotKind(kind: SlotKind): Set<SlotFieldKey> {
  const list = SLOT_KIND_FIELDS[kind] ?? SLOT_KIND_FIELDS.concert;
  return new Set(list);
}
