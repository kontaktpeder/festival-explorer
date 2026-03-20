import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFinanceBooks, useFinanceEntries } from "@/hooks/useFestivalFinance";
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

  if (!festivalId) return null;

  return (
    <BackstageShell title="Internt oppgjør" subtitle={festival?.name} backTo={`/dashboard/festival/${festivalId}/finance`}>
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Totalt utlegg</p><p className="text-lg font-semibold">{formatNok(totals.totalOutlay)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Totalt refundert</p><p className="text-lg font-semibold">{formatNok(totals.totalReimbursed)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Personer</p><p className="text-lg font-semibold">{totals.peopleCount}</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Utestående</p><p className="text-lg font-semibold">{formatNok(totals.outstanding)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Per person</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Utlegg</TableHead>
                  <TableHead className="text-right">Refundert</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.personaId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNok(p.outlay)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNok(p.reimbursed)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatNok(p.net)}</TableCell>
                    <TableCell>
                      {p.net > 0 ? <Badge variant="outline" className="text-destructive border-destructive/30">Skal ha</Badge> : p.net < 0 ? <Badge variant="outline" className="text-primary border-primary/30">Skylder</Badge> : <Badge variant="outline" className="text-muted-foreground border-border">Oppgjort</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {people.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Ingen data ennå. Sett «Betalt av» på utgiftsrader i økonomimodulen.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {unresolvedRows.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-2"><CardTitle className="text-base text-destructive">Mangler persona-kobling</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-destructive/80">{unresolvedRows.length} rad(er) har «Betalt av»-tekst men mangler persona-kobling. Disse er ikke med i persona-basert oppgjør.</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Forslag til oppgjør</CardTitle></CardHeader>
          <CardContent>
            {suggestions.length ? (
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => <li key={i} className="text-sm">{s}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen oppgjør nødvendig.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </BackstageShell>
  );
}
