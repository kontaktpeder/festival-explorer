import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Zone = "on_stage" | "backstage" | "host";

interface EventParticipantRow {
  id: string;
  event_id: string;
  zone: Zone;
  participant_kind: "persona" | "entity" | "project";
  participant_id: string;
  role_label: string | null;
  sort_order: number;
}

interface ResolvedRef {
  id: string;
  name: string;
  slug?: string | null;
}

interface Props {
  eventId: string;
  zone: Zone;
  title?: string;
  defaultAddKind?: "persona" | "entity";
}

export function EventParticipantsZoneEditor({
  eventId,
  zone,
  title,
  defaultAddKind = "persona",
}: Props) {
  const [rows, setRows] = useState<EventParticipantRow[]>([]);
  const [resolved, setResolved] = useState<Record<string, ResolvedRef>>({});
  const [loading, setLoading] = useState(false);
  const [searchKind, setSearchKind] = useState<"persona" | "entity">(defaultAddKind);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ResolvedRef[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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
    const entityIds = list.filter((r) => r.participant_kind === "entity" || r.participant_kind === "project").map((r) => r.participant_id);

    const map: Record<string, ResolvedRef> = {};

    const [pRes, eRes] = await Promise.all([
      personaIds.length > 0
        ? supabase.from("personas").select("id,name,slug").in("id", personaIds)
        : Promise.resolve({ data: [] as any[] }),
      entityIds.length > 0
        ? supabase.from("entities").select("id,name,slug").in("id", entityIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    (pRes.data || []).forEach((p: any) => (map[p.id] = p));
    (eRes.data || []).forEach((e: any) => (map[e.id] = e));
    setResolved(map);
    setLoading(false);
  }, [eventId, zone]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const table = searchKind === "persona" ? "personas" : "entities";
    const { data, error } = await supabase
      .from(table)
      .select("id,name,slug")
      .ilike("name", `%${searchQuery}%`)
      .limit(20);

    if (error) toast.error("Søk feilet");
    else setSearchResults((data || []) as ResolvedRef[]);
    setSearchLoading(false);
  };

  const handleAdd = async (item: ResolvedRef) => {
    if (rows.find((r) => r.participant_id === item.id)) {
      toast.error("Allerede lagt til");
      return;
    }

    const nextSort = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.sort_order || 0)) + 1;

    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      zone,
      participant_kind: searchKind,
      participant_id: item.id,
      role_label: null,
      sort_order: nextSort,
    });

    if (error) {
      toast.error("Kunne ikke legge til");
      return;
    }
    toast.success("Lagt til");
    setSearchResults([]);
    setSearchQuery("");
    void loadRows();
  };

  const handleRoleChange = async (id: string, role: string) => {
    const { error } = await supabase
      .from("event_participants")
      .update({ role_label: role || null })
      .eq("id", id);
    if (error) {
      toast.error("Kunne ikke oppdatere rolle");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role_label: role || null } : r)));
  };

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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => setSearchKind("persona")}
            variant={searchKind === "persona" ? "default" : "outline"}
          >
            Legg til person
          </Button>
          <Button
            size="sm"
            onClick={() => setSearchKind("entity")}
            variant={searchKind === "entity" ? "default" : "outline"}
          >
            Legg til prosjekt
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder={searchKind === "persona" ? "Søk etter person..." : "Søk etter prosjekt..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            className="text-base"
          />
          <Button onClick={() => void handleSearch()} disabled={searchLoading}>
            {searchLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Søk
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="border border-border rounded-md divide-y divide-border max-h-48 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 active:bg-muted flex items-center gap-2"
                onClick={() => handleAdd(item)}
              >
                <Badge variant="outline" className="text-[10px]">
                  {searchKind === "persona" ? "Person" : "Prosjekt"}
                </Badge>
                {item.name}
              </button>
            ))}
          </div>
        )}

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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {resolved[row.participant_id]?.name || "Ukjent"}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {row.participant_kind === "persona" ? "Person" : "Prosjekt"}
                    </Badge>
                  </div>
                  <Input
                    placeholder="Rolle (valgfritt)"
                    value={row.role_label || ""}
                    onChange={(e) => handleRoleChange(row.id, e.target.value)}
                    className="mt-1.5 h-7 text-xs"
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
