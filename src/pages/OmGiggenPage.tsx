import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Instagram, Youtube, Facebook, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import giggenLogo from "@/assets/giggen-logo-outline.png";
import bgOrange from "@/assets/om-giggen-bg-orange.jpeg";
import bgDark from "@/assets/om-giggen-bg-dark.jpeg";
import bgWarm from "@/assets/om-giggen-bg-warm.jpeg";
import bgOrangeDesktop from "@/assets/om-giggen-bg-orange-desktop.jpg";
import bgDarkDesktop from "@/assets/om-giggen-bg-dark-desktop.jpg";
import bgWarmDesktop from "@/assets/om-giggen-bg-warm-desktop.jpg";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamCreditsSection } from "@/components/ui/TeamCreditsSection";

const FESTIVAL_CASE_URL = "/festival/case/giggen-festival-for-en-kveld";

const grainOverlay = "bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    ref.current?.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const serif = { fontFamily: "'Crimson Pro', Georgia, serif" };
const sans = { fontFamily: "'Space Grotesk', sans-serif" };

function SectionBlock({ children, bg, overlay = "bg-black/60" }: { children: React.ReactNode; bg?: string; overlay?: string }) {
  return (
    <section
      className="relative py-24 md:py-32 px-6"
      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {bg && <div className={`absolute inset-0 ${overlay}`} />}
      <div className={`absolute inset-0 opacity-20 pointer-events-none ${grainOverlay}`} />
      <div className="relative z-10 max-w-3xl mx-auto">{children}</div>
    </section>
  );
}

