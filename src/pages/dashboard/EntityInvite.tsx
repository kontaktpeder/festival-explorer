import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Link2, Copy, Check, UserPlus, Ban, RefreshCw, Mail } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useEntityInvitations, useCreateInvitation, useRevokeInvitation } from "@/hooks/useInvitations";
import type { AccessLevel } from "@/types/database";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const ACCESS_OPTIONS: { value: Exclude<AccessLevel, "owner">; label: string; description: string }[] = [
  { value: "admin", label: "Administrer", description: "Full tilgang til å redigere og administrere" },
  { value: "editor", label: "Rediger", description: "Kan redigere innhold" },
  { value: "viewer", label: "Se", description: "Kun lesetilgang" },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Venter", variant: "secondary" },
  accepted: { label: "Akseptert", variant: "default" },
  revoked: { label: "Tilbakekalt", variant: "destructive" },
  expired: { label: "Utløpt", variant: "outline" },
};

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
};

export default function EntityInvite() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, "owner">>("editor");
  
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);

  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();

  // Check if user is master admin
  const { data: isMasterAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
  });

  // Fetch entity data
  const { data: entity, isLoading: entityLoading } = useQuery({
    queryKey: ["entity-by-id", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's access level for this entity
  const { data: userAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["user-entity-access", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("entity_team")
        .select("access")
        .eq("entity_id", id)
        .eq("user_id", user.id)
        .is("left_at", null)
        .maybeSingle();

      if (error) throw error;
      return data?.access as AccessLevel | null;
    },
    enabled: !!id,
  });

  // Get current user ID
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch invitations for this entity
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useEntityInvitations(id);

  const isLoading = entityLoading || accessLoading;
  const canInvite = isMasterAdmin || userAccess === "admin" || userAccess === "owner";

  // Redirect if no access
  if (!isLoading && !canInvite) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGenerate = async () => {
    const emailToUse = prefillEmail || email;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      toast({
        title: "Ugyldig e-post",
        description: "Skriv inn en gyldig e-postadresse",
        variant: "destructive",
      });
      return;
    }

    if (!id || !currentUser) {
      toast({
        title: "Feil",
        description: "Mangler nødvendig informasjon",
        variant: "destructive",
      });
      return;
    }

    try {
      // Rolle hentes automatisk fra personaens category_tags når de oppretter persona
      const created = await createInvitation.mutateAsync({
        entityId: id,
        email: emailToUse,
        access: accessLevel,
        roleLabels: [],
        invitedBy: currentUser.id,
      });

      // Generate the invitation link using published URL
      const publishedUrl = "https://giggn.lovable.app";
      const token = (created as { token?: string | null })?.token;
      const link = token
        ? `${publishedUrl}/accept-invitation?token=${encodeURIComponent(token)}`
        : `${publishedUrl}/accept-invitation?email=${encodeURIComponent(emailToUse)}&entity_id=${id}`;

      setGeneratedLink(link);
      setPrefillEmail(null);
      refetchInvitations();

      toast({ title: "Invitasjon opprettet!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke opprette invitasjon";
      toast({
        title: "Feil",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: "Lenke kopiert!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Kunne ikke kopiere",
        description: "Kopier lenken manuelt",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!id) return;

    try {
      await revokeInvitation.mutateAsync({ id: invitationId, entityId: id });
      refetchInvitations();
      toast({ title: "Invitasjon tilbakekalt" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke tilbakekalle";
      toast({
        title: "Feil",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = (invitationEmail: string) => {
    setPrefillEmail(invitationEmail);
    setEmail(invitationEmail);
    setGeneratedLink(null);
    // Scroll to form
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const resetForm = () => {
    setEmail("");
    setGeneratedLink(null);
    setCopied(false);
    setPrefillEmail(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!entity) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-foreground">
            GIGGEN
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back button */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/dashboard/entities/${id}/edit`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til {entity.name}
            </Link>
          </Button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <UserPlus className="h-7 w-7" />
            Inviter til {entity.name}
          </h1>
          <p className="text-muted-foreground">
            Gi noen tilgang til å redigere eller se dette prosjektet
          </p>
        </div>

        {/* Existing invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Eksisterende invitasjoner</CardTitle>
            <CardDescription>
              Alle som har blitt invitert til dette prosjektet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <LoadingState message="Laster invitasjoner..." />
            ) : invitations && invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((inv) => {
                  const statusConfig = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                  const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                  const effectiveStatus = isExpired && inv.status === "pending" ? "expired" : inv.status;
                  const effectiveConfig = STATUS_CONFIG[effectiveStatus] || statusConfig;

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{inv.email}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <Badge variant={effectiveConfig.variant} className="text-xs">
                              {effectiveConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ACCESS_LABELS[inv.access as AccessLevel]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(inv.invited_at), "d. MMM yyyy", { locale: nb })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        {inv.status === "pending" && !isExpired && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tilbakekall invitasjon?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Invitasjonen til {inv.email} vil bli ugyldig. Du kan sende en ny invitasjon senere.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRevoke(inv.id)}>
                                  Tilbakekall
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {(inv.status === "revoked" || effectiveStatus === "expired") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRegenerate(inv.email)}
                            title="Send ny invitasjon"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen invitasjoner ennå
              </p>
            )}
          </CardContent>
        </Card>

        {/* Generate new invitation */}
        <Card>
          <CardHeader>
            <CardTitle>
              {prefillEmail ? `Ny invitasjon til ${prefillEmail}` : "Generer ny invitasjon"}
            </CardTitle>
            <CardDescription>
              Opprett en invitasjonslenke for å gi noen tilgang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-postadresse</Label>
              <Input
                id="email"
                type="email"
                value={prefillEmail || email}
                onChange={(e) => {
                  if (prefillEmail) {
                    setPrefillEmail(null);
                  }
                  setEmail(e.target.value);
                }}
                placeholder="bruker@example.com"
                disabled={!!prefillEmail}
              />
              {prefillEmail && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setPrefillEmail(null);
                    setEmail("");
                  }}
                >
                  Bruk annen e-post
                </Button>
              )}
            </div>

            {/* Access level */}
            <div className="space-y-2">
              <Label htmlFor="access">Tilgangsnivå</Label>
              <Select
                value={accessLevel}
                onValueChange={(value) => setAccessLevel(value as Exclude<AccessLevel, "owner">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          – {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!(prefillEmail || email) || createInvitation.isPending}
              className="w-full"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {createInvitation.isPending ? "Genererer..." : "Generer invitasjonslenke"}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {generatedLink && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-accent-foreground flex items-center gap-2">
                <Check className="h-5 w-5" />
                Invitasjonslenke generert!
              </CardTitle>
              <CardDescription>
                Kopier lenken og send den til {prefillEmail || email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-sm" />
                <Button
                  onClick={handleCopy}
                  variant={copied ? "default" : "outline"}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Mottakeren kan bruke denne lenken for å opprette konto eller logge inn og få tilgang.
              </p>
              <Button variant="outline" onClick={resetForm} className="w-full">
                Generer ny invitasjon
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
