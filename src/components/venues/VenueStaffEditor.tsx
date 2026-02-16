import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

interface VenueStaffRow {
  id: string;
  venue_id: string;
  persona_id: string;
  role: string;
  can_edit_venue: boolean;
  can_manage_staff: boolean;
  can_manage_events: boolean;
  can_scan_tickets: boolean;
  can_access_media: boolean;
  can_view_ticket_stats: boolean;
}

interface PersonaResult {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  category_tags: string[] | null;
}

const PERMISSION_LABELS: Record<string, string> = {
  can_edit_venue: "Redigere scene",
  can_manage_staff: "Administrere team",
  can_manage_events: "Administrere events",
  can_scan_tickets: "Skanne billetter",
  can_access_media: "Tilgang til media",
  can_view_ticket_stats: "Se billettstatistikk",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>;

interface Props {
  venueId: string;
  canEdit: boolean;
}

export function VenueStaffEditor({ venueId, canEdit }: Props) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [personaResults, setPersonaResults] = useState<PersonaResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["venue-staff", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_staff")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as VenueStaffRow[];
    },
    enabled: !!venueId,
  });

  // Fetch persona info for all staff rows
  const personaIds = rows?.map((r) => r.persona_id).filter(Boolean) ?? [];
  const { data: personas } = useQuery({
    queryKey: ["venue-staff-personas", personaIds],
    queryFn: async () => {
      if (personaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("personas")
        .select("id, name, slug, avatar_url, category_tags")
        .in("id", personaIds);
      if (error) throw error;
      return (data || []) as PersonaResult[];
    },
    enabled: personaIds.length > 0,
  });

  const personaMap = new Map(
    (personas || []).map((p) => [p.id, p])
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setPersonaResults([]);
      return;
    }
    setSearchLoading(true);
    const { data, error } = await supabase
      .from("personas")
      .select("id, name, slug, avatar_url, category_tags")
      .ilike("name", `%${searchQuery}%`)
      .limit(20);
    if (error) toast.error("Søk feilet");
    else setPersonaResults((data || []) as PersonaResult[]);
    setSearchLoading(false);
  };

  const addMutation = useMutation({
    mutationFn: async (personaId: string) => {
      const { error } = await supabase.from("venue_staff").insert({
        venue_id: venueId,
        persona_id: personaId,
        role: "staff",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-staff", venueId] });
      queryClient.invalidateQueries({
        queryKey: ["venue-room-permissions", venueId],
      });
      setAddOpen(false);
      setPersonaResults([]);
      setSearchQuery("");
      toast.success("Lagt til");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from("venue_staff")
        .delete()
        .eq("id", staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-staff", venueId] });
      queryClient.invalidateQueries({
        queryKey: ["venue-room-permissions", venueId],
      });
      toast.success("Fjernet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFlagsMutation = useMutation({
    mutationFn: async ({
      staffId,
      flags,
    }: {
      staffId: string;
      flags: Record<string, boolean>;
    }) => {
      const { error } = await supabase
        .from("venue_staff")
        .update(flags)
        .eq("id", staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-staff", venueId] });
      queryClient.invalidateQueries({
        queryKey: ["venue-room-permissions", venueId],
      });
      toast.success("Oppdatert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAdd = (personaId: string) => {
    if (rows?.some((r) => r.persona_id === personaId)) {
      toast.error("Allerede lagt til");
      return;
    }
    addMutation.mutate(personaId);
  };

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Laster team...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team</h3>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Inviter
          </Button>
        )}
      </div>

      {rows && rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => {
            const persona = personaMap.get(row.persona_id);
            return (
              <StaffRowItem
                key={row.id}
                row={row}
                persona={persona}
                canEdit={canEdit}
                onRemove={() => removeMutation.mutate(row.id)}
                onUpdateFlags={(flags) =>
                  updateFlagsMutation.mutate({ staffId: row.id, flags })
                }
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ingen team-medlemmer ennå.
        </p>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til team-medlem</DialogTitle>
            <DialogDescription>
              Søk etter en profil og legg til som staff.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Søk etter navn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button variant="outline" onClick={handleSearch}>
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Søk"
                )}
              </Button>
            </div>

            {personaResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {personaResults.map((p) => {
                  const alreadyAdded = rows?.some(
                    (r) => r.persona_id === p.id
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAdd(p.id)}
                      disabled={addMutation.isPending || alreadyAdded}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left disabled:opacity-50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback>
                          {p.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.name}</span>
                      {alreadyAdded && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          (allerede lagt til)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual staff row with permissions
function StaffRowItem({
  row,
  persona,
  canEdit,
  onRemove,
  onUpdateFlags,
}: {
  row: VenueStaffRow;
  persona?: PersonaResult | null;
  canEdit: boolean;
  onRemove: () => void;
  onUpdateFlags: (flags: Record<string, boolean>) => void;
}) {
  const avatarUrl = useSignedMediaUrl(persona?.avatar_url ?? null, "public");
  const name = persona?.name ?? "Ukjent";

  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {name}
            </p>
            <p className="text-xs text-muted-foreground">{row.role}</p>
          </div>
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {canEdit && (
        <div className="grid grid-cols-2 gap-2">
          {PERMISSION_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <Checkbox
                checked={row[key as keyof VenueStaffRow] as boolean}
                onCheckedChange={(checked) =>
                  onUpdateFlags({ [key]: !!checked })
                }
              />
              <span className="text-muted-foreground">
                {PERMISSION_LABELS[key]}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
