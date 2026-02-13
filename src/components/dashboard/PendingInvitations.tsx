import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyPendingInvitations, useAcceptInvitationById, useDeclineInvitation } from "@/hooks/useInvitations";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, X } from "lucide-react";
import type { AccessLevel } from "@/types/database";

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
};

export function PendingInvitations() {
  const { data: invitations, isLoading } = useMyPendingInvitations();
  const acceptInvitation = useAcceptInvitationById();
  const declineInvitation = useDeclineInvitation();
  const { toast } = useToast();

  if (isLoading || !invitations || invitations.length === 0) return null;

  const handleAccept = async (invitationId: string, entityName: string) => {
    try {
      await acceptInvitation.mutateAsync({ invitationId });
      toast({ title: `Du er nå med i ${entityName}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke akseptere invitasjon";
      toast({ title: "Feil", description: message, variant: "destructive" });
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineInvitation.mutateAsync({ invitationId });
      toast({ title: "Invitasjon avslått" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke avslå invitasjon";
      toast({ title: "Feil", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-accent" />
          Du har {invitations.length} ventende invitasjon{invitations.length > 1 ? "er" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((inv) => {
          const entity = inv.entity as { id: string; name: string; slug: string; type: string } | null;
          const entityName = entity?.name || "Ukjent prosjekt";

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entityName}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {ACCESS_LABELS[inv.access as AccessLevel] || inv.access}
                </Badge>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDecline(inv.id)}
                  disabled={declineInvitation.isPending}
                  title="Avslå"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => handleAccept(inv.id, entityName)}
                  disabled={acceptInvitation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aksepter
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
