import {
  Music,
  Radio,
  Coffee,
  Info,
  DoorOpen,
  DoorClosed,
  Mic,
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
