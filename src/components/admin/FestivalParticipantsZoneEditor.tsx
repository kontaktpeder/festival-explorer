import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronUp, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { PersonaSearchPicker } from "@/components/persona/PersonaSearchPicker";
import { usePersonaSearch, type PersonaOption } from "@/hooks/usePersonaSearch";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import type { LiveRolePreset } from "@/types/live-role";

type FestivalZone = "backstage" | "host" | "crew" | "on_stage" | "other";

interface FestivalParticipantPermissions {
  can_edit_festival: boolean;
  can_edit_events: boolean;
  can_access_media: boolean;
  can_scan_tickets: boolean;
  can_see_ticket_stats: boolean;
  can_create_internal_ticket: boolean;
  can_see_report: boolean;
  can_see_revenue: boolean;
  can_edit_festival_media: boolean;
  can_view_runsheet: boolean;
  can_operate_runsheet: boolean;
}

type FinanceAccessLevel = "none" | "reader" | "editor" | "admin";

interface FestivalParticipantRow {
  id: string;
  festival_id: string;
  zone: FestivalZone;
  participant_kind: "persona" | "entity" | "project" | "venue";
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
  can_edit_festival_media?: boolean;
  can_view_runsheet?: boolean;
  can_operate_runsheet?: boolean;
  live_role?: LiveRolePreset;
  finance_access?: FinanceAccessLevel;
  domain_responsibilities?: string[];
}

