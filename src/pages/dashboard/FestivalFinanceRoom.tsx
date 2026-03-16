import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecipientPicker } from "@/components/finance/RecipientPicker";
import { useFinancePayers } from "@/hooks/useFinancePayers";
import { Plus, Trash2, ArrowLeft, Undo2 } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

import {
  useFinanceBooks,
  useFinanceEntries,
  useCreateFinanceBook,
  useUpsertExpenseEntry,
  useUpsertIncomeEntry,
  useDeleteFinanceEntry,
  useImportTicketRevenue,
  useFinanceCategoriesForFestival,
} from "@/hooks/useFestivalFinance";

import type { FestivalFinanceEntry } from "@/types/finance";

function formatNok(ore: number | null | undefined): string {
  const v = (ore ?? 0) / 100;
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
  }).format(v);
}

export default function FestivalFinanceRoom() {
  const { id: festivalId } = useParams<{ id: string }>();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get festival info (for ticket_event_id if needed)
  const { data: festival } = useQuery({
    queryKey: ["festival-for-finance", festivalId],
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

  const { data: books, isLoading: booksLoading } = useFinanceBooks(festivalId || undefined);
  const createBook = useCreateFinanceBook();
  const importTickets = useImportTicketRevenue();

  const activeBookId = useMemo(() => {
    if (selectedBookId) return selectedBookId;
    if (books && books.length > 0) return books[0].id;
    return null;
  }, [books, selectedBookId]);

  const { data: categorySuggestions } = useFinanceCategoriesForFestival(festivalId);
  const { data: payers = [] } = useFinancePayers(festivalId);


  const { data: entries, isLoading: entriesLoading } = useFinanceEntries(activeBookId || undefined);
  const expenseMutation = useUpsertExpenseEntry(activeBookId || "");
  const incomeMutation = useUpsertIncomeEntry(activeBookId || "");
  const deleteEntry = useDeleteFinanceEntry(activeBookId || "");

  const isLoading = booksLoading || (!!activeBookId && entriesLoading);

  const { incomeTotal, feeTotal, expenseTotal, reimbursementTotal } = useMemo(() => {
    let income = 0;
    let fee = 0;
    let expense = 0;
    let reimbursements = 0;

    (entries || []).forEach((e) => {
      if (e.entry_type === "income") {
        if (e.source_type === "ticket") {
          income += e.gross_amount;
          if (e.fee_amount) fee += e.fee_amount;
        } else if (e.source_type !== "reimbursement") {
          income += e.net_amount;
        }
      } else if (e.entry_type === "expense") {
        if (e.source_type === "reimbursement") {
          reimbursements += e.net_amount; // negative value
        } else {
          expense += e.net_amount;
        }
      }
    });

    return { incomeTotal: income, feeTotal: fee, expenseTotal: expense, reimbursementTotal: reimbursements };
  }, [entries]);

  const expenseGroups = useMemo(() => {
    const groups = new Map<
      string,
      { category: string; items: FestivalFinanceEntry[]; totalNet: number }
    >();
    (entries || [])
      .filter((e) => e.entry_type === "expense" && e.source_type !== "reimbursement")
      .forEach((e) => {
        const key = e.category || "Uten kategori";
        const existing = groups.get(key) || { category: key, items: [], totalNet: 0 };
        existing.items.push(e);
        existing.totalNet += e.net_amount;
        groups.set(key, existing);
      });
    return Array.from(groups.values()).sort((a, b) =>
      a.category.localeCompare(b.category, "nb")
    );
  }, [entries]);

  const reimbursementEntries = useMemo(
    () => (entries || []).filter((e) => e.source_type === "reimbursement"),
    [entries]
  );

  const incomeGroups = useMemo(() => {
    const groups = new Map<string, { category: string; items: FestivalFinanceEntry[]; totalNet: number }>();
    (entries || [])
      .filter((e) => e.entry_type === "income" && e.source_type !== "ticket")
      .forEach((e) => {
        const key = e.category || "Uten kategori";
        const existing = groups.get(key) || { category: key, items: [], totalNet: 0 };
        existing.items.push(e);
        existing.totalNet += e.net_amount;
        groups.set(key, existing);
      });
    return Array.from(groups.values()).sort((a, b) => a.category.localeCompare(b.category, "nb"));
  }, [entries]);

  const netIncome = incomeTotal - feeTotal;
  const netExpense = expenseTotal + reimbursementTotal; // reimbursementTotal is negative
  const result = netIncome - netExpense;

  const handleCreateBook = async () => {
    if (!user) return;
    try {
      const defaultName = "Regnskap";
      const book = await createBook.mutateAsync({
        festival_id: festivalId || null,
        ticket_event_id: null,
        name: books && books.length === 0 ? defaultName : `${defaultName} ${(books?.length || 0) + 1}`,
        created_by: user.id,
      });
      setSelectedBookId(book.id);
      toast.success("Økonomibok opprettet");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opprette bok");
    }
  };

  const handleAddExpense = () => {
    if (!activeBookId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    expenseMutation.mutate({
      description: "",
      category: null,
      counterparty: null,
      gross_amount: 0,
      net_amount: 0,
      date_incurred: today,
      created_by: user.id,
    });
  };

  const onExpenseFieldChange = (
    entry: FestivalFinanceEntry,
    field: keyof FestivalFinanceEntry,
    value: string
  ) => {
    const patch: any = { id: entry.id };
    if (field === "gross_amount" || field === "net_amount") {
      const n = parseInt(value.replace(/\s/g, ""), 10);
      patch[field] = isNaN(n) ? 0 : n * 100;
    } else if (field === "date_incurred") {
      patch.date_incurred = value;
    } else {
      patch[field] = value;
    }
    expenseMutation.mutate(patch);
  };

  const handleAddIncome = () => {
    if (!activeBookId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    incomeMutation.mutate({
      description: "",
      category: null,
      counterparty: null,
      gross_amount: 0,
      net_amount: 0,
      date_incurred: today,
      created_by: user.id,
    });
  };

  const onIncomeFieldChange = (
    entry: FestivalFinanceEntry,
    field: keyof FestivalFinanceEntry,
    value: string
  ) => {
    const patch: any = { id: entry.id };
    if (field === "gross_amount" || field === "net_amount") {
      const n = parseInt(value.replace(/\s/g, ""), 10);
      patch[field] = isNaN(n) ? 0 : n * 100;
    } else if (field === "date_incurred") {
      patch.date_incurred = value;
    } else {
      patch[field] = value;
    }
    incomeMutation.mutate(patch);
  };

  const handleImportTickets = async () => {
    if (!activeBookId) {
      toast.error("Ingen økonomibok valgt.");
      return;
    }
    const { data: ticketEvent, error } = await supabase
      .from("ticket_events")
      .select("id")
      .limit(1)
      .single();
    if (error || !ticketEvent) {
      toast.error("Fant ingen ticket event å importere fra.");
      return;
    }
    try {
      await importTickets.mutateAsync({
        bookId: activeBookId,
        ticketEventId: ticketEvent.id,
      });
      toast.success("Billettsalg importert til økonomiboken.");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke importere billettsalg.");
    }
  };

  if (!festivalId) {
    return <p className="p-6 text-muted-foreground">Mangler festival-ID.</p>;
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="max-w-5xl mx-auto px-3 py-4 md:p-8 space-y-6">
        <Link
          to={`/dashboard/festival/${festivalId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors py-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbake til festivalrommet</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Økonomi</h1>
            <p className="text-sm text-muted-foreground">
              Regnskap for festivalen. Importer billettsalg og legg til utgifter.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {books && books.length > 0 && (
              <Select
                value={activeBookId || ""}
                onValueChange={(v) => setSelectedBookId(v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateBook}
              disabled={createBook.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ny bok
            </Button>
          </div>
        </div>

        {isLoading && <LoadingState message="Laster økonomi..." />}

        {activeBookId && !isLoading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Brutto inntekter</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNok(incomeTotal)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Gebyrer</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNok(feeTotal)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Netto inntekter</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNok(netIncome)}</p>
                </CardContent>
              </Card>
              {reimbursementTotal !== 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Refusjoner</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-emerald-500">
                      {formatNok(-reimbursementTotal)}
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Resultat</CardDescription>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-xl font-bold ${
                      result >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {formatNok(result)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Income table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Inntekter fra billetter</CardTitle>
                    <CardDescription>
                      Aggregerte linjer per billettype (read only).
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleImportTickets}
                    disabled={importTickets.isPending}
                  >
                    Importer billettsalg
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beskrivelse</TableHead>
                      <TableHead className="text-right">Antall</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead className="text-right">Gebyr</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(entries || [])
                      .filter((e) => e.entry_type === "income" && e.source_type === "ticket")
                      .map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.description}</TableCell>
                          <TableCell className="text-right">
                            {e.quantity ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNok(e.gross_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNok(e.fee_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNok(e.net_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(entries || []).filter((e) => e.entry_type === "income" && e.source_type === "ticket")
                      .length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Ingen inntekter importert ennå.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Manual income */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Andre inntekter</CardTitle>
                    <CardDescription>
                      Legg inn sponsorer, støtte, barandel, merch m.m.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddIncome}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ny inntekt
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {incomeGroups.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{group.category}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.items.length} linje{group.items.length === 1 ? "" : "r"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatNok(group.totalNet)}
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dato</TableHead>
                          <TableHead>Beskrivelse</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Fra</TableHead>
                          <TableHead className="text-right">Beløp (kr)</TableHead>
                          <TableHead className="w-16 text-right">Handling</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <Input
                                type="date"
                                className="w-[130px]"
                                defaultValue={e.date_incurred}
                                onBlur={(ev) =>
                                  onIncomeFieldChange(e, "date_incurred", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={e.description}
                                placeholder="F.eks. Sponsor, støtte, barandel"
                                onBlur={(ev) =>
                                  onIncomeFieldChange(e, "description", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                list="finance-category-suggestions"
                                className="w-[140px]"
                                defaultValue={e.category || ""}
                                placeholder="Kategori"
                                onBlur={(ev) =>
                                  onIncomeFieldChange(e, "category", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <Input
                                className="h-8 text-xs"
                                defaultValue={e.counterparty || ""}
                                placeholder="Fra (sponsor, ordning osv.)"
                                onBlur={(ev) =>
                                  onIncomeFieldChange(e, "counterparty", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="w-[100px] text-right"
                                defaultValue={
                                  e.net_amount ? (e.net_amount / 100).toString() : "0"
                                }
                                onBlur={(ev) =>
                                  onIncomeFieldChange(e, "net_amount", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="space-x-1 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Dupliser rad"
                                onClick={() => {
                                  if (!user) return;
                                  incomeMutation.mutate({
                                    description: e.description,
                                    category: e.category,
                                    counterparty: e.counterparty,
                                    gross_amount: e.gross_amount,
                                    net_amount: e.net_amount,
                                    date_incurred: e.date_incurred,
                                    notes: e.notes,
                                    created_by: user.id,
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="Slett rad"
                                onClick={() => deleteEntry.mutate(e.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {incomeGroups.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Ingen manuelle inntekter lagt til ennå.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Utgifter</CardTitle>
                    <CardDescription>
                      Legg inn og rediger festivalens kostnader.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddExpense}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ny rad
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {expenseGroups.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {group.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.items.length} linje{group.items.length === 1 ? "" : "r"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatNok(group.totalNet)}
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                         <TableHead>Dato</TableHead>
                          <TableHead>Beskrivelse</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Mottaker</TableHead>
                          <TableHead>Betalt av</TableHead>
                          <TableHead className="text-right">Beløp (kr)</TableHead>
                          <TableHead className="w-16 text-right">Handling</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <Input
                                type="date"
                                className="w-[130px]"
                                defaultValue={e.date_incurred}
                                onBlur={(ev) =>
                                  onExpenseFieldChange(e, "date_incurred", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={e.description}
                                onBlur={(ev) =>
                                  onExpenseFieldChange(e, "description", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                list="finance-category-suggestions"
                                className="w-[140px]"
                                defaultValue={e.category || ""}
                                placeholder="Kategori"
                                onBlur={(ev) =>
                                  onExpenseFieldChange(e, "category", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <RecipientPicker
                                festivalId={festivalId!}
                                value={e.counterparty}
                                onChange={(val) => onExpenseFieldChange(e, "counterparty", val)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="w-[100px] text-right"
                                defaultValue={
                                  e.net_amount ? (e.net_amount / 100).toString() : "0"
                                }
                                onBlur={(ev) =>
                                  onExpenseFieldChange(e, "net_amount", ev.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="space-x-1 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Dupliser rad"
                                onClick={() => {
                                  if (!user) return;
                                  expenseMutation.mutate({
                                    description: e.description,
                                    category: e.category,
                                    counterparty: e.counterparty,
                                    gross_amount: e.gross_amount,
                                    net_amount: e.net_amount,
                                    date_incurred: e.date_incurred,
                                    notes: e.notes,
                                    created_by: user.id,
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Legg til refusjon"
                                onClick={() => {
                                  if (!user) return;
                                  expenseMutation.mutate({
                                    description: `Refusjon: ${e.description}`,
                                    category: e.category || "Refusjon / kostnadsdeling",
                                    counterparty: null,
                                    gross_amount: -(e.net_amount ?? 0),
                                    net_amount: -(e.net_amount ?? 0),
                                    date_incurred: e.date_incurred,
                                    source_type: "reimbursement",
                                    linked_entry_id: e.id,
                                    created_by: user.id,
                                  });
                                }}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="Slett rad"
                                onClick={() => deleteEntry.mutate(e.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {expenseGroups.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Ingen utgifter lagt til ennå.
                  </div>
                )}
                <datalist id="finance-category-suggestions">
                  {(categorySuggestions || []).map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </CardContent>
            </Card>

            {/* Reimbursements */}
            {reimbursementEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle className="text-lg">Refusjoner / kostnadsdeling</CardTitle>
                    <CardDescription>
                      Poster som reduserer utgiftene (f.eks. delt kostnad, refundert beløp).
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dato</TableHead>
                        <TableHead>Beskrivelse</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Beløp (kr)</TableHead>
                        <TableHead className="w-16 text-right">Handling</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reimbursementEntries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{e.date_incurred}</TableCell>
                          <TableCell>
                            <Input
                              defaultValue={e.description}
                              onBlur={(ev) =>
                                onExpenseFieldChange(e, "description", ev.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.category || "–"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-[100px] text-right"
                              defaultValue={
                                e.net_amount ? (e.net_amount / 100).toString() : "0"
                              }
                              onBlur={(ev) =>
                                onExpenseFieldChange(e, "net_amount", ev.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Slett rad"
                              onClick={() => deleteEntry.mutate(e.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!activeBookId && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Ingen økonomibok funnet. Opprett en for å komme i gang.
              </p>
              <Button onClick={handleCreateBook} disabled={createBook.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Opprett økonomibok
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
