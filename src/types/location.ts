// Location type for personas and entities
// Used to structure how location is displayed

export type LocationType = "city" | "region" | "country" | "address";

export interface LocationTypeOption {
  value: LocationType;
  label: string;
}

export const LOCATION_TYPE_OPTIONS: LocationTypeOption[] = [
  { value: "city", label: "By" },
  { value: "region", label: "Region" },
  { value: "country", label: "Land" },
  { value: "address", label: "Adresse" },
];

// Helper to format location for display
export function formatLocationDisplay(
  locationName: string | null | undefined,
  locationType: LocationType | null | undefined
): string | null {
  if (!locationName) return null;
  
  switch (locationType) {
    case "city":
      return `Basert i ${locationName}`;
    case "region":
      return `Aktiv i ${locationName}`;
    case "country":
      return `Aktiv i ${locationName}`;
    case "address":
      return `Basert ved ${locationName}`;
    default:
      return `Basert i ${locationName}`;
  }
}

// Helper for entity/venue address display
export function formatEntityLocationDisplay(
  locationName: string | null | undefined,
  locationType: LocationType | null | undefined
): string | null {
  if (!locationName) return null;
  
  // For venues/projects, address type shows as-is, others show "Basert i"
  if (locationType === "address") {
    return locationName;
  }
  
  return `Basert i ${locationName}`;
}
