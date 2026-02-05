// Available For options for Personas
// These represent what a persona is generally open to

export type AvailableForKey = 
  | "enkelt_oppdrag"
  | "band"
  | "prosjekt"
  | "samarbeid"
  | "session"
  | "arrangement";

export interface AvailableForOption {
  key: AvailableForKey;
  label: string;
}

export const AVAILABLE_FOR_OPTIONS: AvailableForOption[] = [
  { key: "enkelt_oppdrag", label: "Enkelt oppdrag" },
  { key: "band", label: "Band" },
  { key: "prosjekt", label: "Prosjekt" },
  { key: "samarbeid", label: "Samarbeid" },
  { key: "session", label: "Session / studio" },
  { key: "arrangement", label: "Arrangement" },
];

// Helper to get label from key
export function getAvailableForLabel(key: AvailableForKey): string {
  const option = AVAILABLE_FOR_OPTIONS.find(opt => opt.key === key);
  return option?.label || key;
}

// Helper to validate if a value is a valid AvailableForKey
export function isValidAvailableForKey(value: string): value is AvailableForKey {
  return AVAILABLE_FOR_OPTIONS.some(opt => opt.key === value);
}