const DOMAIN_RESPONSIBILITY_OPTIONS = [
  { value: "lineup", label: "Lineup (issue-eier)" },
  { value: "technical", label: "Teknisk / rider" },
  { value: "contracts", label: "Kontrakter" },
  { value: "promo", label: "Promo" },
  { value: "finance", label: "Økonomi" },
  { value: "tickets", label: "Billetter" },
] as const;

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
  const [searchTriggered, setSearchTriggered] = useState(false);
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
      .select("id, festival_id, zone, participant_kind, participant_id, role_label, sort_order, can_edit_festival, can_edit_events, can_access_media, can_scan_tickets, can_see_ticket_stats, can_create_internal_ticket, can_see_report, can_see_revenue, can_edit_festival_media, can_view_runsheet, can_operate_runsheet, live_role, finance_access, domain_responsibilities")
      .eq("festival_id", festivalId)
      .eq("zone", zone)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Kunne ikke laste deltakere");
      setLoading(false);
      return;
    }

    const list = (data || []) as FestivalParticipantRow[];
    setRows(list);

    const personaIds = list.filter((r) => r.participant_kind === "persona").map((r) => r.participant_id);
    const entityIds = list.filter((r) => r.participant_kind === "entity").map((r) => r.participant_id);
    const projectIds = list.filter((r) => r.participant_kind === "project").map((r) => r.participant_id);
    const venueIds = list.filter((r) => r.participant_kind === "venue").map((r) => r.participant_id);
    const map: Record<string, ResolvedRef> = {};

    const fetches: (() => Promise<void>)[] = [];

    if (personaIds.length > 0) {
      fetches.push(async () => {
        const { data: pData } = await supabase.from("personas").select("id,name,slug,type,category_tags").in("id", personaIds);
        (pData || []).forEach((p: any) => (map[p.id] = p));
      });
    }
    if (entityIds.length > 0) {
      fetches.push(async () => {
        const { data: eData } = await supabase.from("entities").select("id,name,slug,type").in("id", entityIds);
        (eData || []).forEach((e: any) => (map[e.id] = { id: e.id, name: e.name, slug: e.slug, type: e.type }));
      });
    }
    if (projectIds.length > 0) {
      fetches.push(async () => {
        const { data: prData } = await supabase.from("projects").select("id,name,slug").in("id", projectIds);
        (prData || []).forEach((p: any) => (map[p.id] = { id: p.id, name: p.name, slug: p.slug }));
      });
    }
    if (venueIds.length > 0) {
      fetches.push(async () => {
        const { data: vData } = await supabase.from("venues").select("id,name,slug").in("id", venueIds);
        (vData || []).forEach((v: any) => (map[v.id] = { id: v.id, name: v.name, slug: v.slug }));
      });
    }

    await Promise.all(fetches.map((fn) => fn()));
    setResolved(map);
    setLoading(false);
  }, [festivalId, zone]);

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
      can_edit_festival_media: false,
      can_view_runsheet: zone === "on_stage" ? true : false,
      can_operate_runsheet: false,
      live_role: "viewer" as any,
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
      participant_kind: r.participant_kind,
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

  const saveDomainResponsibilities = useCallback(async (id: string, tags: string[]) => {
    const { error } = await supabase
      .from("festival_participants")
      .update({ domain_responsibilities: tags } as any)
      .eq("id", id);
    if (error) toast.error("Kunne ikke oppdatere ansvar");
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, domain_responsibilities: tags } : r)));
  }, []);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAllProjectsAndVenues = async () => {
    setLoading(true);
    try {
      const { data: fes, error: feError } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId);
      if (feError) throw feError;
      const eventIds = (fes || []).map((fe: any) => fe.event_id).filter(Boolean) as string[];
      if (eventIds.length === 0) {
        toast.info("Ingen events koblet til festivalen ennå.");
        setLoading(false);
        return;
      }

      const [{ data: eventProjects, error: epError }, { data: eventsWithVenue, error: evError }] = await Promise.all([
        supabase.from("event_projects").select("project_id").in("event_id", eventIds),
        supabase.from("events").select("id, venue_id").in("id", eventIds),
      ]);
      if (epError) throw epError;
      if (evError) throw evError;

      const projectIds = Array.from(new Set((eventProjects || []).map((ep: any) => ep.project_id).filter(Boolean))) as string[];
      const venueIds = Array.from(new Set((eventsWithVenue || []).map((e: any) => e.venue_id).filter(Boolean))) as string[];

      const existingKeys = new Set(rows.map((r) => `${r.participant_kind}:${r.participant_id}`));
      const nextSortStart = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.sort_order || 0)) + 1;
      const newRows: any[] = [];
      let sort = nextSortStart;

      const defaultPerms = {
        can_edit_festival: false, can_edit_events: false, can_access_media: false,
        can_scan_tickets: false, can_see_ticket_stats: false, can_create_internal_ticket: false,
        can_see_report: false, can_see_revenue: false, can_edit_festival_media: false,
        can_view_runsheet: false, can_operate_runsheet: false,
      };

      projectIds.forEach((pid) => {
        if (!existingKeys.has(`project:${pid}`)) {
          newRows.push({ festival_id: festivalId, zone, participant_kind: "project", participant_id: pid, role_label: null, sort_order: sort++, ...defaultPerms });
        }
      });
      venueIds.forEach((vid) => {
        if (!existingKeys.has(`venue:${vid}`)) {
          newRows.push({ festival_id: festivalId, zone, participant_kind: "venue", participant_id: vid, role_label: null, sort_order: sort++, ...defaultPerms });
        }
      });

      if (newRows.length === 0) {
        toast.info("Alle prosjekter og venues er allerede lagt til.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("festival_participants").insert(newRows);
      if (insertError) throw insertError;
      toast.success(`La til ${newRows.length} prosjekter/venues.`);
      await loadRows();
    } catch (e: any) {
      console.error(e);
      toast.error("Kunne ikke legge til prosjekter/venues");
    } finally {
      setLoading(false);
    }
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "project": return "Prosjekt";
      case "venue": return "Venue";
      case "entity": return "Entitet";
      default: return null;
    }
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

        {/* Bulk add projects & venues */}
        <div className="flex items-center justify-between gap-2 bg-muted/30 border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Legg til prosjekter og venues fra festivalens program.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={addAllProjectsAndVenues}
            disabled={loading}
            className="gap-1.5 shrink-0"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Legg til
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => {
              const isExpanded = expandedRows.has(row.id);
              const isPersona = row.participant_kind === "persona";
              const ref = resolved[row.participant_id];
              const kLabel = kindLabel(row.participant_kind);
              return (
              <div
                key={row.id}
                className="bg-muted/30 border border-border rounded-lg overflow-hidden"
              >
                <div className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {ref?.name || "Ukjent"}
                      </span>
                      {kLabel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {kLabel}
                        </span>
                      )}
                    </div>
                    {isPersona ? (
                    <DebouncedRoleInput
                      initialValue={row.role_label || ""}
                      placeholder={
                        (getPersonaTypeLabel(ref?.type) ?? ref?.category_tags?.[0])
                          ? `Rolle (standard: ${getPersonaTypeLabel(ref?.type) ?? ref?.category_tags?.[0]})`
                          : "Rolle (valgfritt)"
                      }
                      fallbackRole={getPersonaTypeLabel(ref?.type) ?? ref?.category_tags?.[0]}
                      onSave={(v) => saveRoleLabel(row.id, v)}
                    />
                    ) : (
                    <DebouncedRoleInput
                      initialValue={row.role_label || ""}
                      placeholder="Rolle (valgfritt)"
                      onSave={(v) => saveRoleLabel(row.id, v)}
                    />
                    )}
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
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tillatelser</p>
                    <div className="grid grid-cols-2 gap-2">
                       {([
                        { key: "can_edit_festival", label: "Redigere festival" },
                        { key: "can_edit_events", label: "Redigere events" },
                        { key: "can_access_media", label: "Filbank (tilgang)" },
                        { key: "can_edit_festival_media", label: "Filbank – kan redigere" },
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
                                can_edit_festival_media: !!row.can_edit_festival_media,
                                can_view_runsheet: !!row.can_view_runsheet,
                                can_operate_runsheet: !!row.can_operate_runsheet,
                                [key]: !!v,
                              })
                            }
                          />
                          {label}
                        </Label>
                      ))}
                    </div>

                    {/* Live role */}
                    <div className="pt-2 border-t border-border/30">
                      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Live-rolle</Label>
                      <Select
                        value={(row.live_role as string) || "viewer"}
                        onValueChange={async (val) => {
                          const { error } = await supabase
                            .from("festival_participants")
                            .update({ live_role: val } as any)
                            .eq("id", row.id);
                          if (error) { toast.error("Kunne ikke oppdatere live-rolle"); return; }
                          setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, live_role: val as LiveRolePreset } : r));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Leser</SelectItem>
                          <SelectItem value="crew">Crew</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Finance access */}
                    <div className="pt-2 border-t border-border/30">
                      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Økonomi-tilgang</Label>
                      <Select
                        value={row.finance_access || "none"}
                        onValueChange={async (val) => {
                          const { error } = await supabase
                            .from("festival_participants")
                            .update({ finance_access: val } as any)
                            .eq("id", row.id);
                          if (error) { toast.error("Kunne ikke oppdatere økonomi-tilgang"); return; }
                          setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, finance_access: val as FinanceAccessLevel } : r));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ingen</SelectItem>
                          <SelectItem value="reader">Leser</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Domain responsibilities */}
                    {isPersona && (zone === "host" || zone === "backstage") && (
                      <div className="pt-2 border-t border-border/30">
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Operativt ansvar (issues)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {DOMAIN_RESPONSIBILITY_OPTIONS.map((opt) => {
                            const tags = row.domain_responsibilities ?? [];
                            const on = tags.includes(opt.value);
                            return (
                              <Label key={opt.value} className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                                <Checkbox
                                  checked={on}
                                  onCheckedChange={(v) => {
                                    const next = v
                                      ? [...tags, opt.value]
                                      : tags.filter((t) => t !== opt.value);
                                    void saveDomainResponsibilities(row.id, next);
                                  }}
                                />
                                {opt.label}
                              </Label>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
