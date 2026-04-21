import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, ExternalLink, Mail, Music, Pencil, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingState } from "@/components/ui/LoadingState";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { ShareButton } from "@/components/share/ShareButton";
import {
  completeArtistJoin,
  getAuthCallbackUrl,
  type ArtistJoinKind,
  type CompleteArtistJoinResult,
} from "@/lib/artistJoinOnboarding";
import { getPublicUrl } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";

type Step = "intro" | "auth" | "create" | "done";
type AuthMode = "signup" | "signin";

interface ExistingArtistProject {
  id: string;
  slug: string;
  name: string;
  type: ArtistJoinKind;
  heroImageUrl: string | null;
}

/**
 * Looks up the user's existing solo/band project, if any. Used by the join
 * flow to skip "create" and jump straight to the success panel ("smart
 * resume"). Returns null if the user has no qualifying project.
 */
async function findExistingArtistProject(): Promise<ExistingArtistProject | null> {
  const { data: rows, error: rpcError } = await supabase.rpc("get_user_entities");
  if (rpcError) {
    console.warn("findExistingArtistProject: get_user_entities", rpcError);
    return null;
  }
  const ids = (rows ?? [])
    .map((r: { entity_id?: string | null }) => r?.entity_id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (ids.length === 0) return null;
  const { data: entities, error: entityError } = await supabase
    .from("entities")
    .select("id, slug, name, type, hero_image_url, created_at")
    .in("id", ids)
    .in("type", ["solo", "band"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (entityError) {
    console.warn("findExistingArtistProject: entities", entityError);
    return null;
  }
  const first = entities?.[0];
  if (!first) return null;
  return {
    id: first.id,
    slug: first.slug,
    name: first.name,
    type: first.type as ArtistJoinKind,
    heroImageUrl: first.hero_image_url ?? null,
  };
}

export default function JoinArtistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("intro");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Auth form
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Create form
  const [kind, setKind] = useState<ArtistJoinKind>("solo");
  const [name, setName] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [heroSettings, setHeroSettings] = useState<ImageSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompleteArtistJoinResult | null>(null);
  // When the resolver finds an existing artist project, we surface it in the
  // success panel without forcing a new creation. This makes /join/artist a
  // safe "smart resume" entrypoint for ads / shared links.
  const [resumed, setResumed] = useState(false);

  // Detect session, listen for changes (covers OAuth redirect / magic link).
  useEffect(() => {
    let cancelled = false;
    const apply = async (loggedIn: boolean) => {
      if (cancelled) return;
      setHasSession(loggedIn);
      setSessionChecked(true);
      if (loggedIn) {
        // Smart resume: if the user already has a solo/band project, jump to
        // the success panel instead of forcing them through "create" again.
        setResolving(true);
        try {
          const existing = await findExistingArtistProject();
          if (cancelled) return;
          if (existing) {
            setKind(existing.type);
            setName(existing.name);
            setHeroUrl(existing.heroImageUrl ?? "");
            setResult({
              entityId: existing.id,
              entitySlug: existing.slug,
              personaId: "",
            });
            setResumed(true);
            setStep("done");
          } else {
            setStep((prev) => (prev === "intro" || prev === "auth" ? "create" : prev));
          }
        } finally {
          if (!cancelled) setResolving(false);
        }
      }
    };
    supabase.auth.getSession().then(({ data }) => void apply(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void apply(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Allow ?step=auth deep link (e.g. from a "logg inn" CTA).
  useEffect(() => {
    const s = searchParams.get("step");
    if (s === "auth" && !hasSession) setStep("auth");
  }, [searchParams, hasSession]);

  const publicProjectUrl = useMemo(() => {
    if (!result) return "";
    return `${getPublicUrl().replace(/\/$/, "")}/project/${result.entitySlug}`;
  }, [result]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl(),
          queryParams: { next: "/join/artist" },
        },
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Innlogging feilet.");
      setAuthBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getAuthCallbackUrl()}?next=${encodeURIComponent("/join/artist")}`,
          },
        });
        if (error) throw error;
        // If email confirmation is required, no session yet.
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setEmailSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Innlogging feilet.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Skriv inn et navn først.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await completeArtistJoin({
        kind,
        name,
        heroImageUrl: heroUrl || null,
        heroImageSettings: heroSettings,
      });
      setResult(r);
      await queryClient.invalidateQueries({ queryKey: ["my-personas"] });
      await queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      setStep("done");
      toast.success("Profilen din er klar!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Noe gikk galt.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionChecked || resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-6 py-12 sm:py-16">
        {step === "intro" && (
          <section className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Lag en profesjonell artistprofil
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                Få en delbar side for deg eller bandet ditt. Legg til navn og et bilde,
                så er du i gang. Du kan invitere bandmedlemmer etterpå.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Egen offentlig side med eget navn",
                "Bilde, beskrivelse og lenke til sosiale medier",
                "Inviter bandmedlemmer og samarbeidspartnere",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => setStep(hasSession ? "create" : "auth")}
                className="gap-2"
              >
                Kom i gang
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!hasSession && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    setAuthMode("signin");
                    setStep("auth");
                  }}
                >
                  Jeg har allerede konto
                </Button>
              )}
            </div>
          </section>
        )}

        {step === "auth" && !hasSession && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                {authMode === "signup" ? "Opprett konto" : "Logg inn"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Bruk Google, Apple eller e-post. Vi sender deg rett tilbake hit etterpå.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                size="lg"
                disabled={authBusy}
                onClick={() => handleOAuth("google")}
              >
                Fortsett med Google
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={authBusy}
                onClick={() => handleOAuth("apple")}
              >
                Fortsett med Apple
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" />
              eller med e-post
              <div className="h-px bg-border flex-1" />
            </div>

            {emailSent ? (
              <div className="rounded-lg border border-border p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" /> Sjekk e-posten din
                </div>
                <p className="text-muted-foreground">
                  Vi sendte en bekreftelseslenke til {email}. Klikk lenken for å fullføre.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Passord</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {authError && (
                  <p className="text-sm text-destructive">{authError}</p>
                )}
                <Button type="submit" className="w-full" disabled={authBusy}>
                  {authBusy
                    ? "Vent litt…"
                    : authMode === "signup"
                      ? "Opprett konto"
                      : "Logg inn"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  onClick={() =>
                    setAuthMode((m) => (m === "signup" ? "signin" : "signup"))
                  }
                >
                  {authMode === "signup"
                    ? "Har du allerede konto? Logg inn"
                    : "Ny her? Opprett konto"}
                </button>
              </form>
            )}
          </section>
        )}

        {step === "create" && hasSession && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Sett opp profilen</h1>
              <p className="text-sm text-muted-foreground">
                Du kan endre alt senere – også navn og bilde.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <Label>Hva passer best?</Label>
                <RadioGroup
                  value={kind}
                  onValueChange={(v) => setKind(v as ArtistJoinKind)}
                  className="grid sm:grid-cols-2 gap-2"
                >
                  <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="solo" id="kind-solo" className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-2 font-medium text-sm">
                        <Music className="h-4 w-4" /> Solo
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Du opptrer i eget navn eller artistnavn
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="band" id="kind-band" className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-2 font-medium text-sm">
                        <Users className="h-4 w-4" /> Band / gruppe
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Flere medlemmer som spiller sammen
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  {kind === "solo" ? "Artistnavn" : "Bandnavn"}
                </Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={kind === "solo" ? "F.eks. Ola Nordmann" : "F.eks. Nordlys"}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Profilbilde (valgfritt)</Label>
                <InlineMediaPickerWithCrop
                  value={heroUrl}
                  imageSettings={heroSettings}
                  onChange={setHeroUrl}
                  onSettingsChange={setHeroSettings}
                  cropMode="hero"
                  placeholder="Last opp et bilde"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Oppretter…" : "Opprett profil"}
              </Button>
            </form>
          </section>
        )}

        {step === "done" && result && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                {resumed ? "Velkommen tilbake 👋" : "Profilen er klar 🎉"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {resumed
                  ? `Du har allerede ${kind === "band" ? "en bandprofil" : "en artistprofil"}. Fortsett der du slapp.`
                  : "Neste steg: legg til bio, sosiale lenker og publiser. Du kan også dele profilen med en gang."}
              </p>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              {heroUrl ? (
                <CroppedImage
                  src={heroUrl}
                  alt={name}
                  imageSettings={heroSettings}
                  aspect="hero"
                  className="w-full h-44"
                />
              ) : (
                <div className="w-full h-44 bg-muted" />
              )}
              <div className="p-4 space-y-1">
                <div className="font-semibold">{name}</div>
                <a
                  href={publicProjectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground break-all hover:underline"
                >
                  {publicProjectUrl}
                </a>
              </div>
            </div>

            {/* Primary CTA — "complete profile" is the one action that moves
                the journey forward. Keep it visually dominant. */}
            <Button asChild size="lg" className="w-full gap-2">
              <Link to={`/dashboard/entities/${result.entityId}/edit`}>
                <Pencil className="h-4 w-4" />
                {kind === "band" ? "Fullfør bandprofil" : "Fullfør artistprofil"}
              </Link>
            </Button>

            <p className="text-xs text-muted-foreground -mt-2">
              Legg til bio, bilder, sosiale lenker og rider for å gjøre profilen klar for booking.
            </p>

            {/* Secondary actions */}
            <div className="grid gap-2 sm:grid-cols-2">
              <ShareButton
                config={{
                  pageType: "project",
                  title: name,
                  slug: result.entitySlug,
                  shareTitle: name,
                  shareText: `Sjekk ut ${name} på giggen.org`,
                  heroImageUrl: heroUrl || null,
                }}
              />
              <Button asChild variant="outline" className="gap-2">
                <a href={publicProjectUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Se offentlig side
                </a>
              </Button>
            </div>

            {kind === "band" && (
              <Button asChild variant="outline" className="w-full gap-2">
                <Link to={`/dashboard/entities/${result.entityId}/invite`}>
                  <Users className="h-4 w-4" />
                  Inviter bandmedlemmer
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/dashboard?from=onboarding")}
            >
              Gå til dashbordet
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}