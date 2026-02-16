import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
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
    <>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => e.stopPropagation()}
        className="mt-1.5 h-7 text-base"
      />
      {!value && fallbackRole && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Vises som: <span className="font-medium capitalize">{fallbackRole}</span>
        </p>
      )}
    </>
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
        .select("id,name,slug,type,category_tags")
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          placeholder="Søk etter person..."
          emptyMessage="Ingen personer funnet"
          disabledIds={new Set(rows.map((r) => r.participant_id))}
        />

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="bg-muted/30 border border-border rounded-lg p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate">
                    {resolved[row.participant_id]?.name || "Ukjent"}
                  </span>
                  <DebouncedRoleInput
                    initialValue={row.role_label || ""}
                    placeholder={
                      (getPersonaTypeLabel(resolved[row.participant_id]?.type) ?? resolved[row.participant_id]?.category_tags?.[0])
                        ? `Rolle (standard: ${getPersonaTypeLabel(resolved[row.participant_id]?.type) ?? resolved[row.participant_id]?.category_tags?.[0]})`
                        : "Rolle (valgfritt)"
                    }
                    fallbackRole={getPersonaTypeLabel(resolved[row.participant_id]?.type) ?? resolved[row.participant_id]?.category_tags?.[0]}
                    onSave={(v) => saveRoleLabel(row.id, v)}
                  />
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorder(index, "up")} disabled={index === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorder(index, "down")} disabled={index === rows.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(row.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                Ingen deltakere lagt til i denne sonen ennå.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
