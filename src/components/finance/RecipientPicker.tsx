import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRecipientSearch, type RecipientOption } from "@/hooks/useRecipientSearch";

interface Props {
  festivalId: string;
  value: string | null;
  onChange: (value: string) => void;
}

export function RecipientPicker({ festivalId, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { data: results = [], isLoading } = useRecipientSearch(
    festivalId,
    query,
    includeAll
  );

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
          const v = e.target.value;
          setQuery(v);
          setOpen(!!v.trim());
        }}
        onFocus={(e) => {
          if (e.target.value.trim()) {
            setQuery(e.target.value);
            setOpen(true);
          }
        }}
        onBlur={handleBlur}
      />

      {open && query.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-56 overflow-y-auto">
          {/* Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Switch
              id="include-all"
              checked={includeAll}
              onCheckedChange={(checked) => {
                setIncludeAll(checked);
                if (query.trim()) setOpen(true);
              }}
              className="scale-75"
            />
            <Label htmlFor="include-all" className="text-[10px] text-muted-foreground cursor-pointer">
              Inkluder alt i appen
            </Label>
          </div>

          {isLoading && (
            <div className="px-3 py-3 text-xs text-muted-foreground">Søker…</div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              Ingen treff. Tab ut for fritekst.
            </div>
          )}
          {results.map((r) => (
            <button
              key={`${r.kind}:${r.id}`}
              type="button"
              className="flex items-center justify-between w-full px-3 py-1.5 text-xs hover:bg-accent/50 text-left transition-colors"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
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
