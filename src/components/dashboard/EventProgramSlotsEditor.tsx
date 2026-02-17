import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SLOT_KIND_OPTIONS,
  INTERNAL_STATUS_OPTIONS,
  getSlotKindConfig,
} from "@/lib/program-slots";
import { Plus, Pencil, Copy, Trash2, Clock, FileText, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isoToLocalDatetimeString } from "@/lib/utils";
import type { SlotKind, InternalSlotStatus } from "@/types/database";

interface EventProgramSlotsEditorProps {
  eventId: string;
  canEdit: boolean;
  eventStartAt?: string;
}

interface SlotForm {
  slot_kind: SlotKind;
  starts_at: string;
  ends_at: string;
  entity_id: string;
  internal_status: InternalSlotStatus;
  internal_note: string;
  is_canceled: boolean;
  is_visible_public: boolean;
}

const EMPTY_FORM: SlotForm = {
  slot_kind: "concert",
  starts_at: "",
  ends_at: "",
  entity_id: "",
  internal_status: "confirmed",
  internal_note: "",
  is_canceled: false,
  is_visible_public: false,
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  contract_pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  canceled: "bg-red-500/15 text-red-400 border-red-500/20",
};

export function EventProgramSlotsEditor({ eventId, canEdit, eventStartAt }: EventProgramSlotsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [form, setForm] = useState<SlotForm>({ ...EMPTY_FORM });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["event-program-slots", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_program_slots" as any)
        .select(`
          *,
          entity:entities(id, name, slug, hero_image_url)
        `)
        .eq("event_id", eventId)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!eventId,
  });

  // Allowed entities: from event_participants + accepted invitations
  const { data: allowedEntities = [] } = useQuery({
    queryKey: ["event-allowed-entities", eventId],
    queryFn: async () => {
      const [participantsRes, invitationsRes] = await Promise.all([
        supabase
          .from("event_participants")
          .select("participant_id")
          .eq("event_id", eventId)
          .in("participant_kind", ["entity", "project"]),
        supabase
          .from("event_invitations" as any)
          .select("entity_id")
          .eq("event_id", eventId)
          .eq("status", "accepted"),
      ]);
      const ids = new Set<string>();
      (participantsRes.data || []).forEach((p: any) => ids.add(p.participant_id));
      (invitationsRes.data || []).forEach((i: any) => ids.add(i.entity_id));
      if (ids.size === 0) return [];

      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug")
        .in("id", Array.from(ids))
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["event-program-slots", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event"] });
  };

  const insertMutation = useMutation({
    mutationFn: async (payload: SlotForm) => {
      const { error } = await supabase
        .from("event_program_slots" as any)
        .insert({
          event_id: eventId,
          slot_kind: payload.slot_kind,
          starts_at: new Date(payload.starts_at).toISOString(),
          ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
          entity_id: payload.entity_id || null,
          internal_status: payload.internal_status,
          internal_note: payload.internal_note || null,
          is_canceled: payload.is_canceled,
          is_visible_public: payload.is_visible_public,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Punkt lagt til" });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<SlotForm> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (payload.slot_kind !== undefined) updates.slot_kind = payload.slot_kind;
      if (payload.starts_at !== undefined) updates.starts_at = new Date(payload.starts_at).toISOString();
      if (payload.ends_at !== undefined) updates.ends_at = payload.ends_at ? new Date(payload.ends_at).toISOString() : null;
      if (payload.entity_id !== undefined) updates.entity_id = payload.entity_id || null;
      if (payload.internal_status !== undefined) updates.internal_status = payload.internal_status;
      if (payload.internal_note !== undefined) updates.internal_note = payload.internal_note || null;
      if (payload.is_canceled !== undefined) updates.is_canceled = payload.is_canceled;
      if (payload.is_visible_public !== undefined) updates.is_visible_public = payload.is_visible_public;

      const { error } = await supabase
        .from("event_program_slots" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Oppdatert" });
      setDialogOpen(false);
      setEditingSlot(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_program_slots" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Slettet" });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const toggleVisibility = (slot: any) => {
    updateMutation.mutate({ id: slot.id, is_visible_public: !slot.is_visible_public });
  };

  const openCreate = () => {
    setEditingSlot(null);
    const defaultStart = eventStartAt ? isoToLocalDatetimeString(eventStartAt) : "";
    let defaultEnd = "";
    if (eventStartAt) {
      const endDate = new Date(eventStartAt);
      endDate.setHours(endDate.getHours() + 1);
      defaultEnd = isoToLocalDatetimeString(endDate.toISOString());
    }
    setForm({ ...EMPTY_FORM, starts_at: defaultStart, ends_at: defaultEnd });
    setDialogOpen(true);
  };

  const openEdit = (slot: any) => {
    setEditingSlot(slot);
    setForm({
      slot_kind: slot.slot_kind,
      starts_at: isoToLocalDatetimeString(slot.starts_at),
      ends_at: isoToLocalDatetimeString(slot.ends_at),
      entity_id: slot.entity_id || "",
      internal_status: slot.internal_status,
      internal_note: slot.internal_note || "",
      is_canceled: slot.is_canceled,
      is_visible_public: slot.is_visible_public ?? false,
    });
    setDialogOpen(true);
  };

  const openDuplicate = (slot: any) => {
    setEditingSlot(null);
    setForm({
      slot_kind: slot.slot_kind,
      starts_at: "",
      ends_at: "",
      entity_id: slot.entity_id || "",
      internal_status: slot.internal_status,
      internal_note: slot.internal_note || "",
      is_canceled: false,
      is_visible_public: false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.starts_at) {
      toast({ title: "Starttid er påkrevd", variant: "destructive" });
      return;
    }
    if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast({ title: "Sluttid må være etter starttid", variant: "destructive" });
      return;
    }
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, ...form });
    } else {
      insertMutation.mutate(form);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Laster program...</p>;

  const visibleCount = slots.filter((s: any) => s.is_visible_public).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground/50" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Program
          </h2>
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {slots.length} punkt{slots.length !== 1 ? "er" : ""}
            {slots.length > 0 && ` · ${visibleCount} synlig${visibleCount !== 1 ? "e" : ""}`}
          </span>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openCreate} className="h-7 text-xs gap-1.5 border-border/30 hover:border-accent/40">
            <Plus className="h-3 w-3" />
            Nytt punkt
          </Button>
        )}
      </div>

      {/* Slot list */}
      {slots.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border/30 rounded-lg">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/50">
            Ingen programpunkter ennå
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="divide-y divide-border/10">
            {slots.map((slot: any) => {
              const config = getSlotKindConfig(slot.slot_kind);
              const Icon = config.icon;
              const entity = slot.entity;
              const statusOption = INTERNAL_STATUS_OPTIONS.find((o) => o.value === slot.internal_status);
              const statusColor = STATUS_COLORS[slot.internal_status] || "";
              const isVisible = slot.is_visible_public;

              return (
                <div
                  key={slot.id}
                  className={`py-3 first:pt-0 last:pb-0 group ${slot.is_canceled ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Time column */}
                    <div className="w-[72px] shrink-0 pt-0.5">
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {new Date(slot.starts_at).toLocaleTimeString("nb-NO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {slot.ends_at && (
                        <span className="text-[10px] font-mono text-muted-foreground/50 block tabular-nums">
                          {new Date(slot.ends_at).toLocaleTimeString("nb-NO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="w-7 h-7 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {entity ? entity.name : config.label}
                        </span>
                        {slot.is_canceled && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
                            Avlyst
                          </Badge>
                        )}
                      </div>

                      {/* Meta row: category + status + visibility */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                          {config.label}
                        </span>
                        {statusOption && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor}`}>
                            {statusOption.label}
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                              isVisible
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted/30 text-muted-foreground/50"
                            }`}>
                              {isVisible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                              {isVisible ? "Synlig" : "Skjult"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {isVisible
                              ? "Synlig for publikum på event- og festivalprogram"
                              : "Kun synlig backstage – ikke publisert ennå"}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Note */}
                      {slot.internal_note && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <FileText className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                            {slot.internal_note}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleVisibility(slot)}
                              title={isVisible ? "Skjul fra publikum" : "Vis for publikum"}
                            >
                              {isVisible ? <Eye className="h-3 w-3 text-emerald-400" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {isVisible ? "Skjul fra publikum" : "Vis for publikum"}
                          </TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDuplicate(slot)} title="Dupliser">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(slot)} title="Rediger">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (window.confirm("Slette dette punktet?")) deleteMutation.mutate(slot.id);
                          }}
                          title="Slett"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Rediger punkt" : "Legg til punkt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type + Status side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.slot_kind} onValueChange={(v) => setForm((f) => ({ ...f, slot_kind: v as SlotKind }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_KIND_OPTIONS.map((o) => {
                      const SlotIcon = o.icon;
                      return (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <SlotIcon className="h-3.5 w-3.5" />
                            {o.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Intern status</Label>
                <Select value={form.internal_status} onValueChange={(v) => setForm((f) => ({ ...f, internal_status: v as InternalSlotStatus }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Starttid *</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="h-9 text-base"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sluttid</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="h-9 text-base"
                />
              </div>
            </div>

            {(form.slot_kind === "concert" || form.slot_kind === "boiler") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Artist / Prosjekt</Label>
                <EntityPicker
                  value={form.entity_id}
                  onChange={(id) => setForm((f) => ({ ...f, entity_id: id }))}
                  placeholder="Velg artist..."
                  allowedEntities={allowedEntities}
                />
                {allowedEntities.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60">
                    Ingen godkjente artister. Inviter prosjekter eller legg dem til som medvirkende først.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Intern notat</Label>
              <Textarea
                value={form.internal_note}
                onChange={(e) => setForm((f) => ({ ...f, internal_note: e.target.value }))}
                placeholder="F.eks. kontrakt venter, møter 18:30…"
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Visibility + Canceled row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_visible_public"
                  checked={form.is_visible_public}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_visible_public: checked }))}
                />
                <Label htmlFor="is_visible_public" className="cursor-pointer text-sm flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Synlig for publikum
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_canceled"
                  checked={form.is_canceled}
                  onChange={(e) => setForm((f) => ({ ...f, is_canceled: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="is_canceled" className="cursor-pointer text-sm">
                  Avlyst
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={insertMutation.isPending || updateMutation.isPending || !form.starts_at}
            >
              {editingSlot ? "Lagre" : "Legg til"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Entity picker scoped to allowed entities (participants + accepted invitations) */
function EntityPicker({
  value,
  onChange,
  placeholder,
  allowedEntities,
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowedEntities: { id: string; name: string; slug: string }[];
}) {
  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Ingen</SelectItem>
        {allowedEntities.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
