import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Layers3,
  Music2,
  Ticket,
  Wand2,
  FolderOpen,
  Users,
  Mic2,
  MapPin,
  Star } from
"lucide-react";
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

function Section({
  id,
  eyebrow,
  title,
  children





}: {id?: string;eyebrow?: string;title?: string;children: React.ReactNode;}) {
  return (
    <section id={id} className="py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        {eyebrow &&
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            {eyebrow}
          </p>
        }
        {title &&
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h2>
        }
        <div>{children}</div>
      </div>
    </section>);

}

function Card({
  icon,
  title,
  description




}: {icon: React.ReactNode;title: string;description: string;}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 hover:border-accent/40 transition-colors">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-accent/10 p-2.5 text-accent shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>);

}

function StepCard({
  step,
  title,
  description,
  isLast
}: {step: string;title: string;description: string;isLast?: boolean;}) {
  return (
    <div className="text-center relative">
      <div className="flex items-center justify-center mb-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-black text-sm relative z-10">
          {step}
        </span>
        {!isLast && (
          <div className="hidden md:block absolute left-[calc(50%+1.25rem)] top-5 -translate-y-1/2 h-px bg-border" style={{ width: 'calc(100% - 1.25rem)' }} />
        )}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>);

}

export default function LandingPage() {
  const { toast } = useToast();
  const createRequest = useCreateAccessRequest();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
  const heroCtaText = landing?.hero_cta_text || "Kom i gang med ditt event nå";
  const showProofBlock = landing?.proof_enabled && artistCount > 0 && eventCount > 0;
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
      toast({
        title: "Mangler informasjon",
        description: "Fyll inn navn og e-post.",
        variant: "destructive"
      });
      return;
    }
    try {
      await createRequest.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role_type: "organizer",
        message: "Sendt fra landingssiden"
      });
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Feil",
        description: err?.message || "Kunne ikke sende forespørsel",
        variant: "destructive"
      });
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-background text-foreground">
        <StaticLogo />

        {/* ══════════════ HERO ══════════════ */}
        <section className="relative min-h-[85vh] flex items-center justify-center px-5 pt-24 pb-16 overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <img
              src={giggenLogo}
              alt="GIGGEN"
              className="h-24 md:h-40 lg:h-52 mx-auto mb-8" />
            

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-4">
              Backstage for live-musikkbyggere
            </p>

            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {heroTitle}
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8">
                <a href="#tilgang">
                  {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <Link to={festivalCaseUrl}>Se festivalen</Link>
              </Button>
            </div>

            <div className="mt-4 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">Utforsk GIGGEN</p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
                <Link to="/om-giggen" className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Hva er GIGGEN</Link>
                <Link to={festivalCaseUrl} className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Se case</Link>
                <Link to="/utforsk" className="text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">Utforsk artister & events</Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                Lukket test – manuell onboarding
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                Billetter + scan i døra
              </span>
            </div>
          </div>
        </section>

        {/* ══════════════ VIDEO CASE (under hero) ══════════════ */}
        {landing?.hero_video_url && (
          <section className="py-20 md:py-28 px-5">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">
                Se hvordan vi gjorde det
              </p>
              <h2
                className="text-xl md:text-2xl font-bold text-foreground mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Fra planlegging til gjennomført kveld
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Dette er et ekte case bygget i GIGGEN. Se hvordan alt henger sammen når event, lineup, billetter og innsjekk ligger i samme system.
              </p>
              <VimeoVideo url={landing.hero_video_url} background className="shadow-2xl" />
            </div>
          </section>
        )}

        {/* ══════════════ WHAT IS AN EVENT ══════════════ */}
        <Section id="hva" eyebrow="Problemet" title="Et event er ikke én oppgave – det er 20 små systemer samtidig.">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <ul className="space-y-3 mb-6">
                {["Artister og lineup", "Tider og kjøreplan", "Billetter og innsjekk", "Info til publikum", "Oversikt for crew"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Når dette ligger i ulike verktøy, må alt oppdateres manuelt.
              </p>
              <p className="text-sm font-semibold text-foreground">
                Du jobber i flere systemer – samtidig som alt egentlig er ett show.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-6">
              <h3 className="font-bold text-foreground text-lg mb-4">Hvorfor blir det fort kaos?</h3>
              <ul className="space-y-3">
                {[
                  "Du oppdaterer lineup flere steder",
                  "Endringer når ikke alle",
                  "Folk vet ikke når de skal på",
                  "Billett og innsjekk lever sitt eget liv",
                  "Oversikten forsvinner når tempoet øker",
                ].map((t) => (
                  <li key={t} className="text-sm text-muted-foreground leading-relaxed">{t}</li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-foreground mt-4">Det er her kaoset oppstår.</p>
            </div>
          </div>
        </Section>

        {/* ══════════════ WHAT IS GIGGEN ══════════════ */}
        <section className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Løsningen</p>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Alt henger sammen – fra første idé til ferdig konsert.
            </h2>
            <p className="text-muted-foreground text-base mb-10 leading-relaxed max-w-2xl">
              Du jobber ett sted. Resten oppdaterer seg selv.
            </p>
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Left: Flow, not features */}
              <div className="space-y-6">
                {[
                  { icon: <Calendar className="w-5 h-5 text-accent" />, title: "Event", desc: "Der alt starter – sted, tid, publisering." },
                  { icon: <Music2 className="w-5 h-5 text-accent" />, title: "Lineup", desc: "Hvem som er på – og når." },
                  { icon: <Layers3 className="w-5 h-5 text-accent" />, title: "Program", desc: "Hva som faktisk skjer – kjøreplan for crew og artister." },
                  { icon: <Ticket className="w-5 h-5 text-accent" />, title: "Billetter", desc: "Hvem som slipper inn – salg, QR og innsjekk." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Sync story */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Alt henger sammen – i sanntid.</p>
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
                <p className="text-sm font-semibold text-foreground mt-6">
                  Alt er synkronisert – hele tiden.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ VIDEO + CONTROL SIDE BY SIDE ══════════════ */}
        {landing?.hero_video_url && (
          <section className="py-20 md:py-28 px-5">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
              {/* Left: Video */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">
                  Se hvordan vi gjorde det
                </p>
                <h2
                  className="text-xl md:text-2xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Fra planlegging til gjennomført kveld
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Dette er et ekte case bygget i GIGGEN. Se hvordan alt henger sammen når event, lineup, billetter og innsjekk ligger i samme system.
                </p>
                <VimeoVideo url={landing.hero_video_url} background className="shadow-2xl" />
              </div>

              {/* Right: Alt i ett */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Alt i ett</p>
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Dette hadde vi full kontroll på – i én løsning
                </h2>
                <p className="text-muted-foreground text-sm mb-6 italic">Alt oppdatert i sanntid – uten Excel, uten kaos.</p>
                <ul className="space-y-3">
                  {[
                    "Innsjekk i døra (live)",
                    "Billettsalg + mobil scanning",
                    "Alle på og bak scenen",
                    "Live kjøreplan",
                    "Lineup og info samlet",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════ PROOF STATS ══════════════ */}
        {showProofBlock && (
          <section className="py-12 px-5">
            <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {showAttendees && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Kommet</p>
                  <p className="text-2xl md:text-3xl font-black text-foreground">{checkedInCount}+</p>
                  <p className="text-xs text-muted-foreground">gjester</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Artister</p>
                <p className="text-2xl md:text-3xl font-black text-foreground">{artistCount}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Scener</p>
                <p className="text-2xl md:text-3xl font-black text-foreground">{eventCount}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Kveld</p>
                <p className="text-2xl md:text-3xl font-black text-foreground">1</p>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════ HOW IT WORKS ══════════════ */}
        <Section id="hvordan" eyebrow="Slik fungerer det" title="Fra idé til konsert">
          <div className="grid md:grid-cols-3 gap-10">
            <StepCard step="1" title="Opprett event" description="Legg inn sted, tid og beskrivelse." />
            <StepCard step="2" title="Bygg lineup" description="Legg til artister, set times og program." />
            <StepCard step="3" title="Publiser og selg" description="Del siden, selg billetter, scan i døra." isLast />
          </div>
        </Section>

        {/* ══════════════ REAL CASE ══════════════ */}
        {(landing?.section_case_enabled !== false) && (
        <section className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Case</p>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {landing?.section_case_title || "GIGGEN Festival"}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-2 max-w-xl mx-auto">
              {landing?.section_case_subtitle || "Dette er et ekte event – bygget og drevet med GIGGEN."}
            </p>
            <p className="text-sm text-accent mb-8">
              Se hvordan alt henger sammen i praksis →
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <Link to={festivalCaseUrl}>Se festivalen</Link>
              </Button>
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8">
                <a href="#tilgang">
                  {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </section>
        )}

        {/* ══════════════ FOR ARRANGØREN ══════════════ */}
        <Section id="for-hvem" eyebrow="For deg som arrangerer" title="Hva betyr det for deg?">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <ul className="space-y-3">
                {[
                  "Mindre kaos i chat og regneark",
                  "Slutt på dobbeltjobbing",
                  "Endringer skjer uten stress",
                  "Alle vet hva som skjer – når det skjer",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-foreground mt-6">GIGGEN er ett system for hele showet.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-6">
              <h3 className="font-bold text-foreground text-lg mb-4">Lineup er hvem som er på – og når.</h3>
              <ul className="space-y-3">
                {["Artister", "Prosjekter", "Tidspunkt", "Scene"].map((t) => (
                  <li key={t} className="text-sm text-muted-foreground">{t}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mt-4">Endrer du ett sted, oppdateres det overalt.</p>
            </div>
          </div>
        </Section>

        {/* ══════════════ ACCESS + FORM ══════════════ */}
        <section id="tilgang" className="py-20 md:py-28 px-5 bg-card/40">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
                Tilgang
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Lukket test
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                GIGGEN er foreløpig i lukket test. Vi inviterer et begrenset antall
                arrangører og artister for å teste plattformen tett.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8">
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

            <div className="rounded-xl border border-border/60 bg-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Wand2 className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-foreground">Rask forespørsel</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Bare navn + e-post. Vi tar resten på mail.
              </p>

              {submitted ?
              <div className="text-center py-6">
                  <p className="font-semibold text-foreground mb-1">Sendt.</p>
                  <p className="text-sm text-muted-foreground">Vi tar kontakt så snart vi kan.</p>
                </div> :

              <form onSubmit={submitQuickAccess} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="landing-name">Navn</Label>
                    <Input
                    id="landing-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Ditt fulle navn"
                    required />
                  
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="landing-email">E-post</Label>
                    <Input
                    id="landing-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    placeholder="din@epost.no"
                    required />
                  
                  </div>
                  <Button
                  type="submit"
                  disabled={createRequest.isPending}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                  
                    {createRequest.isPending ? "Sender…" : heroCtaText}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              }
            </div>
          </div>
        </section>

        {/* ══════════════ FINAL CTA ══════════════ */}
        <section className="py-24 md:py-32 px-5">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
              Klar for å teste?
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Vil du teste GIGGEN?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-8">
                <a href="#tilgang">
                  {heroCtaText} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <Link to={festivalCaseUrl}>Se festivalen</Link>
              </Button>
            </div>
          </div>
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
    </PageLayout>);

}