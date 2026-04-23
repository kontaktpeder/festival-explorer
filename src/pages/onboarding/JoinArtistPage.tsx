import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, ExternalLink, Mail, Music, Pencil, Users } from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingState } from "@/components/ui/LoadingState";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { ShareButton } from "@/components/share/ShareButton";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { CinematicCTA } from "@/components/onboarding/CinematicCTA";
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

  const emailApps = useMemo(
    () => [
      {
        label: "Åpne Gmail",
        href: "https://mail.google.com/mail/u/0/#inbox",
      },
      {
        label: "Åpne Apple Mail",
        href: "message://",
      },
    ],
    [],
  );

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
      <OnboardingShell stepKey="loading" overlayIntensity="heavy">
        <div className="flex-1 flex items-center justify-center">
          <LoadingState />
        </div>
      </OnboardingShell>
    );
  }

  const intensity =
    step === "intro" ? "light" : step === "done" ? "medium" : "heavy";
  const progressMap: Record<Step, number> = {
    intro: 1,
    auth: 2,
    create: 3,
    done: 4,
  };

  return (
    <OnboardingShell
      stepKey={step}
      overlayIntensity={intensity}
      progress={{ current: progressMap[step], total: 4 }}
    >
      {step === "intro" && (
        <section className="flex-1 flex flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)] lg:items-end lg:gap-10 lg:pb-8">
          {/* Push hero copy down so it sits in the lower third — story-style */}
          <div className="hidden lg:block" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
            className="space-y-5 pb-2 lg:pb-0 lg:max-w-xl lg:self-end"
          >
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="font-display text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-[4.5rem] font-semibold tracking-tight text-foreground"
            >
              Ikke bare post på Instagram.<br />
              <span className="text-accent">Bygg en base.</span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="text-foreground/70 text-base leading-relaxed max-w-sm lg:max-w-md lg:text-lg"
            >
              Profesjonell artistprofil på 60 sekunder. Lag en delbar side
              for deg eller bandet — og bli enklere å booke.
            </motion.p>

            <motion.ul
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              className="space-y-2 pt-1"
            >
              {[
                "Egen offentlig side med eget navn",
                "Bilder, bio og sosiale lenker",
                "Inviter bandmedlemmer",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2.5 text-sm text-foreground/85">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15 text-accent">
                    <Check className="h-3 w-3" />
                  </span>
                  {line}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col gap-2.5 lg:mt-0 lg:self-end lg:w-full lg:max-w-md lg:rounded-[2rem] lg:border lg:border-foreground/10 lg:bg-foreground/[0.05] lg:p-6 lg:backdrop-blur-2xl lg:shadow-[0_30px_80px_-30px_hsl(0_0%_0%/0.75)]"
          >
            <div className="hidden lg:block lg:space-y-1 lg:pb-2">
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Artist onboarding</p>
              <p className="text-sm text-foreground/65">Bygg offentlig profil og kom raskt videre til redigering.</p>
            </div>
            <CinematicCTA
              size="lg"
              onClick={() => setStep(hasSession ? "create" : "auth")}
              className="w-full"
            >
              Kom i gang
              <ArrowRight className="h-4 w-4" />
            </CinematicCTA>
            {!hasSession && (
              <CinematicCTA
                variant="ghost-light"
                size="md"
                onClick={() => {
                  setAuthMode("signin");
                  setStep("auth");
                }}
                className="w-full"
              >
                Jeg har allerede konto
              </CinematicCTA>
            )}
          </motion.div>
        </section>
      )}

      {step === "auth" && !hasSession && (
        <section className="flex-1 flex flex-col pt-6 lg:mx-auto lg:w-full lg:max-w-5xl lg:flex-row lg:items-center lg:gap-12 lg:pt-10">
            <div className="space-y-2 mb-6">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {authMode === "signup" ? "Opprett konto" : "Logg inn"}
            </h1>
            <p className="text-sm text-foreground/65">
                Bruk e-post for å komme i gang. Vi sender deg rett tilbake til artistflyten.
            </p>
          </div>

          <div className="space-y-2 mb-6 lg:mb-0 lg:max-w-sm">
            <div className="hidden lg:flex h-12 w-12 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.05] text-accent">
              <Mail className="h-5 w-5" />
            </div>
            <p className="hidden lg:block text-sm text-foreground/55">
              E-post først, så rett videre til oppsett av artistprofilen. Samme flyt, bare mer fokusert på større skjermer.
            </p>
          </div>

          <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.04] backdrop-blur-2xl p-5 space-y-4 shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.6)] lg:flex-1 lg:max-w-xl lg:p-7">
            {emailSent ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm space-y-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Mail className="h-4 w-4 text-accent" /> Sjekk e-posten din
                </div>
                <p className="text-foreground/70">
                  Vi sendte en bekreftelseslenke til {email}. Åpne mailappen din og trykk på lenken for å fullføre.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {emailApps.map((app) => (
                    <CinematicCTA asChild key={app.label} variant="glass" size="md" className="w-full">
                      <a href={app.href} target="_blank" rel="noreferrer">
                        {app.label}
                      </a>
                    </CinematicCTA>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground/70 text-xs uppercase tracking-wider">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl bg-foreground/[0.06] border-foreground/10 text-foreground placeholder:text-foreground/40 focus-visible:ring-accent/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-foreground/70 text-xs uppercase tracking-wider">Passord</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-foreground/[0.06] border-foreground/10 text-foreground placeholder:text-foreground/40 focus-visible:ring-accent/50"
                  />
                </div>
                {authError && (
                  <p className="text-sm text-destructive">{authError}</p>
                )}
                <CinematicCTA type="submit" className="w-full" disabled={authBusy}>
                  {authBusy ? "Vent litt…" : authMode === "signup" ? "Opprett konto" : "Logg inn"}
                </CinematicCTA>
                <button
                  type="button"
                  className="block w-full text-center text-sm text-foreground/55 hover:text-foreground underline-offset-4 hover:underline pt-1"
                  onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}
                >
                  {authMode === "signup"
                    ? "Har du allerede konto? Logg inn"
                    : "Ny her? Opprett konto"}
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep("intro")}
            className="mt-4 text-xs text-foreground/45 hover:text-foreground/70 self-center"
          >
            ← Tilbake
          </button>
        </section>
      )}

      {step === "create" && hasSession && (
        <section className="flex-1 flex flex-col pt-6 lg:mx-auto lg:w-full lg:max-w-5xl lg:flex-row lg:items-start lg:gap-12 lg:pt-10">
          <div className="space-y-2 mb-6">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Sett opp profilen
            </h1>
            <p className="text-sm text-foreground/65">
              Du kan endre alt senere – også navn og bilde.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5 flex-1 flex flex-col rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-5 backdrop-blur-2xl shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.6)] lg:max-w-2xl lg:p-7">
            <div className="space-y-2">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">Hva passer best?</Label>
              <RadioGroup
                value={kind}
                onValueChange={(v) => setKind(v as ArtistJoinKind)}
                className="grid grid-cols-2 gap-2.5"
              >
                {([
                  { value: "solo", label: "Solo", desc: "Eget navn", Icon: Music },
                  { value: "band", label: "Band", desc: "Flere medlemmer", Icon: Users },
                ] as const).map(({ value, label, desc, Icon }) => {
                  const active = kind === value;
                  return (
                    <label
                      key={value}
                      className={`relative cursor-pointer rounded-2xl border p-4 transition-all backdrop-blur-xl ${
                        active
                          ? "border-accent bg-accent/10 shadow-[0_0_0_4px_hsl(24_100%_55%/0.1)]"
                          : "border-foreground/10 bg-foreground/[0.04] hover:bg-foreground/[0.08]"
                      }`}
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <Icon className={`h-6 w-6 mb-2 ${active ? "text-accent" : "text-foreground/70"}`} />
                      <div className="text-sm font-medium text-foreground">{label}</div>
                      <div className="text-xs text-foreground/55">{desc}</div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-foreground/70 text-xs uppercase tracking-wider">
                {kind === "solo" ? "Artistnavn" : "Bandnavn"}
              </Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={kind === "solo" ? "F.eks. Ola Nordmann" : "F.eks. Nordlys"}
                className="h-12 rounded-xl bg-foreground/[0.06] border-foreground/10 text-foreground placeholder:text-foreground/40 focus-visible:ring-accent/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                Profilbilde <span className="normal-case text-foreground/40">(valgfritt)</span>
              </Label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] backdrop-blur-xl p-3">
                <InlineMediaPickerWithCrop
                  value={heroUrl}
                  imageSettings={heroSettings}
                  onChange={setHeroUrl}
                  onSettingsChange={setHeroSettings}
                  cropMode="hero"
                  placeholder="Last opp et bilde"
                />
              </div>
            </div>

            <div className="flex-1" />

            <CinematicCTA type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Oppretter…" : "Opprett profil"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </CinematicCTA>
          </form>
        </section>
      )}

      {step === "done" && result && (
        <section className="flex-1 flex flex-col items-center text-center pt-8 lg:mx-auto lg:w-full lg:max-w-4xl lg:pt-10">
          {/* Hero avatar with glow ring */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-6"
          >
            <div className="absolute inset-0 rounded-full bg-accent/40 blur-2xl animate-pulse" />
            <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-accent/60 shadow-[0_0_40px_hsl(24_100%_55%/0.5)]">
              {heroUrl ? (
                <CroppedImage
                  src={heroUrl}
                  alt={name}
                  imageSettings={heroSettings}
                  aspect="hero"
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-foreground/10 grid place-items-center">
                  <Music className="h-10 w-10 text-foreground/40" />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-2 mb-2"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-accent">
              {resumed ? "Velkommen tilbake" : "Profilen er klar"}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {name}
            </h1>
            <a
              href={publicProjectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-foreground/50 hover:text-foreground/80 break-all"
            >
              {publicProjectUrl.replace(/^https?:\/\//, "")}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-sm text-foreground/65 max-w-xs mb-8"
          >
            {resumed
              ? "Fortsett der du slapp."
              : "Neste steg: legg til bio, sosiale lenker og bilder for å gjøre profilen klar for booking."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full space-y-2.5 mt-auto lg:max-w-md"
          >
            <CinematicCTA asChild className="w-full">
              <Link to={`/dashboard/entities/${result.entityId}/edit`}>
                <Pencil className="h-4 w-4" />
                {kind === "band" ? "Fullfør bandprofil" : "Fullfør artistprofil"}
              </Link>
            </CinematicCTA>

            <div className="grid grid-cols-2 gap-2">
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
              <CinematicCTA asChild variant="glass" size="md">
                <a href={publicProjectUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Se siden
                </a>
              </CinematicCTA>
            </div>

            {kind === "band" && (
              <CinematicCTA asChild variant="glass" size="md" className="w-full">
                <Link to={`/dashboard/entities/${result.entityId}/invite`}>
                  <Users className="h-4 w-4" />
                  Inviter bandmedlemmer
                </Link>
              </CinematicCTA>
            )}

            <button
              type="button"
              className="block w-full text-center text-xs text-foreground/45 hover:text-foreground/70 pt-2"
              onClick={() => navigate("/dashboard?from=onboarding")}
            >
              Gå til dashbordet
            </button>
          </motion.div>
        </section>
      )}
    </OnboardingShell>
  );
}
