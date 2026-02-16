import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateTeamMember } from "@/hooks/useEntityMutations";
import { User } from "lucide-react";

const CREDIT_INTRO =
  "Du vil nå vises under «Bak prosjektet» på prosjektsiden. Dette handler om å bli kreditert på dette prosjektet – ikke om å være synlig i søk (det styrer du under profilen med «Vis profilen min»). Ta gjerne et øyeblikk og sjekk at profilen din ser bra ut.";

interface ProjectCreditFlowProps {
  memberId: string;
  entityId?: string | null;
  entityName: string;
  personaId?: string | null;
  personaSlug?: string | null;
  isPublic: boolean;
}

export function ProjectCreditFlow({
  memberId,
  entityId,
  entityName,
  personaId,
  personaSlug,
  isPublic,
}: ProjectCreditFlowProps) {
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const updateTeamMember = useUpdateTeamMember();

  const handleConfirmCredit = () => {
    updateTeamMember.mutate(
      { id: memberId, isPublic: true },
      {
        onSuccess: () => {
          setCreditModalOpen(false);
        },
      }
    );
  };

  const handleRemoveCredit = () => {
    updateTeamMember.mutate(
      { id: memberId, isPublic: false },
      {
        onSuccess: () => setRemoveDialogOpen(false),
      }
    );
  };

  if (isPublic) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            Kreditert
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setRemoveDialogOpen(true)}
          >
            Fjern kreditering
          </Button>
        </div>

        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fjerne kreditering?</AlertDialogTitle>
              <AlertDialogDescription>
                Du vil ikke lenger vises under «Bak prosjektet» på prosjektsiden for {entityName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveCredit}
                disabled={updateTeamMember.isPending}
              >
                {updateTeamMember.isPending ? "Fjerner..." : "Fjern kreditering"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setCreditModalOpen(true)}
      >
        <User className="h-3.5 w-3.5 mr-1" />
        Krediter meg for dette prosjektet
      </Button>

      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Du er i ferd med å bli kreditert for {entityName}</DialogTitle>
            <DialogDescription>
              {CREDIT_INTRO}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Gå gjennom profilen din
              </p>
              <p className="text-sm text-muted-foreground">
                Sjekk at bilde, beskrivelse og rolle ser slik ut at du vil at andre skal bli kjent med deg.
              </p>
              {personaId ? (
                <Button asChild variant="default" size="sm" className="w-full">
                  <Link
                    to={`/dashboard/personas/${personaId}${entityId ? `?fromCredit=1&entityId=${encodeURIComponent(entityId)}&entityName=${encodeURIComponent(entityName)}` : ""}`}
                  >
                    Åpne min profil
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <div className="rounded-lg border-2 border-accent/40 bg-accent/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Ferdig med å sjekke?
                </p>
                <p className="text-xs text-muted-foreground">
                  Klikk nedenfor for å krediteres for prosjektet. Du vil da vises under «Bak prosjektet» på prosjektsiden.
                </p>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleConfirmCredit}
                  disabled={updateTeamMember.isPending}
                >
                  {updateTeamMember.isPending ? "Krediterer..." : "Krediter meg"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
