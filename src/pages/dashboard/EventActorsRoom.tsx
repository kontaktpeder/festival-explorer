import { useState } from "react";
import { useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ActorZoneSection } from "@/components/actors/ActorZoneSection";
import { AddActorDialog } from "@/components/actors/AddActorDialog";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useEventActors, ACTOR_ZONES, type ActorZoneKey } from "@/hooks/useEventActors";
import { toast } from "sonner";

export default function EventActorsRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading: accessLoading, canEdit } = useEventBackstageAccess(id);
  const {
    actorsByZone,
    participants,
    isLoading: actorsLoading,
    addParticipant,
    addOfflineActor,
    sendInvitation,
    resendInvitation,
    revokeInvitation,
    removeParticipant,
    changeZone,
    changeLiveRole,
  } = useEventActors(id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogZone, setDialogZone] = useState<ActorZoneKey>("lineup");

  const isLoading = accessLoading || actorsLoading;

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster aktører..." />
      </div>
    );
  }

  if (!event || !id) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Du har ikke tilgang til å administrere aktører.</p>
      </div>
    );
  }

  const existingIds = new Set(participants.map(p => p.participant_id));

  const handleAddClick = (zone: ActorZoneKey) => {
    setDialogZone(zone);
    setDialogOpen(true);
  };

  const handleResend = async (invId: string) => {
    try {
      await resendInvitation.mutateAsync(invId);
      toast.success("Invitasjon sendt på nytt");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke sende på nytt");
    }
  };

  const handleRevoke = async (invId: string) => {
    try {
      await revokeInvitation.mutateAsync(invId);
      toast.success("Invitasjon trukket tilbake");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke trekke tilbake");
    }
  };

  const handleRemove = async (participantId: string) => {
    try {
      await removeParticipant.mutateAsync(participantId);
      toast.success("Fjernet");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke fjerne");
    }
  };

  const handleChangeZone = async (participantId: string, newZone: ActorZoneKey) => {
    try {
      await changeZone.mutateAsync({ participantId, newZone });
      toast.success("Sone endret");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke endre sone");
    }
  };

  const handleChangeLiveRole = async (participantId: string, role: string) => {
    try {
      await changeLiveRole.mutateAsync({ participantId, role });
      toast.success("Tilgang oppdatert");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke oppdatere tilgang");
    }
  };

  return (
    <BackstageShell
      title="Aktører"
      subtitle={event.title}
      backTo={`/dashboard/events/${id}`}
      externalLink={
        event.slug
          ? { to: `/event/${event.slug}`, label: "Se live" }
          : undefined
      }
    >
      <div className="space-y-1">
        {ACTOR_ZONES.map(z => (
          <ActorZoneSection
            key={z.key}
            zoneKey={z.key}
            label={z.label}
            items={actorsByZone[z.key]}
            onAddClick={handleAddClick}
            onResend={handleResend}
            onRevoke={handleRevoke}
            onRemove={handleRemove}
            onChangeZone={handleChangeZone}
            onChangeLiveRole={handleChangeLiveRole}
          />
        ))}
      </div>

      <AddActorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialZone={dialogZone}
        existingParticipantIds={existingIds}
        onAddPlatformUser={async (kind, pid, zone) => {
          await addParticipant.mutateAsync({
            participantKind: kind,
            participantId: pid,
            zone,
          });
        }}
        onInviteByEmail={async (email, name, zone, message) => {
          await sendInvitation.mutateAsync({ email, name, zone, message });
        }}
        onAddOffline={async (name, zone, roleLabel) => {
          await addOfflineActor.mutateAsync({ name, zone, roleLabel });
        }}
      />
    </BackstageShell>
  );
}
