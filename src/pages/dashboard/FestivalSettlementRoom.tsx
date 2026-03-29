import { useMemo } from "react";
import { FocusThemeProvider } from "@/contexts/FocusThemeContext";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useFinanceBooks, useFinanceEntries } from "@/hooks/useFestivalFinance";
import { useFinanceAccess } from "@/hooks/useFinanceAccess";
import type { FestivalFinanceEntry } from "@/types/finance";

type PersonAgg = {
  personaId: string;
  name: string;
  outlay: number;
  reimbursed: number;
  net: number;
  rows: FestivalFinanceEntry[];
};

function formatNok(ore: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
  }).format((ore || 0) / 100);
}

function SummaryCard({ label, value, variant = "neutral", className }: {
  label: string; value: string; variant?: "neutral" | "positive" | "negative"; className?: string;
}) {
  const valueColor = variant === "positive" ? "finance-positive" : variant === "negative" ? "finance-negative" : "text-foreground";
  return (
    <Card className={`shadow-sm border-border/60 ${className || ""}`}>
      <CardContent className="p-3 md:p-4">
        <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground block mb-1">{label}</span>
        <p className={`text-lg md:text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function FestivalSettlementRoom() {
  const { id: festivalId } = useParams<{ id: string }>();

  const { data: festival } = useQuery({
    queryKey: ["festival-shell", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("id, name")
        .eq("id", festivalId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!festivalId,
  });

  const { data: financeAccess, isLoading: accessLoading } = useFinanceAccess(festivalId);

  const { data: books = [] } = useFinanceBooks(festivalId || undefined);
  const activeBookId = books[0]?.id ?? null;
  const { data: entries = [] } = useFinanceEntries(activeBookId || undefined);

  const paidByIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.paid_by_id).filter(Boolean) as string[])),
    [entries]
  );

  const { data: personaMap = new Map() } = useQuery({
    queryKey: ["settlement-personas", paidByIds],
    queryFn: async () => {
      if (!paidByIds.length) return new Map<string, string>();
      const { data, error } = await supabase
        .from("personas")
        .select("id, name")
        .in("id", paidByIds);
      if (error) throw error;
      return new Map((data || []).map((p) => [p.id, p.name]));
    },
    enabled: paidByIds.length > 0,
  });

  const { people, unresolvedRows, totals } = useMemo(() => {
    const valid = entries.filter((e) => e.payment_status !== "cancelled");
    const unresolved = valid.filter((e) => !e.paid_by_id && e.paid_by_label);
    const map = new Map<string, PersonAgg>();

    valid.forEach((e) => {
      if (!e.paid_by_id) return;

      const current: PersonAgg = map.get(e.paid_by_id) || {
        personaId: e.paid_by_id,
        name: personaMap.get(e.paid_by_id) || e.paid_by_label || "Ukjent",
        outlay: 0,
        reimbursed: 0,
        net: 0,
        rows: [],
      };

      if (e.entry_type === "expense" && e.source_type !== "reimbursement") {
        current.outlay += e.net_amount || 0;
      }
      if (e.source_type === "reimbursement") {
        current.reimbursed += Math.abs(e.net_amount || 0);
      }

      current.rows.push(e);
      current.net = current.outlay - current.reimbursed;
      map.set(e.paid_by_id, current);
    });

    const peopleList = Array.from(map.values()).sort((a, b) => b.net - a.net);
    const totalOutlay = peopleList.reduce((s, p) => s + p.outlay, 0);
    const totalReimbursed = peopleList.reduce((s, p) => s + p.reimbursed, 0);
    const outstanding = peopleList.reduce((s, p) => s + Math.max(0, p.net), 0);

    return {
      people: peopleList,
      unresolvedRows: unresolved,
      totals: { totalOutlay, totalReimbursed, outstanding, peopleCount: peopleList.length },
    };
  }, [entries, personaMap]);

  const suggestions = useMemo(() => {
    const creditors = people
      .filter((p) => p.net > 0)
      .map((p) => ({ name: p.name, amount: p.net }));
    const debtors = people
      .filter((p) => p.net < 0)
      .map((p) => ({ name: p.name, amount: Math.abs(p.net) }));

    const out: string[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amount, c.amount);
      out.push(`${d.name} betaler ${c.name} ${formatNok(pay)}`);
      d.amount -= pay;
      c.amount -= pay;
      if (d.amount === 0) i++;
      if (c.amount === 0) j++;
    }

    return out;
  }, [people]);

  if (accessLoading) return null;
  if (!festivalId) return null;

  if (financeAccess === "none") {
    return (
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <Card className="max-w-md w-full shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-lg font-semibold">Ingen tilgang til økonomi</p>
            <p className="text-sm text-muted-foreground">Du har ikke økonomi-tilgang for denne festivalen. Kontakt festivaladministrator.</p>
            <Link to={`/dashboard/festival/${festivalId}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Tilbake til festival
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FocusThemeProvider value="light">
    <div className="finance-theme min-h-[100svh]">
      <div className="max-w-[1400px] mx-auto px-3 py-4 md:px-6 md:py-8 space-y-6">
        <Link to={`/dashboard/festival/${festivalId}/finance`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
          <ArrowLeft className="w-4 h-4" /><span>Tilbake til økonomi</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Internt oppgjør</h1>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{festival?.name}</p>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Totalt utlegg" value={formatNok(totals.totalOutlay)} />
          <SummaryCard label="Totalt refundert" value={formatNok(totals.totalReimbursed)} />
          <SummaryCard label="Personer" value={String(totals.peopleCount)} />
          <SummaryCard label="Utestående" value={formatNok(totals.outstanding)} variant={totals.outstanding > 0 ? "negative" : "neutral"} />
        </div>

        {/* ── Unresolved warning ── */}
        {unresolvedRows.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive/90">
              {unresolvedRows.length} rad(er) har «Betalt av»-tekst men mangler persona-kobling. Disse er ikke med i persona-basert oppgjør.
            </p>
          </div>
        )}

        {/* ── Per person table ── */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2 px-3 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-base font-semibold">Per person</CardTitle>
          </CardHeader>
          <CardContent className="px-0 md:px-0">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Persona</TableHead>
                    <TableHead className="text-right">Utlegg</TableHead>
                    <TableHead className="text-right">Refundert</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((p) => (
                    <TableRow key={p.personaId}>
                      <TableCell className="font-medium pl-6">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNok(p.outlay)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNok(p.reimbursed)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatNok(p.net)}</TableCell>
                      <TableCell className="pr-6">
                        {p.net > 0 ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Skal ha</Badge>
                        ) : p.net < 0 ? (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">Skylder</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border text-xs">Oppgjort</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {people.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        Ingen data ennå. Sett «Betalt av» på utgiftsrader i økonomimodulen.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2 px-3">
              {people.map((p) => (
                <div key={p.personaId} className="rounded-md border border-border bg-card p-3 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.net > 0 ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Skal ha</Badge>
                    ) : p.net < 0 ? (
                      <Badge variant="outline" className="text-primary border-primary/30 text-xs">Skylder</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border text-xs">Oppgjort</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Utlegg</span>
                      <span className="text-sm tabular-nums">{formatNok(p.outlay)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Refundert</span>
                      <span className="text-sm tabular-nums">{formatNok(p.reimbursed)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Netto</span>
                      <span className="text-sm tabular-nums font-semibold">{formatNok(p.net)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {people.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Ingen data ennå. Sett «Betalt av» på utgiftsrader i økonomimodulen.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Settlement suggestions ── */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2 px-3 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-base font-semibold">Forslag til oppgjør</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {suggestions.length ? (
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-foreground">{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen oppgjør nødvendig.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </FocusThemeProvider>
  );
}
