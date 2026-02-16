import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  Users,
  Copy,
  Check,
  UserPlus,
  Loader2,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCreateInvitation } from "@/hooks/useInvitations";
import type { AccessLevel } from "@/types/database";
import { InviteExistingUserStep } from "@/components/invite/InviteExistingUserStep";

const ACCESS_OPTIONS: { value: Exclude<AccessLevel, "owner">; label: string }[] = [
  { value: "admin", label: "Administrer" },
  { value: "editor", label: "Rediger" },
  { value: "viewer", label: "Se" },
];

type InviteStep = "choose" | "new" | "existing";

export default function EntityInvite() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [step, setStep] = useState<InviteStep>("choose");
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, "owner">>("editor");

  // New user state
  const [emails, setEmails] = useState<string[]>([""]);
  const [generatedLinks, setGeneratedLinks] = useState<{ email: string; link: string }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // (existing user state removed – handled by InviteExistingUserStep)

  const createInvitation = useCreateInvitation();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: isMasterAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
  });

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

  const excludedUserIds = [...(existingTeamUserIds || [])];

  const isLoading = entityLoading || accessLoading;
  const canInvite = isMasterAdmin || userAccess === "admin" || userAccess === "owner";

  if (!isLoading && !canInvite) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!entity) {
    return <Navigate to="/dashboard" replace />;
  }

  // --- Handlers ---

  const addEmailRow = () => setEmails((prev) => [...prev, ""]);
  const setEmailAt = (index: number, value: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeEmailRow = (index: number) => {
    if (emails.length <= 1) return;
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateLinks = async () => {
    const validEmails = emails.map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (validEmails.length === 0) {
      toast({ title: "Skriv inn minst én gyldig e-post", variant: "destructive" });
      return;
    }
    const links: { email: string; link: string }[] = [];
    const publishedUrl = getPublicUrl();
    try {
      for (const emailAddr of validEmails) {
        const created = await createInvitation.mutateAsync({
          entityId: entity.id,
          email: emailAddr,
          access: accessLevel,
          roleLabels: [],
          invitedBy: currentUser!.id,
        });
        const token = (created as { token?: string | null })?.token;
        const link = token
          ? `${publishedUrl}/i?t=${encodeURIComponent(token)}`
          : `${publishedUrl}/accept-invitation?email=${encodeURIComponent(emailAddr)}&entity_id=${entity.id}`;
        links.push({ email: emailAddr, link });
      }
      setGeneratedLinks(links);
      toast({ title: `${links.length} lenke(r) generert` });
    } catch (e: unknown) {
      toast({ title: "Kunne ikke opprette invitasjon", description: String(e), variant: "destructive" });
    }
  };

  const handleCopyLink = async (link: string, index: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      toast({ title: "Lenke kopiert" });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({ title: "Kunne ikke kopiere", variant: "destructive" });
    }
  };

  const resetFlow = () => {
    setStep("choose");
    setEmails([""]);
    setGeneratedLinks([]);
    setCopiedIndex(null);
  };

  // --- Render ---

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border flex-shrink-0">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to={`/dashboard/entities/${id}/edit`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground truncate">{entity.name}</span>
        </div>
      </header>

      {/* Content — centered, quiet */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">

          {/* Step: Choose */}
          {step === "choose" && (
            <div className="space-y-8 text-center">
              <div className="space-y-3">
                <UserPlus className="h-8 w-8 mx-auto text-muted-foreground" />
                <h1 className="text-xl font-semibold text-foreground">
                  Inviter til {entity.name}
                </h1>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Inviter noen som allerede er på plattformen, eller send en tilgangslenke på e-post.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tilgangsnivå</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as Exclude<AccessLevel, "owner">)}
                >
                  {ACCESS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-background hover:border-foreground/20 transition-colors"
                  onClick={() => setStep("existing")}
                >
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground block">Plattformen</span>
                    <span className="text-xs text-muted-foreground block">Søk og inviter direkte</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-background hover:border-foreground/20 transition-colors"
                  onClick={() => setStep("new")}
                >
                  <Mail className="h-6 w-6 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground block">E-post</span>
                    <span className="text-xs text-muted-foreground block">Send tilgangslenke</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Existing user */}
          {step === "existing" && (
            <div className="space-y-6">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={resetFlow}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tilbake
              </button>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Inviter fra plattformen</h2>
                <p className="text-sm text-muted-foreground">
                  Vedkommende får invitasjonen i sin backstage.
                </p>
              </div>

              <InviteExistingUserStep
                entityId={entity.id}
                excludedUserIds={excludedUserIds}
                accessLevel={accessLevel}
                submitLabel="Inviter"
              />
            </div>
          )}

          {/* Step: New user (email) */}
          {step === "new" && (
            <div className="space-y-6">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={resetFlow}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tilbake
              </button>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Inviter via e-post</h2>
                <p className="text-sm text-muted-foreground">
                  Opprett en tilgangslenke du kan sende til noen som ikke er på plattformen ennå.
                </p>
              </div>

              {generatedLinks.length === 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {emails.map((emailVal, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="namn@example.com"
                          value={emailVal}
                          onChange={(e) => setEmailAt(i, e.target.value)}
                          className="text-base"
                        />
                        {emails.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeEmailRow(i)} className="flex-shrink-0">
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={addEmailRow}
                    >
                      + Legg til flere
                    </button>
                  </div>

                  <Button
                    onClick={handleGenerateLinks}
                    disabled={createInvitation.isPending}
                    className="w-full gap-2"
                  >
                    {createInvitation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Generer lenke
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedLinks.map(({ email: linkEmail, link }, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <span className="text-sm text-muted-foreground truncate flex-1">{linkEmail}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleCopyLink(link, i)}>
                        {copiedIndex === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center">
                    Kopier og send lenken til mottakeren.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={resetFlow}>
                      Ny invitasjon
                    </Button>
                    <Button variant="secondary" className="flex-1" asChild>
                      <Link to={`/dashboard/entities/${id}/edit`}>Ferdig</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
