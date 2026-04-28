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
  // Existing artist project for the logged-in user (if any). Used to render a
  // "Welcome back" shortcut on the intro screen instead of force-jumping.
  const [existingProject, setExistingProject] = useState<ExistingArtistProject | null>(null);

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
        // Look up an existing artist project so we can offer a shortcut on the
        // intro screen — but never force-jump. Instagram / ad traffic should
        // always see the full intro first.
        setResolving(true);
        try {
          const existing = await findExistingArtistProject();
          if (cancelled) return;
          setExistingProject(existing);
        } finally {
          if (!cancelled) setResolving(false);
        }
      } else {
        setExistingProject(null);
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
  /** Jump from the intro shortcut into the existing-profile success panel. */
  const handleResumeExisting = () => {
    if (!existingProject) return;
    setKind(existingProject.type);
    setName(existingProject.name);
    setHeroUrl(existingProject.heroImageUrl ?? "");
    setResult({
      entityId: existingProject.id,
      entitySlug: existingProject.slug,
      personaId: "",
    });
    setResumed(true);
    setStep("done");
  };


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
        <section className="relative flex flex-1 flex-col justify-end pb-2 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,24rem)] lg:items-center lg:gap-14 lg:pb-8 lg:pt-4">
          {!hasSession && (
            <CinematicCTA
              variant="ghost-light"
              size="md"
              onClick={() => {
                setAuthMode("signin");
                setStep("auth");
              }}
              className="absolute right-0 -top-2 z-10 h-10 px-0 text-sm lg:h-10 lg:-top-6"
            >
              Jeg har allerede konto
            </CinematicCTA>
          )}

          {hasSession && existingProject && (
            <motion.button
              type="button"
              onClick={handleResumeExisting}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="group absolute right-0 top-0 z-10 flex items-center gap-2.5 rounded-full border border-accent/40 bg-background/40 px-3 py-1.5 text-sm text-foreground backdrop-blur-xl shadow-[0_0_24px_hsl(24_100%_55%/0.18)] hover:bg-background/60 hover:border-accent/70 transition-all lg:px-4 lg:py-2"
            >
              <span className="relative h-7 w-7 overflow-hidden rounded-full border border-accent/40 bg-foreground/10">
                {existingProject.heroImageUrl ? (
                  <img
                    src={existingProject.heroImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-accent">
                    <Music className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/55">
                  Logget inn som
                </span>
                <span className="text-sm font-medium text-foreground">
                  {existingProject.name}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          )}

          {hasSession && !existingProject && (
            <CinematicCTA
              variant="ghost-light"
              size="md"
              onClick={() => setStep("create")}
              className="absolute right-0 -top-2 z-10 h-10 px-0 text-sm lg:h-10 lg:-top-6"
            >
              Fullfør profilen din
            </CinematicCTA>
          )}

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
            className="relative z-10 space-y-5 pb-2 lg:max-w-none lg:self-center lg:pb-0 lg:space-y-7"
          >
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="font-display text-[2.5rem] leading-[1.02] sm:text-5xl lg:text-[4.25rem] xl:text-[5rem] lg:leading-[0.98] font-semibold tracking-tight text-foreground"
            >
              Ikke bare post<br className="hidden lg:block" /> på Instagram.<br />
              <span className="text-accent">Bygg en base.</span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="max-w-sm text-base leading-relaxed text-foreground/80 lg:max-w-lg lg:text-lg"
            >
              Profesjonell artistprofil på 60 sekunder. Lag en delbar side
              for deg eller bandet — og bli enklere å booke.
            </motion.p>

            <motion.ul
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              className="space-y-2 pt-2 lg:max-w-lg lg:hidden"
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

            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="hidden lg:grid lg:grid-cols-3 lg:gap-5 lg:pt-4 lg:max-w-xl"
            >
              {[
                { value: '60 sek', label: 'til første profil' },
                { value: 'Delbar', label: 'offentlig artistside' },
                { value: 'Bandklar', label: 'inviter medlemmer senere' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border-l-2 border-accent/40 pl-4"
                >
                  <div className="text-xl font-semibold text-foreground tracking-tight">{item.value}</div>
                  <div className="mt-1 text-xs text-foreground/60 leading-snug">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 flex flex-col gap-2.5 lg:mt-0 lg:self-center lg:w-full lg:max-w-sm lg:rounded-3xl lg:border lg:border-foreground/10 lg:bg-background/40 lg:backdrop-blur-2xl lg:p-6 lg:shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.6)]"
          >
            <div className="hidden lg:block lg:space-y-1.5 lg:pb-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-accent/80">Artist onboarding</p>
              <p className="font-display text-xl font-semibold tracking-tight text-foreground leading-tight">Start din artistside</p>
              <p className="text-sm text-foreground/65 leading-relaxed">Profil, bilder og lenker — klart på under et minutt.</p>
            </div>
            <CinematicCTA
              size="lg"
              onClick={() => {
                if (hasSession && existingProject) {
                  handleResumeExisting();
                } else if (hasSession) {
                  setStep("create");
                } else {
                  setStep("auth");
                }
              }}
              className="w-full lg:h-13 lg:text-base"
            >
              Kom i gang
              <ArrowRight className="h-4 w-4" />
            </CinematicCTA>
            <CinematicCTA asChild variant="glass" size="md" className="w-full lg:mt-1">
              <Link to="/utforsk">
                <ExternalLink className="h-4 w-4" />
                Utforsk Giggen nå
              </Link>
            </CinematicCTA>
            <p className="hidden lg:block pt-1 text-xs text-foreground/50 leading-relaxed">
              Se profiler, prosjekter og uttrykk som allerede lever på Giggen.
            </p>
          </motion.div>
        </section>
      )}

      {step === "auth" && !hasSession && (
        <section className="flex min-h-0 flex-1 flex-col justify-center pt-4 lg:mx-auto lg:w-full lg:max-w-md lg:items-stretch lg:pt-6">
          <div className="mb-5 space-y-2 lg:mb-7 lg:text-center">
            <div className="hidden lg:flex lg:justify-center lg:pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <Mail className="h-5 w-5" />
              </div>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
              {authMode === "signup" ? "Opprett konto" : "Logg inn"}
            </h1>
            <p className="text-sm text-foreground/65 lg:text-base">
              Bruk e-post for å komme i gang. Vi sender deg rett tilbake til artistflyten.
            </p>
          </div>

          <div className="space-y-4 lg:rounded-3xl lg:border lg:border-foreground/10 lg:bg-background/35 lg:backdrop-blur-2xl lg:p-7 lg:shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.6)]">
            {emailSent ? (
              <div className="space-y-3 text-sm">
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
                <CinematicCTA type="submit" className="w-full lg:h-13" disabled={authBusy}>
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
            className="mt-5 text-xs text-foreground/45 hover:text-foreground/70 self-center"
          >
            ← Tilbake
          </button>
        </section>
      )}

      {step === "create" && hasSession && (
        <section className="flex min-h-0 flex-1 flex-col justify-center pt-4 lg:mx-auto lg:w-full lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(28rem,32rem)] lg:items-center lg:gap-16 lg:pt-2">
          <div className="mb-4 space-y-3 lg:mb-0">
            <p className="hidden lg:block text-[11px] uppercase tracking-[0.28em] text-accent/80">Steg 2 av 3</p>
            <h1 className="font-display text-3xl lg:text-5xl xl:text-6xl font-semibold tracking-tight lg:leading-[1.02]">
              Sett opp profilen
            </h1>
            <p className="text-sm text-foreground/65 lg:text-lg lg:leading-relaxed">
              Du kan endre alt senere – også navn og bilde.
            </p>
            <p className="hidden lg:block text-sm text-foreground/50 lg:pt-2 lg:max-w-sm">
              Hold det enkelt nå. Navn og bilde er nok for å komme live og begynne å dele.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-1 flex-col justify-center space-y-4 lg:rounded-3xl lg:border lg:border-foreground/10 lg:bg-background/35 lg:backdrop-blur-2xl lg:p-7 lg:shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.6)]">
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

            <CinematicCTA type="submit" className="w-full lg:h-14 lg:text-base" disabled={submitting}>
              {submitting ? "Oppretter…" : "Opprett profil"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </CinematicCTA>
          </form>
        </section>
      )}

      {step === "done" && result && (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center text-center pt-4 lg:mx-auto lg:w-full lg:max-w-3xl lg:pt-2">
          {/* Hero avatar with glow ring */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-5 lg:mb-7"
          >
            <div className="absolute inset-0 rounded-full bg-accent/40 blur-2xl animate-pulse" />
            <div className="relative h-32 w-32 lg:h-44 lg:w-44 rounded-full overflow-hidden border-2 border-accent/60 shadow-[0_0_40px_hsl(24_100%_55%/0.5)] lg:shadow-[0_0_60px_hsl(24_100%_55%/0.55)]">
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
                  <Music className="h-10 w-10 lg:h-14 lg:w-14 text-foreground/40" />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-2 space-y-2 lg:space-y-3"
          >
            <div className="text-xs lg:text-[11px] uppercase tracking-[0.28em] text-accent">
              {resumed ? "Velkommen tilbake" : "Profilen er klar"}
            </div>
            <h1 className="font-display text-3xl lg:text-6xl font-semibold tracking-tight lg:leading-[1.02]">
              {name}
            </h1>
            <a
              href={publicProjectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs lg:text-sm text-foreground/50 hover:text-accent break-all transition-colors"
            >
              {publicProjectUrl.replace(/^https?:\/\//, "")}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mb-6 lg:mb-8 max-w-xs lg:max-w-md text-sm lg:text-base text-foreground/65 lg:leading-relaxed"
          >
            {resumed
              ? "Fortsett der du slapp."
              : "Neste steg: legg til bio, sosiale lenker og bilder for å gjøre profilen klar for booking."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full space-y-2.5 mt-auto lg:max-w-lg lg:mt-0"
          >
            <CinematicCTA asChild className="w-full lg:h-14 lg:text-base">
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
