import type { ProductionFilter } from "@/lib/production-board-mappers";

interface Props {
  active: ProductionFilter;
  onChange: (f: ProductionFilter) => void;
  sceneLabels: string[];
}

type Chip = { value: ProductionFilter; label: string };

const baseChips: Chip[] = [
  { value: "all", label: "Alle" },
  { value: "requires_action", label: "Krever handling" },
  { value: "unclear", label: "Uklart" },
  { value: "ready", label: "Klar" },
  { value: "missing_rider", label: "Mangler rider" },
  { value: "missing_contract", label: "Kontrakt" },
  { value: "missing_crew", label: "Mangler crew" },
  { value: "has_issue", label: "Issues" },
  { value: "concert_only", label: "Kun konserter" },
];

export function ProductionFilters({ active, onChange, sceneLabels }: Props) {
  const chips: Chip[] = [
    ...baseChips,
    ...sceneLabels.map((s) => ({
      value: `scene:${s}` as ProductionFilter,
      label: s,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChange(chip.value)}
          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            active === chip.value
              ? "bg-accent text-accent-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
