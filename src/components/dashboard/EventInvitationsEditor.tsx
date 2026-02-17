import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEventInvitations } from "@/hooks/useEventInvitations";
import { useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, Check, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventInvitationsEditorProps {
  eventId: string;
  canEdit: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Venter", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  accepted: { label: "Godkjent", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  declined: { label: "Avslått", color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export function EventInvitationsEditor({ eventId, canEdit }: EventInvitationsEditorProps) {
  const { invitations, isLoading, createInvitation } = useEventInvitations(eventId);
  const selectedPersonaId = useSelectedPersonaId();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityId, setEntityId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Entities available to invite (solo/band, not already invited)
  const alreadyInvitedIds = new Set(invitations.map((i: any) => i.entity_id));

  const { data: availableEntities = [] } = useQuery({
    queryKey: ["entities-solo-band-for-invite", Array.from(alreadyInvitedIds)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug")
        .in("type", ["solo", "band"])
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return (data || []).filter((e) => !alreadyInvitedIds.has(e.id));
    },
  });

  const handleInvite = async () => {
    if (!entityId) {
      toast({ title: "Velg et prosjekt", variant: "destructive" });
      return;
    }
    if (!selectedPersonaId) {
      toast({ title: "Velg en persona i dashbordet først", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await createInvitation.mutateAsync({
        entityId,
        invitedByPersonaId: selectedPersonaId,
        message: message.trim() || undefined,
        accessOnAccept: "viewer",
      });
      toast({ title: "Invitasjon sendt" });
      setDialogOpen(false);
      setEntityId("");
      setMessage("");
    } catch (e: any) {
      const desc = e?.message?.includes("duplicate")
        ? "Prosjektet er allerede invitert til dette eventet."
        : e?.message;
      toast({ title: "Feil", description: desc, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground/50" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Invitasjoner
          </h2>
          {invitations.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {invitations.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-7 text-xs gap-1.5 border-border/30 hover:border-accent/40"
        >
          <Plus className="h-3 w-3" />
          Inviter prosjekt
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Inviter artister/prosjekter til å delta. Ved godkjenning får du leser-tilgang og kan bruke dem i programmet.
      </p>

      {invitations.length > 0 && (
        <div className="space-y-1.5">
          {invitations.map((inv: any) => {
            const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/10 border border-border/10"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inv.entity?.name ?? "Ukjent prosjekt"}
                  </p>
                  {inv.inviter_persona && (
                    <p className="text-[10px] text-muted-foreground/50">
                      Invitert av {inv.inviter_persona.name}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusCfg.color}`}>
                  {inv.status === "accepted" && <Check className="h-2.5 w-2.5 mr-1" />}
                  {inv.status === "pending" && <Clock className="h-2.5 w-2.5 mr-1" />}
                  {inv.status === "declined" && <X className="h-2.5 w-2.5 mr-1" />}
                  {statusCfg.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter prosjekt til event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Prosjekt</Label>
              <Select value={entityId || "__none__"} onValueChange={(v) => setEntityId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Velg prosjekt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Velg prosjekt...</SelectItem>
                  {availableEntities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableEntities.length === 0 && !isLoading && (
                <p className="text-[10px] text-muted-foreground/50">
                  Alle publiserte prosjekter er allerede invitert.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Melding (valgfritt)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="F.eks. Vi vil gjerne ha dere med på kvelden 15. juni..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleInvite} disabled={!entityId || sending}>
              {sending ? "Sender..." : "Send invitasjon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
