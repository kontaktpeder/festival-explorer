import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  SLOT_KIND_OPTIONS,
  INTERNAL_STATUS_OPTIONS,
  getSlotKindConfig,
} from "@/lib/program-slots";
import { Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isoToLocalDatetimeString } from "@/lib/utils";
import type { SlotKind, InternalSlotStatus } from "@/types/database";

interface EventProgramSlotsEditorProps {
  eventId: string;
  canEdit: boolean;
}

interface SlotForm {
  slot_kind: SlotKind;
  starts_at: string;
  ends_at: string;
  entity_id: string;
  internal_status: InternalSlotStatus;
  internal_note: string;
  is_canceled: boolean;
}

const EMPTY_FORM: SlotForm = {
  slot_kind: "concert",
  starts_at: "",
  ends_at: "",
  entity_id: "",
  internal_status: "confirmed",
  internal_note: "",
  is_canceled: false,
};

export function EventProgramSlotsEditor({ eventId, canEdit }: EventProgramSlotsEditorProps) {
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

  const openCreate = () => {
    setEditingSlot(null);
    setForm({ ...EMPTY_FORM });
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Laster...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Program
        </h2>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={openCreate} className="h-7 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Legg til
          </Button>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 py-4 text-center">
          Ingen programpunkter ennå.
        </p>
      ) : (
        <div className="space-y-1">
          {slots.map((slot: any) => {
            const config = getSlotKindConfig(slot.slot_kind);
            const Icon = config.icon;
            const entity = slot.entity;
            return (
              <div
                key={slot.id}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 group transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(slot.starts_at).toLocaleTimeString("nb-NO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {slot.ends_at &&
                        ` – ${new Date(slot.ends_at).toLocaleTimeString("nb-NO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {entity ? entity.name : config.label}
                    </span>
                    {slot.is_canceled && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1">
                        Avlyst
                      </Badge>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Select
                      value={slot.internal_status}
                      onValueChange={(v) =>
                        updateMutation.mutate({
                          id: slot.id,
                          internal_status: v as InternalSlotStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 w-auto text-[10px] border-none bg-transparent shadow-none px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERNAL_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDuplicate(slot)} title="Dupliser">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(slot)} title="Rediger">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
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
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Rediger punkt" : "Legg til punkt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.slot_kind} onValueChange={(v) => setForm((f) => ({ ...f, slot_kind: v as SlotKind }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_KIND_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    return (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {o.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Starttid *</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sluttid</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="h-9 text-sm"
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
                />
              </div>
            )}

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

/** Simple entity picker for solo/band entities */
function EntityPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { data: entities = [] } = useQuery({
    queryKey: ["entities-solo-band"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug")
        .in("type", ["solo", "band"])
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Ingen</SelectItem>
        {entities.map((e: any) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
