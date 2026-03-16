import { useMemo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRecipientSearch, type RecipientOption } from "@/hooks/useRecipientSearch";

interface Props {
  festivalId: string;
  value: string | null;
  onChange: (value: string) => void;
}

/**
 * Searchable recipient picker that shows acts (from program) and venues.
 * Supports free-text fallback.
 */
export function RecipientPicker({ festivalId, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { data: allRecipients = [] } = useRecipientSearch(festivalId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRecipients;
    return allRecipients.filter((r) =>
      r.name.toLowerCase().includes(q)
    );
  }, [allRecipients, query]);

  const handleSelect = (opt: RecipientOption) => {
    onChange(opt.name);
    setOpen(false);
    setQuery("");
  };

  const handleBlur = (ev: React.FocusEvent<HTMLInputElement>) => {
    const v = ev.target.value.trim();
    if (v && v !== (value || "").trim()) {
      onChange(v);
    }
    blurTimeout.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div className="relative">
      <Input
        className="w-full h-8 text-xs"
        placeholder="Søk mottaker…"
        defaultValue={value || ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (allRecipients.length > 0) setOpen(true);
        }}
        onBlur={handleBlur}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-56 overflow-y-auto">
          {filtered.map((r) => (
            <button
              key={`${r.kind}:${r.id}`}
              type="button"
              className="flex items-center justify-between w-full px-3 py-1.5 text-xs hover:bg-accent/50 text-left transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(r);
              }}
            >
              <span className="truncate">{r.name}</span>
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4 shrink-0">
                {r.subtitle}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
