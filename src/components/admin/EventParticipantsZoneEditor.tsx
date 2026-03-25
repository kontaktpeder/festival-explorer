import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowUp, ArrowDown, Trash2, Music } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonaSearchPicker } from "@/components/persona/PersonaSearchPicker";
import { usePersonaSearch, type PersonaOption } from "@/hooks/usePersonaSearch";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";

type Zone = "on_stage" | "backstage" | "host";

interface EventParticipantRow {
  id: string;
  event_id: string;
  zone: Zone;
  participant_kind: "persona" | "entity";
  participant_id: string;
  role_label: string | null;
  sort_order: number;
  can_view_runsheet: boolean;
  can_operate_runsheet: boolean;
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
  const [selectedEntityId, setSelectedEntityId] = useState("");

  const isOnStage = zone === "on_stage";

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

    const list = (data || []) as EventParticipantRow[];
    setRows(list);

    const personaIds = list.filter((r) => r.participant_kind === "persona").map((r) => r.participant_id);
    const entityIds = list.filter((r) => r.participant_kind === "entity").map((r) => r.participant_id);
    const map: Record<string, ResolvedRef> = {};

    if (personaIds.length > 0) {
      const { data: pData } = await supabase
        .from("personas")
        .select("id,name,slug,type,category_tags,avatar_url")
        .in("id", personaIds);
      (pData || []).forEach((p: any) => (map[p.id] = p));
    }
    if (entityIds.length > 0) {
      const { data: eData } = await supabase
        .from("entities")
        .select("id,name,slug,type")
        .in("id", entityIds);
      (eData || []).forEach((e: any) => (map[e.id] = { id: e.id, name: e.name, slug: e.slug ?? null, type: e.type }));
    }

    setResolved(map);
    setLoading(false);
  }, [eventId, zone]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // Fetch entities (solo/band) for on_stage zone
  const { data: allEntities = [] } = useQuery({
    queryKey: ["event-entities-on-stage", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, type")
        .in("type", ["solo", "band"])
        .eq("is_system", false)
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string; type: string }[];
    },
    enabled: isOnStage,
  });

  const existingEntityIds = new Set(
    rows.filter((r) => r.participant_kind === "entity").map((r) => r.participant_id)
  );
  const availableEntities = allEntities.filter((e) => !existingEntityIds.has(e.id));

  const handleAddEntity = async () => {
    if (!selectedEntityId) return;
    if (existingEntityIds.has(selectedEntityId)) {
      toast.error("Allerede lagt til");
      return;
    }
    const maxOrder = Math.max(0, ...rows.map((r) => r.sort_order || 0));
    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      zone: "on_stage",
      participant_kind: "entity",
      participant_id: selectedEntityId,
      role_label: null,
      sort_order: maxOrder + 1,
      is_public: true,
      can_view_runsheet: true,
    });
    if (error) {
      toast.error("Kunne ikke legge til");
      return;
    }
    // Also link in event_entities for billing/feature
    await supabase.from("event_entities").insert({
      event_id: eventId,
      entity_id: selectedEntityId,
      billing_order: maxOrder + 1,
      is_featured: false,
      feature_order: 0,
    });
    toast.success("Artist lagt til");
    setSelectedEntityId("");
    void loadRows();
  };

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

  const togglePermission = useCallback(async (id: string, field: "can_view_runsheet" | "can_operate_runsheet", value: boolean) => {
    const { error } = await supabase
      .from("event_participants")
      .update({ [field]: value })
      .eq("id", id);
    if (error) {
      toast.error("Kunne ikke oppdatere tillatelse");
      return;
    }
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
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
      participant_kind: r.participant_kind,
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
    <div className="space-y-4">
      {/* Add entity (artist/project) – only for on_stage */}
      {isOnStage && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Legg til artist / prosjekt</p>
          <div className="flex items-center gap-2">
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Velg artist..." />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex items-center gap-2">
                      <Music className="h-3 w-3 text-muted-foreground" />
                      {e.name}
                    </span>
                  </SelectItem>
                ))}
                {availableEntities.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Alle artister er lagt til</div>
                )}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddEntity} disabled={!selectedEntityId}>
              Legg til
            </Button>
          </div>
        </div>
      )}

      {/* Add persona */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Legg til person</p>
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
      </div>

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
            const ref = resolved[row.participant_id];
            const isEntity = row.participant_kind === "entity";
            const initials = (ref?.name || "?").charAt(0).toUpperCase();
            const fallbackRole = !isEntity
              ? (getPersonaTypeLabel(ref?.type) ?? ref?.category_tags?.[0])
              : ref?.type;

            return (
              <div
                key={row.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-muted/50 border border-border/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {!isEntity && ref?.avatar_url ? (
                    <img src={ref.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {ref?.name || "Ukjent"}
                  </p>
                  {!isEntity ? (
                    <DebouncedRoleInput
                      initialValue={row.role_label || ""}
                      placeholder={fallbackRole ? `${fallbackRole}` : "Rolle"}
                      fallbackRole={fallbackRole ?? undefined}
                      onSave={(v) => saveRoleLabel(row.id, v)}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground capitalize px-1.5">
                      {fallbackRole || "Artist"}
                    </p>
                  )}
                  {/* Permission toggles */}
                  <div className="flex items-center gap-3 mt-1 px-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={row.can_view_runsheet}
                        onCheckedChange={(v) => togglePermission(row.id, "can_view_runsheet", !!v)}
                        className="h-3.5 w-3.5"
                      />
                      Se kjøreplan
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={row.can_operate_runsheet}
                        onCheckedChange={(v) => togglePermission(row.id, "can_operate_runsheet", !!v)}
                        className="h-3.5 w-3.5"
                      />
                      Operere live
                    </label>
                  </div>
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
