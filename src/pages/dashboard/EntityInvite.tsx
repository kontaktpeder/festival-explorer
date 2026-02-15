import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ContextualInviteModal } from "@/components/invite/ContextualInviteModal";
import { supabase } from "@/integrations/supabase/client";
import { getPublicUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ArrowLeft, Link2, Copy, Check, UserPlus, Ban, RefreshCw, Mail, Search, User } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useEntityInvitations, useCreateInvitation, useRevokeInvitation } from "@/hooks/useInvitations";
import type { AccessLevel } from "@/types/database";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

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

interface PersonaSearchResult {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  category_tags: string[] | null;
}

// Small helper for persona avatar with signed URL
function PersonaAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const signedUrl = useSignedMediaUrl(avatarUrl, "public");
  return (
    <Avatar className="h-8 w-8">
      {signedUrl && <AvatarImage src={signedUrl} alt={name} />}
      <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function EntityInvite() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Email invitation state
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, "owner">>("editor");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);

  // Persona search state
  const [personaQuery, setPersonaQuery] = useState("");
  const [personaResults, setPersonaResults] = useState<PersonaSearchResult[]>([]);
  const [personaSearching, setPersonaSearching] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaSearchResult | null>(null);
  const [personaAccessLevel, setPersonaAccessLevel] = useState<Exclude<AccessLevel, "owner">>("editor");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

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

  // Get existing team member user_ids (to exclude from search)
  const { data: existingTeamUserIds } = useQuery({
    queryKey: ["entity-team-user-ids", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_team")
        .select("user_id")
        .eq("entity_id", id!)
        .is("left_at", null);
      if (error) throw error;
      return (data || []).map((r) => r.user_id);
    },
    enabled: !!id,
  });

  // Fetch invitations for this entity
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useEntityInvitations(id);

  const isLoading = entityLoading || accessLoading;
  const canInvite = isMasterAdmin || userAccess === "admin" || userAccess === "owner";

  // Load all available public personas (excluding current user and existing team)
  const { data: allAvailablePersonas, isLoading: personasLoading } = useQuery({
    queryKey: ["available-personas-for-invite", id, existingTeamUserIds, currentUser?.id],
    queryFn: async () => {
      const excluded = [...(existingTeamUserIds || [])];
      if (currentUser?.id) excluded.push(currentUser.id);

      const { data, error } = await supabase.rpc("search_public_personas", {
        p_query: null,
        p_exclude_user_ids: excluded,
      });
      if (error) throw error;
      return (data || []) as PersonaSearchResult[];
    },
    enabled: !!id && !!currentUser?.id,
  });

  // Filter personas locally based on search query
  const filteredPersonas = useMemo(() => {
    const list = allAvailablePersonas || [];
    const q = personaQuery.trim().toLowerCase();
    if (q.length < 2) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [allAvailablePersonas, personaQuery]);

  // Redirect if no access (after all hooks)
  if (!isLoading && !canInvite) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePersonaInvite = async () => {
    if (!selectedPersona || !id || !currentUser) return;

    try {
      await createInvitation.mutateAsync({
        entityId: id,
        access: personaAccessLevel,
        roleLabels: [],
        invitedBy: currentUser.id,
        invitedUserId: selectedPersona.user_id,
        invitedPersonaId: selectedPersona.id,
      });

      toast({ title: `Invitasjon sendt til ${selectedPersona.name}` });
      setSelectedPersona(null);
      setPersonaQuery("");
      setPersonaResults([]);
      refetchInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke sende invitasjon";
      toast({ title: "Feil", description: message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    const emailToUse = prefillEmail || email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      toast({ title: "Ugyldig e-post", description: "Skriv inn en gyldig e-postadresse", variant: "destructive" });
      return;
    }
    if (!id || !currentUser) {
      toast({ title: "Feil", description: "Mangler nødvendig informasjon", variant: "destructive" });
      return;
    }

    try {
      const created = await createInvitation.mutateAsync({
        entityId: id,
        email: emailToUse,
        access: accessLevel,
        roleLabels: [],
        invitedBy: currentUser.id,
      });

      const publishedUrl = getPublicUrl();
      const token = (created as { token?: string | null })?.token;
      const link = token
        ? `${publishedUrl}/i?t=${encodeURIComponent(token)}`
        : `${publishedUrl}/accept-invitation?email=${encodeURIComponent(emailToUse)}&entity_id=${id}`;

      setGeneratedLink(link);
      setPrefillEmail(null);
      refetchInvitations();
      toast({ title: "Invitasjon opprettet!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke opprette invitasjon";
      toast({ title: "Feil", description: message, variant: "destructive" });
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
      toast({ title: "Kunne ikke kopiere", description: "Kopier lenken manuelt", variant: "destructive" });
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
      toast({ title: "Feil", description: message, variant: "destructive" });
    }
  };

  const handleRegenerate = (invitationEmail: string) => {
    setPrefillEmail(invitationEmail);
    setEmail(invitationEmail);
    setGeneratedLink(null);
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <UserPlus className="h-7 w-7" />
              Inviter til {entity.name}
            </h1>
            <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Hurtiginvitasjon
            </Button>
          </div>
          <p className="text-muted-foreground">
            Inviter noen som allerede er på GIGGEN, eller send en tilgangslenke på e-post.
          </p>
        </div>

        {entity && (
          <ContextualInviteModal
            open={inviteModalOpen}
            onOpenChange={setInviteModalOpen}
            target={{ entityId: entity.id, label: entity.name }}
            onSuccess={() => refetchInvitations()}
          />
        )}

        {/* Invite from platform (persona search) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Inviter fra plattformen
            </CardTitle>
            <CardDescription>
              Søk etter offentlige profiler (personas) på GIGGEN. Kun profiler som har «Bli funnet på plattformen» slått på, vises i søket. Vedkommende får invitasjonen i sin backstage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tilgangsnivå</Label>
              <Select
                value={personaAccessLevel}
                onValueChange={(value) => setPersonaAccessLevel(value as Exclude<AccessLevel, "owner">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">– {option.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Søk etter navn (offentlige profiler)</Label>
              <Input
                value={personaQuery}
                onChange={(e) => setPersonaQuery(e.target.value)}
                placeholder="Filtrer etter navn..."
              />
            </div>

            {personasLoading && (
              <p className="text-xs text-muted-foreground">Laster profiler...</p>
            )}
            {!personasLoading && filteredPersonas.length > 0 && !selectedPersona && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                {filteredPersonas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => {
                      setSelectedPersona(p);
                    }}
                  >
                    <PersonaAvatar avatarUrl={p.avatar_url} name={p.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      {p.category_tags && p.category_tags.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {p.category_tags.join(", ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!personasLoading && filteredPersonas.length === 0 && !selectedPersona && (
              <p className="text-xs text-muted-foreground">
                {(allAvailablePersonas || []).length === 0
                  ? "Ingen offentlige profiler tilgjengelig. Kun profiler som har «Bli funnet på plattformen» slått på, vises her."
                  : "Ingen profiler matcher søket ditt."}
              </p>
            )}

            {selectedPersona && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <PersonaAvatar avatarUrl={selectedPersona.avatar_url} name={selectedPersona.name} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedPersona.name}</p>
                    {selectedPersona.category_tags && selectedPersona.category_tags.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedPersona.category_tags.join(", ")}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPersona(null);
                    setPersonaQuery("");
                  }}
                >
                  Endre
                </Button>
              </div>
            )}

            {selectedPersona && (
              <Button
                onClick={handlePersonaInvite}
                disabled={createInvitation.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {createInvitation.isPending ? "Sender..." : `Send invitasjon til ${selectedPersona.name}`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Generate new email invitation */}
        <Card>
          <CardHeader>
            <CardTitle>
              {prefillEmail ? `Ny invitasjon til ${prefillEmail}` : "Inviter via e-post"}
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
                  if (prefillEmail) setPrefillEmail(null);
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
                  onClick={() => { setPrefillEmail(null); setEmail(""); }}
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
                        <span className="text-muted-foreground text-xs ml-2">– {option.description}</span>
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
                  const isUserInvite = !!(inv as { invited_user_id?: string | null }).invited_user_id;

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isUserInvite ? (
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {isUserInvite ? "Plattforminvitasjon" : inv.email}
                          </p>
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
                                  Invitasjonen vil bli ugyldig. Du kan sende en ny invitasjon senere.
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
                        {!isUserInvite && (inv.status === "revoked" || effectiveStatus === "expired") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRegenerate(inv.email || "")}
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
      </main>
    </div>
  );
}
