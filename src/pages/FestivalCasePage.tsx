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
import { Badge } from "@/components/ui/badge";
import { VimeoVideo } from "@/components/ui/VimeoVideo";

/* ── helpers ── */

function splitLines(value?: string | null): string[] {
  return (value || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 p-5">
      <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
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

  // best-effort attendees count
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

  // SEO
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

  return (
    <PageLayout>
      <div className="min-h-screen bg-background text-foreground">
        <StaticLogo />
        <div className="pt-20 md:pt-24" />

        {/* HERO */}
        <section className="relative px-4 md:px-8 pt-10 md:pt-14 pb-10">
          <div className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-border/40">
              <div className="absolute inset-0">
                <img src={caseHeroBg} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50" />
              </div>
              <div className="relative p-7 md:p-10">
                <Badge variant="secondary" className="text-[10px] tracking-widest uppercase">CASE</Badge>
                <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">{shell.name}</h1>
                {caseContent.case_summary && (
                  <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">{caseContent.case_summary}</p>
                )}
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="h-11 px-5 font-semibold">
                    <Link to="/request-access">Få hjelp til å sette opp ditt event</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 px-5 font-semibold">
                    <Link to="/">Tilbake til GIGGEN</Link>
                  </Button>
                </div>
                {caseContent.case_video_embed_url && (
                  <div className="mt-8"><VimeoVideo url={caseContent.case_video_embed_url} /></div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="px-4 md:px-8 py-10">
          <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {typeof attendeesCount === "number" && <StatCard label="Kommet" value={String(attendeesCount)} />}
            {artistCount > 0 && <StatCard label="Artister" value={String(artistCount)} />}
            {eventCount > 0 && <StatCard label="Events" value={String(eventCount)} />}
            {venue?.name && <StatCard label="Venue" value={venue.name} />}
            {dateText && <StatCard label="Dato" value={dateText} />}
          </div>
        </section>

        {/* WHAT WAS THIS */}
        {caseContent.case_what_was_this && (
          <section className="px-4 md:px-8 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight">Hva var dette?</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">{caseContent.case_what_was_this}</p>
            </div>
          </section>
        )}

        {/* HOW GIGGEN WAS USED */}
        <section className="px-4 md:px-8 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">Hvordan GIGGEN ble brukt</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Opprett event", desc: "Sett navn, sted og tidspunkt." },
                { step: "2", title: "Bygg lineup", desc: "Legg til artister og program." },
                { step: "3", title: "Publiser og gjennomfør", desc: "Del side, selg billetter, scan i døra." },
              ].map((s) => (
                <div key={s.step} className="rounded-2xl border border-border/40 bg-card/30 p-6">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">Steg {s.step}</p>
                  <p className="mt-2 text-lg font-semibold">{s.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LINEUP */}
        {artistCount > 0 && (
          <section className="px-4 md:px-8 py-12">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-2xl font-bold tracking-tight">Lineup / medvirkende</h2>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {(details?.allArtistsWithEventSlug ?? []).map((a: any) => (
                  <Link
                    key={a.id ?? a.slug ?? a.name}
                    to={a.slug ? `/project/${a.slug}` : "#"}
                    className="rounded-xl border border-border/40 bg-card/20 p-4 hover:bg-card/40 transition-colors"
                  >
                    <p className="text-sm font-semibold truncate">{a.name ?? "Artist"}</p>
                    {a.slug && <p className="text-[11px] text-muted-foreground mt-1">Se profil →</p>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* WORKED / CHALLENGES */}
        {(worked.length > 0 || challenges.length > 0) && (
          <section className="px-4 md:px-8 py-12">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-2xl font-bold tracking-tight">Hva fungerte / hva lærte vi</h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {worked.length > 0 && (
                  <div className="rounded-2xl border border-border/40 bg-card/30 p-6">
                    <h3 className="text-base font-semibold">Fungerte bra</h3>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {worked.map((x, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {challenges.length > 0 && (
                  <div className="rounded-2xl border border-border/40 bg-card/30 p-6">
                    <h3 className="text-base font-semibold">Utfordringer / læring</h3>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {challenges.map((x, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* QUOTE */}
        {caseContent.case_quote && (
          <section className="px-4 md:px-8 py-12">
            <div className="mx-auto max-w-3xl rounded-3xl border border-border/40 bg-card/20 p-7 md:p-10">
              <p className="text-lg md:text-xl font-semibold leading-relaxed">"{caseContent.case_quote}"</p>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="px-4 md:px-8 py-12 pb-16">
          <div className="mx-auto max-w-5xl rounded-3xl border border-border/40 bg-gradient-to-br from-accent/10 via-card/20 to-emerald-500/10 p-7 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">Neste steg</p>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">Vil du lage noe lignende?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Vi onboarder deg personlig.</p>
            </div>
            <Button asChild className="h-11 px-5 font-semibold">
              <Link to="/request-access">Få hjelp til å sette opp ditt event</Link>
            </Button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
