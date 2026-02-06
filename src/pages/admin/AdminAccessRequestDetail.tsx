import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccessRequest, useUpdateAccessRequest } from "@/hooks/useAccessRequests";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { usePlatformEntity } from "@/hooks/useEntityTypes";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPublicUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, Check, X, Copy, ShieldCheck, ShieldAlert } from "lucide-react";
import { ROLE_TYPE_OPTIONS, STATUS_LABELS } from "@/types/access-request";
import type { AccessRequestStatus } from "@/types/access-request";

const STATUS_VARIANT: Record<AccessRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  approved: "outline",
  rejected: "destructive",
};

export default function AdminAccessRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: request, isLoading } = useAccessRequest(id || "");
  const updateRequest = useUpdateAccessRequest();
  const createInvitation = useCreateInvitation();
  const { data: platformEntity } = usePlatformEntity();

  const [adminNotes, setAdminNotes] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Sync notes when request loads
  useEffect(() => {
    if (request?.admin_notes) {
      setAdminNotes(request.admin_notes);
    }
  }, [request?.admin_notes]);

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateRequest.mutateAsync({ id, admin_notes: adminNotes });
      toast({ title: "Notat lagret" });
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    if (!id || !request || !platformEntity) return;

    try {
      const user = await getAuthenticatedUser();

      const created = await createInvitation.mutateAsync({
        entityId: platformEntity.id,
        email: request.email,
        access: "viewer",
        roleLabels: [],
        invitedBy: user.id,
      });

      const publishedUrl = getPublicUrl();
      const token = (created as { token?: string | null })?.token;
      const link = token
        ? `${publishedUrl}/accept-invitation?token=${encodeURIComponent(token)}`
        : `${publishedUrl}/accept-invitation?email=${encodeURIComponent(request.email)}&entity_id=${platformEntity.id}`;

      setGeneratedLink(link);

      await updateRequest.mutateAsync({
        id,
        status: "approved",
        admin_notes:
          adminNotes ||
          `Invitasjonslenke generert: ${new Date().toLocaleString("nb-NO")}`,
      });

      toast({ title: "Godkjent – invitasjonslenke generert!" });
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await updateRequest.mutateAsync({
        id,
        status: "rejected",
        admin_notes: adminNotes,
      });
      toast({ title: "Forespørsel avslått" });
      navigate("/admin/access-requests");
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({ title: "Lenke kopiert!" });
    } catch {
      toast({
        title: "Kunne ikke kopiere",
        description: "Kopier lenken manuelt",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <LoadingState message="Laster..." />;

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Forespørsel ikke funnet</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/access-requests")}
          className="mt-4"
        >
          Tilbake
        </Button>
      </div>
    );
  }

  const roleLabel =
    ROLE_TYPE_OPTIONS.find((o) => o.value === request.role_type)?.label ??
    request.role_type;

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/access-requests")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg md:text-xl font-bold">Forespørsel</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(request.created_at), "d. MMMM yyyy 'kl.' HH:mm", {
              locale: nb,
            })}
          </p>
        </div>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{request.name}</CardTitle>
            <Badge variant={STATUS_VARIANT[request.status as AccessRequestStatus]} className="text-[10px]">
              {STATUS_LABELS[request.status as AccessRequestStatus]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">E-post: </span>
            <a href={`mailto:${request.email}`} className="text-accent hover:underline">
              {request.email}
            </a>
            {request.email_verified ? (
              <span className="inline-flex items-center gap-1 ml-2 text-[11px] text-green-500">
                <ShieldCheck className="h-3 w-3" /> Bekreftet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 ml-2 text-[11px] text-yellow-500">
                <ShieldAlert className="h-3 w-3" /> Ikke bekreftet
              </span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Rolle: </span>
            {roleLabel}
          </div>
          {request.message && (
            <div>
              <span className="text-muted-foreground block mb-1">Melding:</span>
              <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded p-3 text-sm">
                {request.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Administrasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Admin-notater</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Skriv notater her..."
              rows={3}
              className="resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={updateRequest.isPending}
            >
              Lagre notat
            </Button>
          </div>

          {generatedLink && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
              <Label className="text-xs">Invitasjonslenke</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-[10px]"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={
                updateRequest.isPending || request.status === "rejected"
              }
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Avslå
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                updateRequest.isPending ||
                createInvitation.isPending ||
                request.status === "approved"
              }
              className="flex-1"
            >
              {createInvitation.isPending ? (
                "Genererer..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Godkjenn
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