export default function OmGiggenPage() {
  const containerRef = useScrollReveal();
  const [scrollOffset, setScrollOffset] = useState(0);
  const isMobile = useIsMobile();

  const currentBgOrange = isMobile ? bgOrange : bgOrangeDesktop;
  const currentBgDark = isMobile ? bgDark : bgDarkDesktop;
  const currentBgWarm = isMobile ? bgWarm : bgWarmDesktop;

  const { data: festivalTeam } = useQuery({
    queryKey: ["om-giggen-festival-team"],
    queryFn: async () => {
      const { data: participants } = await supabase
        .from("festival_participants")
        .select("*")
        .eq("festival_id", "40000000-0000-0000-0000-000000000001")
        .in("zone", ["host", "backstage"])
        .eq("is_public", true);
      if (!participants || participants.length === 0) return null;

      const personaIds = participants.filter(p => p.participant_kind === "persona").map(p => p.participant_id);
      const entityIds = participants.filter(p => p.participant_kind !== "persona").map(p => p.participant_id);

      const [personasRes, entitiesRes] = await Promise.all([
        personaIds.length > 0
          ? supabase.from("personas").select("id,name,slug,avatar_url,is_public,category_tags,type").in("id", personaIds)
          : Promise.resolve({ data: [] as any[] }),
        entityIds.length > 0
          ? supabase.from("entities").select("id,name,slug,hero_image_url,is_published,type").in("id", entityIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const personaMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));
      const entityMap = new Map((entitiesRes.data || []).map((e: any) => [e.id, e]));

      const all: any[] = [];
      participants.forEach(p => {
        const resolved = p.participant_kind === "persona" ? personaMap.get(p.participant_id) : entityMap.get(p.participant_id);
        if (!resolved) return;
        if (p.participant_kind !== "persona" && resolved.is_published === false) return;
        if (p.participant_kind === "persona" && resolved.is_public === false) return;
        all.push({
          participant_kind: p.participant_kind,
          participant_id: p.participant_id,
          entity: p.participant_kind !== "persona" ? resolved : null,
          persona: p.participant_kind === "persona" ? resolved : null,
          role_label: p.role_label,
          sort_order: p.sort_order,
        });
      });
      return all;
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrollOffset(Math.min(window.scrollY * 0.5, 100));
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white">
      {/* Back */}
      <div className="fixed top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Tilbake
        </Link>
      </div>

      {/* ═══ HERO ═══ */}
      <section
        className="relative min-h-screen flex items-center justify-center px-6"
        style={{ backgroundImage: `url(${currentBgOrange})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className={`absolute inset-0 opacity-30 pointer-events-none ${grainOverlay}`} />
        <div className="relative z-10 max-w-5xl w-full px-4 text-center">
          <div className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out">
            <img src={giggenLogo} alt="GIGGEN" className="w-full max-w-[90vw] mx-auto mb-12 drop-shadow-[0_8px_30px_rgba(0,0,0,0.5)]" />
          </div>
          <h1 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-100 text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" style={sans}>
            Fra idé til gjennomført konsert – i ett system
          </h1>
          <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto" style={serif}>
            Å sette opp et event handler ikke bare om å booke artister.
            Det handler om å holde alt samlet mens ting endrer seg underveis.
          </p>
        </div>
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out"
          style={{ transform: `translateX(-50%) translateY(${scrollOffset}px)`, opacity: Math.max(0, 1 - scrollOffset / 60) }}
        >
          <ChevronDown className="w-6 h-6 text-white/50 animate-bounce" />
        </div>
      </section>

      {/* ═══ 1 – Hva er et event? ═══ */}
      <SectionBlock bg={currentBgDark}>
        <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-8" style={sans}>
          Et event er ikke én oppgave – det er 20 små systemer samtidig.
        </h2>
        <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-3 text-lg text-white/70" style={serif}>
          {["Artister og lineup", "Tider og kjøreplan", "Billetter og innsjekk", "Info til publikum", "Oversikt for crew"].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-lg text-white/60 mt-8" style={serif}>
          Når dette ligger i ulike verktøy, må alt oppdateres manuelt.
        </p>
      </SectionBlock>

      {/* ═══ 2 – Hvorfor kaos? ═══ */}
      <SectionBlock bg={currentBgWarm} overlay="bg-black/70">
        <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-8" style={sans}>
          Hvorfor blir det fort kaos?
        </h2>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-100 text-lg text-white/70 mb-6" style={serif}>
          Du kjenner det igjen:
        </p>
        <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-3 text-lg text-white/70" style={serif}>
          {[
            "Du oppdaterer lineup flere steder",
            "Endringer når ikke alle",
            "Folk vet ikke når de skal på",
            "Billett og innsjekk lever sitt eget liv",
            "Oversikten forsvinner når tempoet øker",
          ].map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-xl font-bold text-white mt-10" style={serif}>
          Det er her kaoset oppstår.
        </p>
      </SectionBlock>

      {/* ═══ 3 – Hva er GIGGEN? ═══ */}
      <SectionBlock bg={currentBgOrange} overlay="bg-black/50">
        <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-4xl md:text-6xl font-bold tracking-tight mb-8" style={sans}>
          GIGGEN samler alt på ett sted.
        </h2>
        <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-3 text-lg text-white/80" style={serif}>
          {[
            "Event = rammen",
            "Lineup = hvem og når",
            "Billetter = tilgang",
            "Program = flyten",
            "Innsjekk = hva som faktisk skjer i døra",
          ].map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-xl font-bold text-white mt-10" style={serif}>
          Alt henger sammen – og oppdateres i sanntid.
        </p>
      </SectionBlock>

      {/* ═══ 4 – Lineup ═══ */}
      <section className="relative py-24 md:py-32 px-6 bg-zinc-950">
        <div className={`absolute inset-0 opacity-20 pointer-events-none ${grainOverlay}`} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-8" style={sans}>
            Lineup er hvem som er på – og når.
          </h2>
          <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-3 text-lg text-white/70" style={serif}>
            {["Artister", "Prosjekter", "Tidspunkt", "Scene"].map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-lg text-white/60 mt-8" style={serif}>
            Endrer du ett sted, oppdateres det overalt.
          </p>
        </div>
      </section>

      {/* ═══ 5 – Hvordan henger alt sammen? ═══ */}
      <SectionBlock bg={currentBgDark}>
        <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-8" style={sans}>
          Du jobber ett sted – alle ser det samme.
        </h2>
        <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-4 text-lg text-white/70" style={serif}>
          {[
            "Legger du til en artist → vises i lineup",
            "Setter du tid → oppdateres program",
            "Selger du billett → vises i innsjekk",
            "Endrer du noe → crew, artister og publikum ser det med én gang",
          ].map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-lg text-white/60 mt-8" style={serif}>
          Det gir færre misforståelser og mer ro i gjennomføring.
        </p>
      </SectionBlock>

      {/* ═══ 6 – For arrangøren ═══ */}
      <SectionBlock bg={currentBgWarm} overlay="bg-black/70">
        <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-8" style={sans}>
          Hva betyr det for deg som arrangør?
        </h2>
        <ul className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 space-y-3 text-lg text-white/80" style={serif}>
          {[
            "Mindre koordinering i chat og regneark",
            "Mindre dobbeltjobb",
            "Raskere endringer uten stress",
            "Bedre flyt på selve dagen",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <p className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-xl font-bold text-white mt-10" style={serif}>
          GIGGEN er ett system for hele showet.
        </p>
      </SectionBlock>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20 md:py-28 px-6 bg-black">
        <div className={`absolute inset-0 opacity-20 pointer-events-none ${grainOverlay}`} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-3xl md:text-5xl font-bold tracking-tight mb-10" style={sans}>
            Klar for å teste med ditt event?
          </h2>
          <div className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full px-8"
            >
              <Link to="/request-access">
                Få hjelp til å sette opp ditt event <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 border-white/20 text-white hover:bg-white/10"
            >
              <Link to={FESTIVAL_CASE_URL}>Se case fra ekte kveld</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ Social ═══ */}
      <section className="relative py-10 px-6 bg-black">
        <div className="relative z-10 max-w-xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-6">Følg oss</p>
          <div className="flex items-center justify-center gap-4">
            {[
              { href: "https://www.instagram.com/giggenintervjuer", label: "Instagram", icon: <Instagram className="w-5 h-5" /> },
              {
                href: "https://www.tiktok.com/@giggenintervjuer", label: "TikTok",
                icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>,
              },
              { href: "https://www.youtube.com/@giggentheapp", label: "YouTube", icon: <Youtube className="w-5 h-5" /> },
              { href: "https://www.facebook.com/people/GIGGENtheapp/61577973511926/", label: "Facebook", icon: <Facebook className="w-5 h-5" /> },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/40 transition-all duration-300"
              >{s.icon}</a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Team ═══ */}
      {festivalTeam && festivalTeam.length > 0 && (
        <section className="relative py-24 md:py-32 px-6 bg-black overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
          <TeamCreditsSection
            title="Festival-teamet"
            members={[...festivalTeam].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))}
            className="relative z-10 py-0 border-none"
          />
        </section>
      )}

      <style>{`
        .reveal-on-scroll.revealed {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
      `}</style>
    </div>
  );
}
