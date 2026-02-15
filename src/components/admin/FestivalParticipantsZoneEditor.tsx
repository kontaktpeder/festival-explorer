import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { PersonaSearchList } from "@/components/persona/PersonaSearchList";
import type { Persona } from "@/types/database";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";

type FestivalZone = "backstage" | "host" | "crew" | "other";

interface FestivalParticipantPermissions {
  can_edit_festival: boolean;
  can_edit_events: boolean;
  can_access_media: boolean;
  can_scan_tickets: boolean;
  can_see_ticket_stats: boolean;
  can_create_internal_ticket: boolean;
  can_see_report: boolean;
  can_see_revenue: boolean;
}

interface FestivalParticipantRow {
  id: string;
  festival_id: string;
  zone: FestivalZone;
  participant_kind: "persona";
  participant_id: string;
  role_label: string | null;
  sort_order: number;
  can_edit_festival?: boolean;
  can_edit_events?: boolean;
  can_access_media?: boolean;
  can_scan_tickets?: boolean;
  can_see_ticket_stats?: boolean;
  can_create_internal_ticket?: boolean;
  can_see_report?: boolean;
  can_see_revenue?: boolean;
}

interface ResolvedRef {
  id: string;
  name: string;
  slug?: string | null;
  type?: string | null;
  category_tags?: string[] | null;
}

interface Props {
  festivalId: string;
  zone: FestivalZone;
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

export function FestivalParticipantsZoneEditor({
  festivalId,
  zone,
  title,
}: Props) {
  const [rows, setRows] = useState<FestivalParticipantRow[]>([]);
  const [resolved, setResolved] = useState<Record<string, ResolvedRef>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [personaResults, setPersonaResults] = useState<Persona[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("festival_participants")
      .select("id, festival_id, zone, participant_kind, participant_id, role_label, sort_order, can_edit_festival, can_edit_events, can_access_media, can_scan_tickets, can_see_ticket_stats, can_create_internal_ticket, can_see_report, can_see_revenue")
      .eq("festival_id", festivalId)
      .eq("zone", zone)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Kunne ikke laste deltakere");
      setLoading(false);
      return;
    }

    const list = ((data || []) as any[]).filter(
      (r) => r.participant_kind === "persona"
    ) as FestivalParticipantRow[];
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
  }, [festivalId, zone]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setPersonaResults([]);
      return;
    }
    setSearchLoading(true);
    const { data, error } = await supabase
      .from("personas")
      .select("id,user_id,name,slug,bio,avatar_url,category_tags,is_public,created_at,updated_at")
      .ilike("name", `%${searchQuery}%`)
      .limit(20);

    if (error) toast.error("Søk feilet");
    else setPersonaResults((data || []) as Persona[]);
    setSearchLoading(false);
  };

  const handleAdd = async (persona: { id: string; name: string; slug?: string | null }) => {
    if (rows.find((r) => r.participant_id === persona.id)) {
      toast.error("Allerede lagt til");
      return;
    }

    const nextSort = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.sort_order || 0)) + 1;

    const { error } = await supabase.from("festival_participants").insert({
      festival_id: festivalId,
      zone,
      participant_kind: "persona",
      participant_id: persona.id,
      role_label: null,
      sort_order: nextSort,
      can_edit_festival: false,
      can_edit_events: false,
      can_access_media: false,
      can_scan_tickets: false,
      can_see_ticket_stats: false,
      can_create_internal_ticket: false,
      can_see_report: false,
      can_see_revenue: false,
    });

    if (error) {
      toast.error("Kunne ikke legge til");
      return;
    }
    toast.success("Lagt til");
    setPersonaResults([]);
    setSearchQuery("");
    void loadRows();
  };

  const saveRoleLabel = useCallback(async (id: string, role: string) => {
    const { error } = await supabase
      .from("festival_participants")
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
      festival_id: r.festival_id,
      participant_id: r.participant_id,
      participant_kind: "persona" as const,
      zone: r.zone as string,
      sort_order: i + 1,
    }));
    const { error } = await supabase.from("festival_participants").upsert(updates, { onConflict: "id" });
    if (error) {
      toast.error("Kunne ikke endre rekkefølge");
      return;
    }
    setRows(newList.map((r, i) => ({ ...r, sort_order: i + 1 })));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("festival_participants").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke fjerne");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const savePermissions = useCallback(async (id: string, perms: FestivalParticipantPermissions) => {
    const { error } = await supabase
      .from("festival_participants")
      .update(perms)
      .eq("id", id);
    if (error) toast.error("Kunne ikke oppdatere tillatelser");
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...perms } : r)));
    }
  }, []);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Søk etter person..."
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

        {personaResults.length > 0 && (
          <div className="border border-border rounded-md max-h-64 overflow-y-auto">
            <PersonaSearchList
              personas={personaResults}
              onSelect={(id) => {
                const persona = personaResults.find((p) => p.id === id);
                if (persona) handleAdd({ id: persona.id, name: persona.name, slug: persona.slug });
              }}
              placeholder="Filtrer resultater..."
              emptyMessage="Ingen personer funnet"
            />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => {
              const isExpanded = expandedRows.has(row.id);
              return (
              <div
                key={row.id}
                className="bg-muted/30 border border-border rounded-lg overflow-hidden"
              >
                <div className="p-3 flex items-center gap-3">
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
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRowExpanded(row.id)}>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
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

                {/* Permissions panel */}
                {isAdmin && isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tillatelser</p>
                    <div className="grid grid-cols-2 gap-2">
                       {([
                        { key: "can_edit_festival", label: "Redigere festival" },
                        { key: "can_edit_events", label: "Redigere events" },
                        { key: "can_access_media", label: "Filbank" },
                        { key: "can_scan_tickets", label: "Skanne billetter" },
                        { key: "can_see_ticket_stats", label: "Se billettstatistikk" },
                        { key: "can_create_internal_ticket", label: "Internbillett" },
                        { key: "can_see_report", label: "Rapport" },
                        { key: "can_see_revenue", label: "Se inntekt" },
                      ] as const).map(({ key, label }) => (
                        <Label key={key} className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                          <Checkbox
                            checked={!!row[key]}
                            onCheckedChange={(v) =>
                              savePermissions(row.id, {
                                can_edit_festival: !!row.can_edit_festival,
                                can_edit_events: !!row.can_edit_events,
                                can_access_media: !!row.can_access_media,
                                can_scan_tickets: !!row.can_scan_tickets,
                                can_see_ticket_stats: !!row.can_see_ticket_stats,
                                can_create_internal_ticket: !!row.can_create_internal_ticket,
                                can_see_report: !!row.can_see_report,
                                can_see_revenue: !!row.can_see_revenue,
                                [key]: !!v,
                              })
                            }
                          />
                          {label}
                        </Label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            {rows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                Ingen deltakere lagt til ennå.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
