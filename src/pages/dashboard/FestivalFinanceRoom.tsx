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
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

import {
  useFinanceBooks,
  useFinanceEntries,
  useCreateFinanceBook,
  useUpsertExpenseEntry,
  useDeleteFinanceEntry,
  useImportTicketRevenue,
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

  const { data: entries, isLoading: entriesLoading } = useFinanceEntries(activeBookId || undefined);
  const expenseMutation = useUpsertExpenseEntry(activeBookId || "");
  const deleteEntry = useDeleteFinanceEntry(activeBookId || "");

  const isLoading = booksLoading || (!!activeBookId && entriesLoading);

  const { incomeTotal, feeTotal, expenseTotal } = useMemo(() => {
    let income = 0;
    let fee = 0;
    let expense = 0;

    (entries || []).forEach((e) => {
      if (e.entry_type === "income") {
        income += e.gross_amount;
        if (e.fee_amount) fee += e.fee_amount;
      } else if (e.entry_type === "expense") {
        expense += e.net_amount;
      }
    });

    return { incomeTotal: income, feeTotal: fee, expenseTotal: expense };
  }, [entries]);

  const netIncome = incomeTotal - feeTotal;
  const result = netIncome - expenseTotal;

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
    const lastExpense = (entries || [])
      .filter((e) => e.entry_type === "expense")
      .slice(-1)[0];
    const today = new Date().toISOString().slice(0, 10);
    expenseMutation.mutate({
      description: lastExpense?.description || "Ny utgift",
      category: lastExpense?.category || "Diverse",
      counterparty: lastExpense?.counterparty || null,
      gross_amount: 0,
      net_amount: 0,
      date_incurred: lastExpense?.date_incurred || today,
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      .filter((e) => e.entry_type === "income")
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
                    {(entries || []).filter((e) => e.entry_type === "income")
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
                  <Button size="sm" onClick={handleAddExpense}>
                    <Plus className="h-4 w-4 mr-1" />
                    Legg til utgift
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dato</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Beskrivelse</TableHead>
                      <TableHead>Mottaker</TableHead>
                      <TableHead className="text-right">Beløp (kr)</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(entries || [])
                      .filter((e) => e.entry_type === "expense")
                      .map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Input
                              type="date"
                              className="w-[130px]"
                              defaultValue={e.date_incurred}
                              onBlur={(ev) =>
                                onExpenseFieldChange(
                                  e,
                                  "date_incurred",
                                  ev.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-[120px]"
                              defaultValue={e.category || ""}
                              onBlur={(ev) =>
                                onExpenseFieldChange(
                                  e,
                                  "category",
                                  ev.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={e.description}
                              onBlur={(ev) =>
                                onExpenseFieldChange(
                                  e,
                                  "description",
                                  ev.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-[120px]"
                              defaultValue={e.counterparty || ""}
                              onBlur={(ev) =>
                                onExpenseFieldChange(
                                  e,
                                  "counterparty",
                                  ev.target.value
                                )
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
                                onExpenseFieldChange(
                                  e,
                                  "net_amount",
                                  ev.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteEntry.mutate(e.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {(entries || []).filter((e) => e.entry_type === "expense")
                      .length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          Ingen utgifter lagt til ennå.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
