import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowDown,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Layers3,
  Music2,
  Ticket,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { VimeoVideo } from "@/components/ui/VimeoVideo";
import { useToast } from "@/hooks/use-toast";
import { useCreateAccessRequest } from "@/hooks/useAccessRequests";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPageCredits } from "@/hooks/usePublicPageCredits";
import { useResolvedCredits } from "@/hooks/useResolvedCredits";
import { TeamCreditsSection } from "@/components/ui/TeamCreditsSection";
import giggenLogo from "@/assets/giggen-logo-final.png";

const FESTIVAL_CASE_URL = "/festival/case/giggen-festival-for-en-kveld";
const DEMO_GIGGEN_SLUG = "giggen-festival-for-en-kveld";

/* ─── Scroll-reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Flow step for solution section ─── */
const FLOW_STEPS = [
  { icon: Calendar, title: "Event", desc: "Der alt starter – sted, tid, publisering." },
  { icon: Music2, title: "Lineup", desc: "Hvem som er på – og når." },
  { icon: Layers3, title: "Program", desc: "Hva som faktisk skjer – kjøreplan for crew og artister." },
  { icon: Ticket, title: "Billetter", desc: "Hvem som slipper inn – salg, QR og innsjekk." },
];

export default function LandingPage() {
  const { toast } = useToast();
  const createRequest = useCreateAccessRequest();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const festivalCaseUrl = FESTIVAL_CASE_URL;

  // CMS content
  const { data: landing } = useLandingPageContent();

  // Proof stats from demo festival
  const { data: giggenShell } = useFestivalShell(DEMO_GIGGEN_SLUG);
  const { data: giggenDetails } = useFestivalDetails(giggenShell?.id);

  const artistCount = giggenDetails?.allArtistsWithEventSlug?.length ?? 0;

  const eventCount = useMemo(() => {
    return (giggenDetails?.festivalEvents ?? []).filter((fe: any) => fe?.event?.status === "published").length;
  }, [giggenDetails]);

  const { data: checkedInCount } = useQuery({
    queryKey: ["landing-proof-checked-in", landing?.proof_enabled, landing?.proof_show_attendees, giggenShell?.slug],
    enabled: !!landing?.proof_enabled && !!landing?.proof_show_attendees && !!giggenShell?.slug,
    queryFn: async () => {
      const { data: te, error } = await supabase
        .from("ticket_events")
        .select("attendance_count, boilerroom_attendance_count")
        .eq("slug", DEMO_GIGGEN_SLUG)
        .maybeSingle();
      if (error) throw error;
      if (!te) return null;
      return (te.attendance_count ?? 0) + (te.boilerroom_attendance_count ?? 0);
    },
  });

  const heroTitle = landing?.hero_title || "Lag konserter, uten kaos";
  const heroSubtitle = landing?.hero_subtitle || "GIGGEN samler booking, program og billetter på ett sted – laget for artister og arrangører som vil få ting til å skje.";
  const heroCtaText = landing?.hero_cta_text || "Få hjelp til å sette opp ditt event";
  const showAttendees = landing?.proof_show_attendees && typeof checkedInCount === "number" && checkedInCount > 0;

  // Credits
  const { data: landingCredits = [] } = usePublicPageCredits("landing");
  const { data: resolvedCredits = [] } = useResolvedCredits(landingCredits);
  const creditMembers = useMemo(() =>
    resolvedCredits.map((r) => ({
      persona: r.persona,
      entity: r.entity,
      role_label: r.role_label,
    })), [resolvedCredits]);

  const submitQuickAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Mangler informasjon", description: "Fyll inn navn og e-post.", variant: "destructive" });
      return;
    }
    try {
      await createRequest.mutateAsync({ name: name.trim(), email: email.trim(), role_type: "organizer", message: "Sendt fra landingssiden" });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Feil", description: err?.message || "Kunne ikke sende forespørsel", variant: "destructive" });
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-background text-foreground">
        <StaticLogo />

        {/* ══════════════ 1 · HERO ══════════════ */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-5 pt-24 pb-12 overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center animate-fade-in">
            <img src={giggenLogo} alt="GIGGEN" className="h-24 md:h-40 lg:h-52 mx-auto mb-8" />

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-4">
              Backstage for live-musikkbyggere
            </p>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {heroTitle}
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200">
                <a href="#tilgang">
                  {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 hover:scale-105 transition-transform duration-200">
                <a href="#slik-fungerer-det">Se hvordan det funker</a>
              </Button>
            </div>

            <div className="mt-2 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">Utforsk GIGGEN</p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
                <Link to="/om-giggen" className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Hva er GIGGEN</Link>
                <Link to={festivalCaseUrl} className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Se case</Link>
                <Link to="/utforsk" className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Utforsk artister & events</Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Lukket test – manuell onboarding
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Billetter + scan i døra
              </span>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
            <ArrowDown className="w-5 h-5 text-muted-foreground/40" />
          </div>
        </section>

        {/* ══════════════ 2 · VIDEO ══════════════ */}
        {landing?.hero_video_url && (
          <section className="py-16 md:py-24 px-5">
            <Reveal>
              <div className="max-w-3xl mx-auto text-center mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">
                  Se hvordan vi bygget et ekte event med GIGGEN
                </p>
                <h2 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Fra planlegging til gjennomført kveld
                </h2>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl hover:shadow-accent/10 transition-shadow duration-500 group">
                <VimeoVideo url={landing.hero_video_url} background className="group-hover:scale-[1.01] transition-transform duration-700" />
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="max-w-3xl mx-auto text-center mt-5">
                <p className="text-sm text-muted-foreground mb-3">
                  Fra planlegging til gjennomført kveld – alt samlet i ett system.
                </p>
                <Link to={festivalCaseUrl} className="inline-flex items-center gap-1 text-sm text-accent hover:underline underline-offset-4 font-semibold">
                  Se full case <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>
          </section>
        )}

        {/* ══════════════ 3 · PROBLEMET ══════════════ */}
        <section id="problemet" className="py-20 md:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Problemet</p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Et event er ikke én oppgave – det er 20 små systemer samtidig.
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-12 items-start relative">
              {/* Visual connection line (desktop) */}
              <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-accent/20 via-accent/10 to-transparent" />

              <Reveal delay={100}>
                <div>
                  <ul className="space-y-4 mb-6">
                    {["Artister og lineup", "Tider og kjøreplan", "Billetter og innsjekk", "Oversikt for crew"].map((t, i) => (
                      <li key={t} className="flex items-center gap-3 text-sm text-foreground/80" style={{ animationDelay: `${i * 80}ms` }}>
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Alt ligger ofte i ulike verktøy – og må holdes oppdatert manuelt.
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Du jobber i flere systemer – samtidig som alt egentlig er ett show.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={350}>
                <div className="rounded-2xl border border-border/60 bg-card/90 p-7 shadow-lg">
                  <h3 className="font-bold text-foreground text-xl mb-5">Hvorfor blir det fort kaos?</h3>
                  <ul className="space-y-3">
                    {[
                      "Du oppdaterer lineup flere steder",
                      "Endringer når ikke alle",
                      "Folk vet ikke når de skal på",
                      "Billetter og innsjekk lever sitt eget liv",
                      "Oversikten forsvinner når tempoet øker",
                    ].map((t) => (
                      <li key={t} className="text-sm text-muted-foreground leading-relaxed">{t}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-bold text-foreground mt-5">Det er her kaoset skjer.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════ 4 · LØSNINGEN ══════════════ */}
        <section className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Løsningen</p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Alt henger sammen – fra første idé til ferdig konsert.
              </h2>
              <p className="text-muted-foreground text-base mb-12 leading-relaxed max-w-2xl">
                Du jobber ett sted. Resten oppdaterer seg selv.
              </p>
            </Reveal>

            {/* Visual flow: Event → Lineup → Program → Billetter */}
            <Reveal delay={150}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 mb-14">
                {FLOW_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isHighlighted = hoveredStep !== null && (hoveredStep === i || hoveredStep === i - 1);
                  return (
                    <div key={step.title} className="flex items-center">
                      <div
                        className={`flex-1 rounded-xl border p-5 text-center transition-all duration-300 cursor-default ${
                          isHighlighted || hoveredStep === i
                            ? "border-accent/60 bg-accent/10 shadow-md shadow-accent/10 scale-[1.03]"
                            : "border-border/60 bg-card/60 hover:border-accent/30"
                        }`}
                        onMouseEnter={() => setHoveredStep(i)}
                        onMouseLeave={() => setHoveredStep(null)}
                      >
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 text-accent mb-3">
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                      {i < FLOW_STEPS.length - 1 && (
                        <ChevronRight className={`hidden md:block w-5 h-5 mx-1 shrink-0 transition-colors duration-300 ${
                          hoveredStep !== null && (hoveredStep === i) ? "text-accent" : "text-border"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Reveal>

            {/* Sync story */}
            <Reveal delay={300}>
              <div className="max-w-lg mx-auto">
                <ul className="space-y-3">
                  {[
                    "Legg til artist → vises i lineup",
                    "Sett tid → oppdaterer program",
                    "Selg billett → vises i innsjekk",
                    "Endre noe → alle ser det med én gang",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-foreground mt-6 text-center">
                  Alt er synkronisert – hele tiden.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════ 5 · HVA BETYR DET FOR DEG ══════════════ */}
        <section id="for-hvem" className="py-20 md:py-28 px-5">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">For deg som arrangerer</p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Hva betyr det for deg?
              </h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                "Mindre kaos i chat og regneark",
                "Slutt på dobbeltjobbing",
                "Endringer skjer uten stress",
                "Alle vet hva som skjer – når det skjer",
              ].map((t, i) => (
                <Reveal key={t} delay={i * 100}>
                  <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/40 p-5 hover:border-accent/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                    <span className="text-sm text-foreground/90 font-medium">{t}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={450}>
              <p className="text-sm font-semibold text-foreground mt-8 text-center">GIGGEN er ett system for hele showet.</p>
            </Reveal>
          </div>
        </section>

        {/* ══════════════ 6 · SLIK FUNGERER DET ══════════════ */}
        <section id="slik-fungerer-det" className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3 text-center">Slik fungerer det</p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-14 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Fra idé til konsert
              </h2>
            </Reveal>

            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />

              <div className="grid md:grid-cols-3 gap-12 md:gap-8">
                {[
                  { step: "1", title: "Opprett event", desc: "Legg inn sted, tid og beskrivelse." },
                  { step: "2", title: "Bygg lineup", desc: "Legg til artister, set times og program." },
                  { step: "3", title: "Publiser og selg", desc: "Del siden, selg billetter, scan i døra." },
                ].map((s, i) => (
                  <Reveal key={s.step} delay={i * 150}>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent text-accent-foreground font-black text-lg relative z-10 shadow-lg shadow-accent/20">
                          {s.step}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ 7 · CASE ══════════════ */}
        {(landing?.section_case_enabled !== false) && (
          <section className="py-20 md:py-28 px-5">
            <div className="max-w-4xl mx-auto">
              <Reveal>
                <div className="text-center mb-10">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Case</p>
                  <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {landing?.section_case_title || "Et ekte event – bygget og drevet med GIGGEN"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
                    {landing?.section_case_subtitle || "Se hvordan alt henger sammen i praksis."}
                  </p>
                </div>
              </Reveal>

              {/* Stats */}
              <Reveal delay={150}>
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-10">
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-foreground">120+</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">tilskuere</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-foreground">30+</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">musikere</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-foreground">3</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">scener</p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={300}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild variant="outline" size="lg" className="rounded-full px-8 hover:scale-105 transition-transform">
                    <Link to={festivalCaseUrl}>Se festivalen</Link>
                  </Button>
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200">
                    <a href="#tilgang">
                      {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ══════════════ 8 · ACCESS + FORM ══════════════ */}
        <section id="tilgang" className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
            <Reveal>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Tilgang</p>
                <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Lukket test
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  GIGGEN er i lukket test.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Vi onboarder et begrenset antall arrangører personlig – slik at alt funker fra dag én.
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200">
                    <Link to="/request-access">
                      {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                    <Link to={festivalCaseUrl}>Se festivalen</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Du får svar innen kort tid.</p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-foreground">Rask forespørsel</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Bare navn + e-post. Vi tar resten på mail.
                </p>

                {submitted ? (
                  <div className="text-center py-6">
                    <p className="font-semibold text-foreground mb-1">Sendt.</p>
                    <p className="text-sm text-muted-foreground">Vi tar kontakt så snart vi kan.</p>
                  </div>
                ) : (
                  <form onSubmit={submitQuickAccess} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="landing-name">Navn</Label>
                      <Input id="landing-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Ditt fulle navn" required className="focus:ring-accent/30 transition-shadow" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="landing-email">E-post</Label>
                      <Input id="landing-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="din@epost.no" required className="focus:ring-accent/30 transition-shadow" />
                    </div>
                    <Button type="submit" disabled={createRequest.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold hover:shadow-lg hover:shadow-accent/20 transition-all duration-200">
                      {createRequest.isPending ? "Sender…" : heroCtaText}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════ 9 · FINAL CTA ══════════════ */}
        <section className="py-24 md:py-32 px-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent pointer-events-none" />
          <Reveal>
            <div className="max-w-3xl mx-auto text-center relative z-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Klar for å teste?</p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Vil du teste GIGGEN?
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200">
                  <a href="#tilgang">
                    {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8 hover:scale-105 transition-transform">
                  <Link to={festivalCaseUrl}>Se festivalen</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════ CREDITS ══════════════ */}
        {creditMembers.length > 0 && (
          <TeamCreditsSection title="Credits" members={creditMembers} />
        )}

        {/* ══════════════ FOOTER ══════════════ */}
        <footer className="border-t border-border/40 py-8 px-5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} GIGGEN</span>
            <div className="flex items-center gap-4">
              <Link to="/personvern" className="hover:text-accent transition-colors">Personvern</Link>
              <Link to="/vilkar" className="hover:text-accent transition-colors">Vilkår</Link>
              <Link to="/dashboard" className="hover:text-accent transition-colors">Backstage</Link>
            </div>
          </div>
        </footer>
      </div>
    </PageLayout>
  );
}
