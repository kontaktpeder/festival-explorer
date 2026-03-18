import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import caseHeroBg from "@/assets/case-hero-bg.jpeg";
import { VimeoVideo } from "@/components/ui/VimeoVideo";

/* ── helpers ── */

function splitLines(value?: string | null): string[] {
  return (value || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

/* ── sub-components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 mb-4">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="mx-auto max-w-5xl border-t border-border/20" />;
}

/* ── page ── */

export default function FestivalCasePage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = paramSlug || "giggen-festival-for-en-kveld";

  const { data: shell, isLoading: shellLoading } = useFestivalShell(slug);
  const { data: details } = useFestivalDetails(shell?.id);

  const { data: caseContent, isLoading: caseLoading } = useQuery({
    queryKey: ["festival-case-content-public", shell?.id],
    queryFn: async () => {
      if (!shell?.id) return null;
      const { data, error } = await supabase
        .from("festival_case_content" as any)
        .select("*")
        .eq("festival_id", shell.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!shell?.id,
  });

  const { data: venue } = useQuery({
    queryKey: ["case-venue", shell?.venue_id],
    queryFn: async () => {
      if (!shell?.venue_id) return null;
      const { data } = await supabase
        .from("venues")
        .select("*")
        .eq("id", shell.venue_id)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!shell?.venue_id,
  });

  const heroImageUrl = useSignedMediaUrl(shell?.theme?.hero_image_url, "public");

  const { data: attendeesCount } = useQuery({
    queryKey: ["case-attendees", shell?.slug, caseContent?.case_public_show_attendees],
    queryFn: async () => {
      if (!shell?.slug || !caseContent?.case_public_show_attendees) return null;
      const { data: te } = await supabase
        .from("ticket_events")
        .select("id")
        .eq("slug", shell.slug)
        .maybeSingle();
      if (!te?.id) return null;
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, status, checked_in_at, refunded_at, chargeback_at")
        .eq("event_id", te.id);
      if (!tickets) return null;
      return tickets.filter(
        (t: any) =>
          t.status !== "CANCELLED" &&
          !t.refunded_at &&
          !t.chargeback_at &&
          (t.status === "USED" || !!t.checked_in_at)
      ).length;
    },
    enabled: !!shell?.slug && !!caseContent,
  });

  const artistCount = details?.allArtistsWithEventSlug?.length ?? 0;
  const eventCount = useMemo(() => {
    return (details?.festivalEvents ?? []).filter((fe: any) => fe?.event?.status === "published").length;
  }, [details?.festivalEvents]);

  useMemo(() => {
    const title = shell ? `${shell.name} – Case | GIGGEN` : "Case | GIGGEN";
    document.title = title;
    const desc = (caseContent?.case_summary || shell?.description || "").slice(0, 155) || "Case: en ekte festival bygget gjennom GIGGEN.";
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) { el = document.createElement("meta"); el.setAttribute("name", "description"); document.head.appendChild(el); }
    el.setAttribute("content", desc);
  }, [caseContent?.case_summary, shell?.description, shell?.name]);

  if (shellLoading || caseLoading) {
    return <PageLayout><LoadingState message="Laster case..." /></PageLayout>;
  }
  if (!shell) {
    return <PageLayout><EmptyState title="Festival ikke funnet" description="Festivalen finnes ikke eller er ikke publisert." /></PageLayout>;
  }
  if (!caseContent?.case_enabled) {
    return <PageLayout><EmptyState title="Case ikke tilgjengelig" description="Denne case-siden er ikke publisert ennå." /></PageLayout>;
  }

  const dateText = shell.start_at
    ? new Date(shell.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const worked = splitLines(caseContent.case_what_worked);
  const challenges = splitLines(caseContent.case_challenges);

  /* collect stats into array for clean rendering */
  const stats: { label: string; value: string }[] = [];
  if (typeof attendeesCount === "number") stats.push({ label: "Kommet", value: String(attendeesCount) });
  if (artistCount > 0) stats.push({ label: "Artister", value: String(artistCount) });
  if (eventCount > 0) stats.push({ label: "Events", value: String(eventCount) });
  if (venue?.name) stats.push({ label: "Venue", value: venue.name });
  if (dateText) stats.push({ label: "Dato", value: dateText });

  return (
    <PageLayout>
      <div className="min-h-screen bg-background text-foreground">
        <StaticLogo />

        {/* ═══ HERO — full-bleed poster ═══ */}
        <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-end overflow-hidden">
          <img
            src={caseHeroBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="relative w-full px-5 md:px-10 pb-10 md:pb-16 pt-32">
            <div className="mx-auto max-w-4xl">
              <p className="text-[10px] uppercase tracking-[0.5em] text-accent/80 mb-5">Case</p>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
                {shell.name}
              </h1>
              {caseContent.case_summary && (
                <p className="mt-5 md:mt-6 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  {caseContent.case_summary}
                </p>
              )}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild className="h-12 px-6 font-semibold">
                  <Link to="/request-access">Få hjelp til å sette opp ditt event</Link>
                </Button>
                <Button asChild variant="ghost" className="h-12 px-6 font-semibold text-muted-foreground hover:text-foreground">
                  <Link to="/">Tilbake til GIGGEN</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS — inline row ═══ */}
        {stats.length > 0 && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-10 md:py-14">
              <div className="mx-auto max-w-4xl flex flex-wrap gap-x-10 gap-y-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/50">{s.label}</p>
                    <p className="mt-1.5 text-2xl md:text-3xl font-bold tracking-tight">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══ VIDEO ═══ */}
        {caseContent.case_video_embed_url && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-10 md:py-14">
              <div className="mx-auto max-w-4xl">
                <VimeoVideo url={caseContent.case_video_embed_url} />
              </div>
            </section>
          </>
        )}

        {/* ═══ HVA VAR DETTE ═══ */}
        {caseContent.case_what_was_this && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-14 md:py-20">
              <div className="mx-auto max-w-4xl">
                <SectionLabel>Om prosjektet</SectionLabel>
                <p className="text-lg md:text-xl text-foreground/90 leading-relaxed whitespace-pre-wrap max-w-3xl">
                  {caseContent.case_what_was_this}
                </p>
              </div>
            </section>
          </>
        )}

        {/* ═══ HVORDAN GIGGEN BLE BRUKT — numbered steps ═══ */}
        <Divider />
        <section className="px-5 md:px-10 py-14 md:py-20">
          <div className="mx-auto max-w-4xl">
            <SectionLabel>Prosessen</SectionLabel>
            <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-12">
              {[
                { n: "01", title: "Opprett event", desc: "Sett navn, sted og tidspunkt." },
                { n: "02", title: "Bygg lineup", desc: "Legg til artister og program." },
                { n: "03", title: "Publiser og gjennomfør", desc: "Del side, selg billetter, scan i døra." },
              ].map((s) => (
                <div key={s.n}>
                  <span className="text-3xl md:text-4xl font-bold text-accent/30">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ LINEUP ═══ */}
        {artistCount > 0 && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-14 md:py-20">
              <div className="mx-auto max-w-4xl">
                <SectionLabel>Lineup</SectionLabel>
                <div className="flex flex-wrap gap-x-1 gap-y-0">
                  {(details?.allArtistsWithEventSlug ?? []).map((a: any, i: number, arr: any[]) => (
                    <span key={a.id ?? a.slug ?? a.name}>
                      <Link
                        to={a.slug ? `/project/${a.slug}` : "#"}
                        className="text-lg md:text-xl font-semibold hover:text-accent transition-colors"
                      >
                        {a.name ?? "Artist"}
                      </Link>
                      {i < arr.length - 1 && (
                        <span className="text-muted-foreground/30 mx-1">/</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══ WORKED / CHALLENGES — two columns ═══ */}
        {(worked.length > 0 || challenges.length > 0) && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-14 md:py-20">
              <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                {worked.length > 0 && (
                  <div>
                    <SectionLabel>Fungerte bra</SectionLabel>
                    <ul className="space-y-3">
                      {worked.map((x, i) => (
                        <li key={i} className="flex gap-3 text-sm md:text-base text-foreground/80 leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {challenges.length > 0 && (
                  <div>
                    <SectionLabel>Utfordringer / læring</SectionLabel>
                    <ul className="space-y-3">
                      {challenges.map((x, i) => (
                        <li key={i} className="flex gap-3 text-sm md:text-base text-foreground/80 leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ═══ QUOTE ═══ */}
        {caseContent.case_quote && (
          <>
            <Divider />
            <section className="px-5 md:px-10 py-16 md:py-24">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-5xl md:text-7xl font-serif text-accent/30 leading-none select-none">"</span>
                <p className="mt-2 text-xl md:text-2xl font-semibold leading-relaxed tracking-tight">
                  {caseContent.case_quote}
                </p>
              </div>
            </section>
          </>
        )}

        {/* ═══ CTA ═══ */}
        <Divider />
        <section className="px-5 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <SectionLabel>Neste steg</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Vil du lage noe lignende?
            </h2>
            <p className="mt-4 text-muted-foreground">Vi onboarder deg personlig.</p>
            <Button asChild className="mt-8 h-12 px-8 font-semibold">
              <Link to="/request-access">Få hjelp til å sette opp ditt event</Link>
            </Button>
          </div>
        </section>

        <div className="h-16" />
      </div>
    </PageLayout>
  );
}
