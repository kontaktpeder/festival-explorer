import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowUp, ArrowDown, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { PersonaSearchPicker } from "@/components/persona/PersonaSearchPicker";
import { usePersonaSearch, type PersonaOption } from "@/hooks/usePersonaSearch";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";

type Zone = "on_stage" | "backstage" | "host";

interface EventParticipantRow {
  id: string;
  event_id: string;
  zone: Zone;
  participant_kind: "persona";
  participant_id: string;
  role_label: string | null;
  sort_order: number;
}

interface ResolvedRef {
  id: string;
  name: string;
  slug?: string | null;
  type?: string | null;
  category_tags?: string[] | null;
  avatar_url?: string | null;
}

interface Props {
  eventId: string;
  zone: Zone;
  title?: string;
}

function DebouncedRoleInput({
  initialValue,
  placeholder,
  fallbackRole,
  onSave,
}: {
  initialValue: string;
  placeholder: string;
  fallbackRole?: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(v), 600);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-7 text-base border-transparent bg-transparent hover:bg-muted/30 focus:bg-muted/30 px-1.5 shadow-none transition-colors"
      />
      {!value && fallbackRole && (
        <p className="text-[10px] text-muted-foreground/50 px-1.5 mt-0.5">
          Vises som: <span className="font-medium capitalize">{fallbackRole}</span>
        </p>
      )}
    </div>
  );
}

export function EventParticipantsZoneEditor({
  eventId,
  zone,
  title,
}: Props) {
  const [rows, setRows] = useState<EventParticipantRow[]>([]);
  const [resolved, setResolved] = useState<Record<string, ResolvedRef>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_participants")
      .select("*")
      .eq("event_id", eventId)
      .eq("zone", zone)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Kunne ikke laste deltakere");
      setLoading(false);
      return;
    }

    const list = ((data || []) as any[]).filter(
      (r) => r.participant_kind === "persona"
    ) as EventParticipantRow[];
    setRows(list);

    const personaIds = list.map((r) => r.participant_id);
    const map: Record<string, ResolvedRef> = {};
    if (personaIds.length > 0) {
      const { data: pData } = await supabase
        .from("personas")
        .select("id,name,slug,type,category_tags,avatar_url")
        .in("id", personaIds);
      (pData || []).forEach((p: any) => (map[p.id] = p));
    }
    setResolved(map);
    setLoading(false);
  }, [eventId, zone]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const { data: personaResults = [], isLoading: searchLoading } = usePersonaSearch({
    query: searchQuery,
    mode: "all",
    enabled: searchTriggered && !!searchQuery.trim(),
  });

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleAdd = async (persona: PersonaOption) => {
    if (rows.find((r) => r.participant_id === persona.id)) {
      toast.error("Allerede lagt til");
      return;
    }

    const nextSort = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.sort_order || 0)) + 1;

    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      zone,
      participant_kind: "persona",
      participant_id: persona.id,
      role_label: null,
      sort_order: nextSort,
    });

    if (error) {
      toast.error("Kunne ikke legge til");
      return;
    }
    toast.success("Lagt til");
    setSearchQuery("");
    setSearchTriggered(false);
    void loadRows();
  };

  const saveRoleLabel = useCallback(async (id: string, role: string) => {
    const { error } = await supabase
      .from("event_participants")
      .update({ role_label: role || null })
      .eq("id", id);
    if (error) toast.error("Kunne ikke oppdatere rolle");
  }, []);

  const reorder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rows.length) return;

    const newList = [...rows];
    const [moved] = newList.splice(index, 1);
    newList.splice(newIndex, 0, moved);

    const updates = newList.map((r, i) => ({
      id: r.id,
      event_id: r.event_id,
      participant_id: r.participant_id,
      participant_kind: "persona" as const,
      zone: r.zone as string,
      sort_order: i + 1,
    }));
    const { error } = await supabase.from("event_participants").upsert(updates, { onConflict: "id" });
    if (error) {
      toast.error("Kunne ikke endre rekkefølge");
      return;
    }
    setRows(newList.map((r, i) => ({ ...r, sort_order: i + 1 })));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("event_participants").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke fjerne");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <PersonaSearchPicker
        personas={personaResults}
        isLoading={searchLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={(v) => {
          setSearchQuery(v);
          if (!v.trim()) setSearchTriggered(false);
        }}
        onSelect={handleAdd}
        showSearchButton
        onSearchSubmit={handleSearch}
        placeholder="Legg til person..."
        emptyMessage="Ingen personer funnet"
        disabledIds={new Set(rows.map((r) => r.participant_id))}
      />

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground/40">
            Ingen lagt til ennå
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/10">
          {rows.map((row, index) => {
            const persona = resolved[row.participant_id];
            const initials = (persona?.name || "?").charAt(0).toUpperCase();
            const fallbackRole = getPersonaTypeLabel(persona?.type) ?? persona?.category_tags?.[0];

            return (
              <div
                key={row.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-muted/50 border border-border/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {persona?.avatar_url ? (
                    <img src={persona.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {persona?.name || "Ukjent"}
                  </p>
                  <DebouncedRoleInput
                    initialValue={row.role_label || ""}
                    placeholder={fallbackRole ? `${fallbackRole}` : "Rolle"}
                    fallbackRole={fallbackRole}
                    onSave={(v) => saveRoleLabel(row.id, v)}
                  />
                </div>

                {/* Reorder + delete */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorder(index, "up")} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorder(index, "down")} disabled={index === rows.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(row.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
