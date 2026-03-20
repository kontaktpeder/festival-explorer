import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RecipientPicker } from "@/components/finance/RecipientPicker";
import { useFinancePayers } from "@/hooks/useFinancePayers";
import { Plus, Trash2, ArrowLeft, Undo2, TrendingUp, TrendingDown, Receipt, Wallet, ChevronRight, FolderOpen, Download, Paperclip, ExternalLink, Upload } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFinanceAttachmentUpload } from "@/hooks/useFinanceAttachmentUpload";

import {
  useFinanceBooks, useFinanceEntries, useCreateFinanceBook,
  useUpsertExpenseEntry, useUpsertIncomeEntry, useDeleteFinanceEntry,
  useImportTicketRevenue, useFinanceCategoriesForFestival,
} from "@/hooks/useFestivalFinance";

import type { FestivalFinanceEntry } from "@/types/finance";

function formatNok(ore: number | null | undefined): string {
  const v = (ore ?? 0) / 100;
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", minimumFractionDigits: 0 }).format(v);
}

/* ── Types for grouped data ── */
interface SubGroup {
  subcategory: string;
  items: FestivalFinanceEntry[];
  totalNet: number;
}
interface CategoryGroup {
  category: string;
  items: FestivalFinanceEntry[];
  subGroups: SubGroup[];
  totalNet: number;
}

function buildCategoryGroups(entries: FestivalFinanceEntry[], entryType: "expense" | "income", excludeSourceType?: string): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  const filtered = entries.filter((e) => e.entry_type === entryType && (excludeSourceType ? e.source_type !== excludeSourceType : true));

  filtered.forEach((e) => {
    const catKey = e.category || "Uten kategori";
    if (!groups.has(catKey)) {
      groups.set(catKey, { category: catKey, items: [], subGroups: [], totalNet: 0 });
    }
    const g = groups.get(catKey)!;
    g.items.push(e);
    g.totalNet += e.net_amount;
  });

  // Build subcategory groups within each category
  groups.forEach((g) => {
    const subMap = new Map<string, SubGroup>();
    g.items.forEach((e) => {
      const subKey = e.subcategory || "";
      if (!subMap.has(subKey)) {
        subMap.set(subKey, { subcategory: subKey, items: [], totalNet: 0 });
      }
      const s = subMap.get(subKey)!;
      s.items.push(e);
      s.totalNet += e.net_amount;
    });
    g.subGroups = Array.from(subMap.values()).sort((a, b) => a.subcategory.localeCompare(b.subcategory, "nb"));
  });

  return Array.from(groups.values()).sort((a, b) => a.category.localeCompare(b.category, "nb"));
}

/* ── Mobile entry card ── */
function EntryCard({ fields, actions }: { fields: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3 shadow-sm">
      {fields}
      <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">{actions}</div>
    </div>
  );
}

/* ── Inline editable cell: read-first, click to edit ── */
function EditableText({ value, onSave, placeholder, type = "text", className = "", align = "left" }: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  className?: string;
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        className={`h-7 text-xs px-1.5 ${align === "right" ? "text-right tabular-nums" : ""} ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      />
    );
  }

  const displayValue = value || placeholder || "—";
  const isEmpty = !value;

  return (
    <span
      className={`block cursor-pointer rounded px-1.5 py-1 text-xs transition-colors hover:bg-muted/60 ${align === "right" ? "text-right tabular-nums" : ""} ${isEmpty ? "text-muted-foreground/50 italic" : ""} ${className}`}
      onClick={() => setEditing(true)}
      title={value || undefined}
    >
      {displayValue}
    </span>
  );
}

export default function FestivalFinanceRoom() {
  const { id: festivalId } = useParams<{ id: string }>();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [showOnlyMissingAttachments, setShowOnlyMissingAttachments] = useState(false);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; },
  });

  const { data: festival } = useQuery({
    queryKey: ["festival-for-finance", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("festivals").select("id, name, finance_owner_persona_id").eq("id", festivalId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!festivalId,
  });

  const { data: financeOwnerName } = useQuery({
    queryKey: ["finance-owner-name", (festival as any)?.finance_owner_persona_id],
    queryFn: async () => {
      const pid = (festival as any)?.finance_owner_persona_id;
      if (!pid) return null;
      const { data } = await supabase.from("personas").select("name").eq("id", pid).single();
      return data?.name ?? null;
    },
    enabled: !!(festival as any)?.finance_owner_persona_id,
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
    let income = 0, fee = 0, expense = 0, reimbursements = 0;
    (entries || []).forEach((e) => {
      if (e.entry_type === "income") {
        if (e.source_type === "ticket") { income += e.gross_amount; if (e.fee_amount) fee += e.fee_amount; }
        else if (e.source_type !== "reimbursement") { income += e.net_amount; }
      } else if (e.entry_type === "expense") {
        if (e.source_type === "reimbursement") { reimbursements += e.net_amount; }
        else { expense += e.net_amount; }
      }
    });
    return { incomeTotal: income, feeTotal: fee, expenseTotal: expense, reimbursementTotal: reimbursements };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const all = entries || [];
    if (!showOnlyMissingAttachments) return all;
    return all.filter((e) => !e.attachment_url || e.attachment_url.trim() === "");
  }, [entries, showOnlyMissingAttachments]);

  const expenseGroups = useMemo(
    () => buildCategoryGroups(filteredEntries.filter((e) => e.source_type !== "reimbursement"), "expense"),
    [filteredEntries]
  );

  const incomeGroups = useMemo(
    () => buildCategoryGroups(filteredEntries.filter((e) => e.source_type !== "ticket"), "income"),
    [filteredEntries]
  );

  const reimbursementEntries = useMemo(
    () => filteredEntries.filter((e) => e.source_type === "reimbursement"),
    [filteredEntries]
  );

  const netIncome = incomeTotal - feeTotal;
  const netExpense = expenseTotal + reimbursementTotal;
  const result = netIncome - netExpense;

  // Unique subcategory suggestions per category
  const subcategorySuggestions = useMemo(() => {
    const subs = new Set<string>();
    (entries || []).forEach((e) => { if (e.subcategory) subs.add(e.subcategory); });
    return Array.from(subs).sort();
  }, [entries]);

  const handleCreateBook = async () => {
    if (!user) return;
    try {
      const defaultName = "Regnskap";
      const book = await createBook.mutateAsync({
        festival_id: festivalId || null, ticket_event_id: null,
        name: books && books.length === 0 ? defaultName : `${defaultName} ${(books?.length || 0) + 1}`,
        created_by: user.id,
      });
      setSelectedBookId(book.id);
      toast.success("Økonomibok opprettet");
    } catch (e: any) { toast.error(e.message || "Kunne ikke opprette bok"); }
  };

  const { uploadAttachment, isUploading: isUploadingAttachment } = useFinanceAttachmentUpload();

  // Voucher numbers are allocated atomically by the DB trigger (allocate_voucher_number).
  // Frontend never generates or overwrites voucher_number.

  const handleAddExpense = () => {
    if (!activeBookId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    expenseMutation.mutate({
      description: "", category: null, counterparty: null,
      gross_amount: 0, net_amount: 0, date_incurred: today,
      created_by: user.id,
    });
  };

  const onExpenseFieldChange = (entry: FestivalFinanceEntry, field: keyof FestivalFinanceEntry, value: string) => {
    const patch: any = { id: entry.id };
    if (field === "gross_amount" || field === "net_amount" || field === "paid_amount") {
      const n = parseInt(value.replace(/\s/g, ""), 10);
      patch[field] = isNaN(n) ? 0 : (field === "paid_amount" ? n : n * 100);
    } else if (field === "date_incurred") {
      patch.date_incurred = value;
      // Voucher is locked by DB trigger — warn if year mismatch
      if (entry.voucher_number && value.slice(0, 4) !== entry.voucher_number.slice(0, 4)) {
        toast.warning(`Bilagsnr ${entry.voucher_number} ble opprettet for et annet år. Vurder å opprette ny rad i stedet.`);
      }
    }
    else { patch[field] = value; }
    expenseMutation.mutate(patch);
  };

  const handleAddIncome = () => {
    if (!activeBookId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    incomeMutation.mutate({
      description: "", category: null, counterparty: null,
      gross_amount: 0, net_amount: 0, date_incurred: today,
      created_by: user.id,
    });
  };

  const onIncomeFieldChange = (entry: FestivalFinanceEntry, field: keyof FestivalFinanceEntry, value: string) => {
    const patch: any = { id: entry.id };
    if (field === "gross_amount" || field === "net_amount" || field === "paid_amount") {
      const n = parseInt(value.replace(/\s/g, ""), 10);
      patch[field] = isNaN(n) ? 0 : (field === "paid_amount" ? n : n * 100);
    } else if (field === "date_incurred") {
      patch.date_incurred = value;
      if (entry.voucher_number && value.slice(0, 4) !== entry.voucher_number.slice(0, 4)) {
        toast.warning(`Bilagsnr ${entry.voucher_number} ble opprettet for et annet år. Vurder å opprette ny rad i stedet.`);
      }
    }
    else { patch[field] = value; }
    incomeMutation.mutate(patch);
  };

  const handleImportTickets = async () => {
    if (!activeBookId) { toast.error("Ingen økonomibok valgt."); return; }
    const { data: ticketEvent, error } = await supabase.from("ticket_events").select("id").limit(1).single();
    if (error || !ticketEvent) { toast.error("Fant ingen ticket event å importere fra."); return; }
    try {
      await importTickets.mutateAsync({ bookId: activeBookId, ticketEventId: ticketEvent.id });
      toast.success("Billettsalg importert til økonomiboken.");
    } catch (e: any) { toast.error(e?.message || "Kunne ikke importere billettsalg."); }
  };

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) { toast.info("Ingen transaksjoner å eksportere."); return; }
    const headers = ["Dato", "Bilagsnr", "Type", "Kategori", "Underkategori", "Beskrivelse", "Mottaker", "Betalt av", "Beløp (kr)", "Status", "Vedlegg"];
    const rows = entries.map((e) => {
      const amount = (e.net_amount ?? 0) / 100;
      return [
        e.date_incurred ?? "", e.voucher_number ?? "", e.entry_type ?? "", e.category ?? "", e.subcategory ?? "",
        e.description ?? "", e.counterparty ?? "", e.paid_by_label ?? "",
        amount.toString().replace(".", ","), e.status ?? "", e.attachment_url ?? "",
      ];
    });
    const csvContent = [headers, ...rows].map((r) => r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `festival-finance-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportEnkCSV = () => {
    if (!entries || entries.length === 0) { toast.info("Ingen transaksjoner å eksportere."); return; }
    if (!financeOwnerName) { toast.error("Økonomiansvarlig (ENK) er ikke satt. Gå til Innstillinger."); return; }

    const included = entries.filter((e) => !e.internal_only && e.payment_status !== "cancelled");

    // Validate
    for (const e of included) {
      const label = e.description?.trim() || e.voucher_number || e.id;
      if (!e.voucher_number || !e.voucher_number.trim()) { toast.error(`Bilagsnr mangler for rad: ${label}`); return; }
      const cp = (e.counterparty ?? "").trim();
      const motpart = cp || (e.source_type === "ticket" ? "Billetthandel" : "");
      if (!motpart && e.source_type !== "ticket") { toast.error(`Motpart mangler for manuell rad: ${label}`); return; }
      if (e.source_type !== "ticket" && (!e.attachment_url || !e.attachment_url.trim())) { toast.error(`Vedlegg mangler for manuell rad: ${label}`); return; }
      if (e.payment_status === "partial") {
        if (e.paid_amount == null || e.paid_amount <= 0) { toast.error(`Betalt beløp må være > 0 for delvis betalt rad: ${label}`); return; }
        if (e.paid_amount > e.net_amount) { toast.error(`Betalt beløp (${e.paid_amount / 100} kr) kan ikke overstige netto (${e.net_amount / 100} kr): ${label}`); return; }
      }
    }

    const headers = ["Dato", "Bilagsnr", "Type", "Motpart", "Betalt av", "Beløp (kr)", "Payment status", "Betalt beløp (kr)", "Vedlegg"];
    const rows = included.map((e) => {
      const cp = (e.counterparty ?? "").trim();
      const motpart = cp || (e.source_type === "ticket" ? "Billetthandel" : "");
      const amount = ((e.net_amount ?? 0) / 100).toString().replace(".", ",");
      const paidAmt = e.payment_status === "partial" && e.paid_amount != null ? (e.paid_amount / 100).toString().replace(".", ",") : "";
      return [e.date_incurred ?? "", e.voucher_number ?? "", e.entry_type ?? "", motpart, financeOwnerName, amount, e.payment_status ?? "", paidAmt, e.attachment_url ?? ""];
    });

    const csvContent = [headers, ...rows].map((r) => r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `festival-enk-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  if (!festivalId) return <p className="p-6 text-muted-foreground">Mangler festival-ID.</p>;

  /* ── Shared action buttons ── */
  const expenseActions = (e: FestivalFinanceEntry) => (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Dupliser"
        onClick={() => { if (!user) return; expenseMutation.mutate({ description: e.description, category: e.category, subcategory: e.subcategory, counterparty: e.counterparty, gross_amount: e.gross_amount, net_amount: e.net_amount, date_incurred: e.date_incurred, notes: e.notes, created_by: user.id }); }}>
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Refusjon"
        onClick={() => { if (!user) return; expenseMutation.mutate({ description: `Refusjon: ${e.description}`, category: e.category || "Refusjon / kostnadsdeling", counterparty: null, gross_amount: -(e.net_amount ?? 0), net_amount: -(e.net_amount ?? 0), date_incurred: e.date_incurred, source_type: "reimbursement", linked_entry_id: e.id, created_by: user.id, internal_only: true, payment_status: "cancelled" as any }); }}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Slett"
        onClick={() => deleteEntry.mutate(e.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  const incomeActions = (e: FestivalFinanceEntry) => (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Dupliser"
        onClick={() => { if (!user) return; incomeMutation.mutate({ description: e.description, category: e.category, subcategory: e.subcategory, counterparty: e.counterparty, gross_amount: e.gross_amount, net_amount: e.net_amount, date_incurred: e.date_incurred, notes: e.notes, created_by: user.id }); }}>
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Slett"
        onClick={() => deleteEntry.mutate(e.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  const PaidBySelect = ({ entry }: { entry: FestivalFinanceEntry }) => (
    <Select value={entry.paid_by_id ?? "__none__"} onValueChange={(value) => {
      if (value === "__none__") { expenseMutation.mutate({ id: entry.id, paid_by_kind: null, paid_by_id: null, paid_by_label: null }); return; }
      const selected = payers.find((p) => p.id === value);
      expenseMutation.mutate({ id: entry.id, paid_by_kind: selected ? "persona" : "other", paid_by_id: selected?.id ?? null, paid_by_label: selected?.name ?? null });
    }}>
      <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Velg betaler" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Ingen valgt</SelectItem>
        {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  /* ── Render entries in a table (desktop) ── */
  const AttachmentCell = ({ entry, onFieldChange }: { entry: FestivalFinanceEntry; onFieldChange: typeof onExpenseFieldChange }) => (
    <div className="flex items-center gap-1.5 min-w-0">
      {entry.attachment_url ? (
        <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline min-w-0" title={entry.attachment_name || "Åpne vedlegg"}>
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{entry.attachment_name || "Vedlegg"}</span>
        </a>
      ) : (
        <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors">
          <input type="file" className="hidden" onChange={async (ev) => {
            const file = ev.target.files?.[0];
            if (!file || !festivalId) return;
            try {
              const result = await uploadAttachment(file, festivalId, entry.voucher_number);
              onFieldChange(entry, "attachment_url", result.url);
              onFieldChange(entry, "attachment_name", result.name);
            } catch (err: any) { toast.error(err.message || "Kunne ikke laste opp bilag"); }
            finally { ev.target.value = ""; }
          }} />
          <Upload className="h-3 w-3 shrink-0" />
          <span>{isUploadingAttachment ? "..." : "Last opp"}</span>
        </label>
      )}
    </div>
  );

  const PaymentStatusSelect = ({ entry, onFieldChange }: { entry: FestivalFinanceEntry; onFieldChange: typeof onExpenseFieldChange }) => (
    <div className="flex items-center gap-1">
      <Select value={entry.payment_status ?? "unpaid"} onValueChange={(v) => onFieldChange(entry, "payment_status" as any, v)}>
        <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unpaid">Ubetalt</SelectItem>
          <SelectItem value="paid">Betalt</SelectItem>
          <SelectItem value="partial">Delvis</SelectItem>
          <SelectItem value="cancelled">Kansellert</SelectItem>
        </SelectContent>
      </Select>
      {entry.payment_status === "partial" && (
        <Input type="number" className="h-7 text-xs w-[80px] tabular-nums" placeholder="Øre"
          defaultValue={entry.paid_amount != null ? (entry.paid_amount / 100).toString() : ""}
          onBlur={(ev) => { const n = parseInt(ev.target.value.replace(/\s/g, ""), 10); onFieldChange(entry, "paid_amount" as any, isNaN(n) ? "0" : (n * 100).toString()); }}
        />
      )}
    </div>
  );

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderExpenseTable = (items: FestivalFinanceEntry[]) => (
    <div className="w-full">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="w-[72px] py-2 px-2 font-medium">Bilag</th>
            <th className="w-[90px] py-2 px-1 font-medium">Dato</th>
            <th className="py-2 px-1 font-medium">Motpart</th>
            <th className="py-2 px-1 font-medium">Beskrivelse</th>
            <th className="w-[100px] py-2 px-1 font-medium text-right">Beløp</th>
            <th className="w-[90px] py-2 px-1 font-medium">Status</th>
            <th className="w-[36px] py-2 px-0" />
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const isExpanded = expandedRows.has(e.id);
            return (
              <Fragment key={e.id}>
                <tr className="group border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleRow(e.id)}>
                  <td className="py-1.5 px-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{e.voucher_number ?? ""}</td>
                  <td className="py-1.5 px-1">
                    <EditableText type="date" value={e.date_incurred} onSave={(v) => onExpenseFieldChange(e, "date_incurred", v)} />
                  </td>
                  <td className="py-1.5 px-1 truncate" title={e.counterparty || undefined}>
                    <span className="text-xs font-medium">{e.counterparty || <span className="text-muted-foreground/50 italic">—</span>}</span>
                  </td>
                  <td className="py-1.5 px-1 truncate text-xs text-muted-foreground" title={e.description || undefined}>{e.description || "—"}</td>
                  <td className="py-1.5 px-1 text-right text-xs tabular-nums font-medium">{formatNok(e.net_amount)}</td>
                  <td className="py-1.5 px-1">
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      e.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : e.payment_status === "partial" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : e.payment_status === "cancelled" ? "bg-muted text-muted-foreground line-through"
                        : "text-muted-foreground"
                    }`}>
                      {e.payment_status === "paid" ? "Betalt" : e.payment_status === "partial" ? "Delvis" : e.payment_status === "cancelled" ? "Kansellert" : "Ubetalt"}
                    </span>
                  </td>
                  <td className="py-1.5 px-0 text-right">
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-muted/20">
                    <td colSpan={7} className="px-3 py-3">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Motpart</span>
                          <RecipientPicker festivalId={festivalId!} value={e.counterparty} onChange={(val) => onExpenseFieldChange(e, "counterparty", val)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Beskrivelse</span>
                          <EditableText value={e.description} placeholder="Beskrivelse…" onSave={(v) => onExpenseFieldChange(e, "description", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Betalt av</span>
                          <PaidBySelect entry={e} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Beløp (kr)</span>
                          <EditableText type="number" value={e.net_amount ? (e.net_amount / 100).toString() : "0"} align="right" onSave={(v) => onExpenseFieldChange(e, "net_amount", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Betalingsstatus</span>
                          <PaymentStatusSelect entry={e} onFieldChange={onExpenseFieldChange} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Vedlegg</span>
                          <AttachmentCell entry={e} onFieldChange={onExpenseFieldChange} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Kategori</span>
                          <EditableText value={e.category || ""} placeholder="Kategori" onSave={(v) => onExpenseFieldChange(e, "category" as any, v)} />
                        </div>
                        <div className="flex items-end justify-end gap-1">
                          {expenseActions(e)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderExpenseMobileCards = (items: FestivalFinanceEntry[]) => (
    <div className="space-y-2">
      {items.map((e) => (
        <EntryCard key={e.id} actions={expenseActions(e)} fields={
          <div className="space-y-2">
            {e.voucher_number && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.voucher_number}</p>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beskrivelse</label>
              <Input className="h-8 text-sm" defaultValue={e.description} onBlur={(ev) => onExpenseFieldChange(e, "description", ev.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dato</label>
                <Input type="date" className="h-8 text-sm" defaultValue={e.date_incurred} onBlur={(ev) => onExpenseFieldChange(e, "date_incurred", ev.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beløp (kr)</label>
                <Input type="number" className="h-8 text-sm text-right tabular-nums" defaultValue={e.net_amount ? (e.net_amount / 100).toString() : "0"} onBlur={(ev) => onExpenseFieldChange(e, "net_amount", ev.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Underkategori</label>
                <Input list="finance-subcategory-suggestions" className="h-8 text-sm" defaultValue={e.subcategory || ""} placeholder="Underkategori" onBlur={(ev) => onExpenseFieldChange(e, "subcategory", ev.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mottaker</label>
                <RecipientPicker festivalId={festivalId!} value={e.counterparty} onChange={(val) => onExpenseFieldChange(e, "counterparty", val)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Betalt av</label>
              <PaidBySelect entry={e} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Betalingsstatus</label>
              <PaymentStatusSelect entry={e} onFieldChange={onExpenseFieldChange} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> Vedlegg</label>
              <div className="mt-1">
                <AttachmentCell entry={e} onFieldChange={onExpenseFieldChange} />
              </div>
            </div>
          </div>
        } />
      ))}
    </div>
  );

  const renderIncomeTable = (items: FestivalFinanceEntry[]) => (
    <div className="w-full">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="w-[90px] py-2 px-2 font-medium">Dato</th>
            <th className="py-2 px-1 font-medium">Fra</th>
            <th className="py-2 px-1 font-medium">Beskrivelse</th>
            <th className="w-[100px] py-2 px-1 font-medium text-right">Beløp</th>
            <th className="w-[90px] py-2 px-1 font-medium">Status</th>
            <th className="w-[36px] py-2 px-0" />
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const isExpanded = expandedRows.has(e.id);
            return (
              <Fragment key={e.id}>
                <tr className="group border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleRow(e.id)}>
                  <td className="py-1.5 px-2">
                    <EditableText type="date" value={e.date_incurred} onSave={(v) => onIncomeFieldChange(e, "date_incurred", v)} />
                  </td>
                  <td className="py-1.5 px-1 truncate text-xs font-medium" title={e.counterparty || undefined}>{e.counterparty || <span className="text-muted-foreground/50 italic">—</span>}</td>
                  <td className="py-1.5 px-1 truncate text-xs text-muted-foreground" title={e.description || undefined}>{e.description || "—"}</td>
                  <td className="py-1.5 px-1 text-right text-xs tabular-nums font-medium">{formatNok(e.net_amount)}</td>
                  <td className="py-1.5 px-1">
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      e.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : e.payment_status === "partial" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : e.payment_status === "cancelled" ? "bg-muted text-muted-foreground line-through"
                        : "text-muted-foreground"
                    }`}>
                      {e.payment_status === "paid" ? "Betalt" : e.payment_status === "partial" ? "Delvis" : e.payment_status === "cancelled" ? "Kansellert" : "Ubetalt"}
                    </span>
                  </td>
                  <td className="py-1.5 px-0 text-right">
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-muted/20">
                    <td colSpan={6} className="px-3 py-3">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Fra (motpart)</span>
                          <EditableText value={e.counterparty || ""} placeholder="Sponsor, ordning…" onSave={(v) => onIncomeFieldChange(e, "counterparty", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Beskrivelse</span>
                          <EditableText value={e.description} placeholder="Beskrivelse…" onSave={(v) => onIncomeFieldChange(e, "description", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Underkategori</span>
                          <EditableText value={e.subcategory || ""} placeholder="Underkategori" onSave={(v) => onIncomeFieldChange(e, "subcategory", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Beløp (kr)</span>
                          <EditableText type="number" value={e.net_amount ? (e.net_amount / 100).toString() : "0"} align="right" onSave={(v) => onIncomeFieldChange(e, "net_amount", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Betalingsstatus</span>
                          <PaymentStatusSelect entry={e} onFieldChange={onIncomeFieldChange} />
                        </div>
                        <div className="flex items-end justify-end gap-1">
                          {incomeActions(e)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderIncomeMobileCards = (items: FestivalFinanceEntry[]) => (
    <div className="space-y-2">
      {items.map((e) => (
        <EntryCard key={e.id} actions={incomeActions(e)} fields={
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beskrivelse</label>
              <Input className="h-8 text-sm" defaultValue={e.description} placeholder="Beskrivelse" onBlur={(ev) => onIncomeFieldChange(e, "description", ev.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dato</label>
                <Input type="date" className="h-8 text-sm" defaultValue={e.date_incurred} onBlur={(ev) => onIncomeFieldChange(e, "date_incurred", ev.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beløp (kr)</label>
                <Input type="number" className="h-8 text-sm text-right tabular-nums" defaultValue={e.net_amount ? (e.net_amount / 100).toString() : "0"} onBlur={(ev) => onIncomeFieldChange(e, "net_amount", ev.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Underkategori</label>
                <Input list="finance-subcategory-suggestions" className="h-8 text-sm" defaultValue={e.subcategory || ""} placeholder="Underkategori" onBlur={(ev) => onIncomeFieldChange(e, "subcategory", ev.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fra</label>
                <Input className="h-8 text-sm" defaultValue={e.counterparty || ""} placeholder="Sponsor" onBlur={(ev) => onIncomeFieldChange(e, "counterparty", ev.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Betalingsstatus</label>
              <PaymentStatusSelect entry={e} onFieldChange={onIncomeFieldChange} />
            </div>
          </div>
        } />
      ))}
    </div>
  );

  /* ── Collapsible category group ── */
  const renderCategoryGroup = (
    group: CategoryGroup,
    keyPrefix: string,
    renderDesktop: (items: FestivalFinanceEntry[]) => React.ReactNode,
    renderMobile: (items: FestivalFinanceEntry[]) => React.ReactNode,
  ) => {
    const groupKey = `${keyPrefix}-${group.category}`;
    const isOpen = openCategories.has(groupKey);
    const hasSubGroups = group.subGroups.length > 1 || (group.subGroups.length === 1 && group.subGroups[0].subcategory !== "");

    return (
      <Collapsible key={group.category} open={isOpen} onOpenChange={() => toggleCategory(groupKey)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group">
            <div className="flex items-center gap-2">
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <FolderOpen className="h-4 w-4 text-accent/70" />
              <span className="text-sm font-semibold">{group.category}</span>
              <span className="text-xs text-muted-foreground">{group.items.length} linje{group.items.length === 1 ? "" : "r"}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatNok(group.totalNet)}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2 md:pl-4 space-y-3 pt-1">
          {hasSubGroups ? (
            group.subGroups.map((sub) => (
              <div key={sub.subcategory || "__none__"} className="space-y-1">
                {sub.subcategory && (
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-medium text-muted-foreground">{sub.subcategory}</span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatNok(sub.totalNet)}</span>
                  </div>
                )}
                <div className="hidden md:block">{renderDesktop(sub.items)}</div>
                <div className="md:hidden">{renderMobile(sub.items)}</div>
              </div>
            ))
          ) : (
            <>
              <div className="hidden md:block">{renderDesktop(group.items)}</div>
              <div className="md:hidden">{renderMobile(group.items)}</div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="finance-theme min-h-[100svh]">
      <div className="max-w-6xl mx-auto px-3 py-4 md:px-8 md:py-8 space-y-6">
        <Link to={`/dashboard/festival/${festivalId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
          <ArrowLeft className="w-4 h-4" /><span>Tilbake til festivalrommet</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Økonomi</h1>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Regnskap · fokusmodus</p>
          </div>
          <div className="flex items-center gap-2">
            {books && books.length > 0 && (
              <Select value={activeBookId || ""} onValueChange={(v) => setSelectedBookId(v)}>
                <SelectTrigger className="w-[180px] md:w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {books.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.type})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!entries || entries.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV (Intern)
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportEnkCSV} disabled={!entries || entries.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV (ENK)
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateBook} disabled={createBook.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Ny bok
            </Button>
          </div>
        </div>

        {isLoading && <LoadingState message="Laster økonomi..." />}

        {activeBookId && !isLoading && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <SummaryCard label="Brutto inntekter" value={formatNok(incomeTotal)} variant="neutral" />
              <SummaryCard label="Gebyrer" value={formatNok(feeTotal)} variant="neutral" />
              <SummaryCard label="Netto inntekter" value={formatNok(netIncome)} variant="neutral" />
              <SummaryCard label="Totale utgifter" value={formatNok(expenseTotal)} variant="neutral" />
              {reimbursementTotal !== 0 && (
                <SummaryCard label="Refusjoner" value={formatNok(-reimbursementTotal)} variant="positive" />
              )}
              <SummaryCard label="Resultat" value={formatNok(result)}
                variant={result >= 0 ? "positive" : "negative"}
                className="col-span-2 md:col-span-1" />
            </div>

            {/* ── Ticket income ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg">Inntekter fra billetter</CardTitle>
                    <CardDescription className="text-xs">Aggregerte linjer per billettype (importert)</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleImportTickets} disabled={importTickets.isPending}>Importer billettsalg</Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ticketEntries = (entries || []).filter((e) => e.entry_type === "income" && e.source_type === "ticket");
                  if (!ticketEntries.length) return <p className="text-center text-muted-foreground py-6 text-sm">Ingen inntekter importert ennå.</p>;
                  return (
                    <>
                      <div className="hidden md:block">
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
                            {ticketEntries.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell className="font-medium">{e.description}</TableCell>
                                <TableCell className="text-right tabular-nums">{e.quantity ?? "-"}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNok(e.gross_amount)}</TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">{formatNok(e.fee_amount)}</TableCell>
                                <TableCell className="text-right tabular-nums font-medium">{formatNok(e.net_amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {ticketEntries.map((e) => (
                          <div key={e.id} className="rounded-md border border-border bg-card p-3 shadow-sm">
                            <p className="font-medium text-sm">{e.description}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span>Antall</span><span className="text-right text-foreground tabular-nums">{e.quantity ?? "-"}</span>
                              <span>Brutto</span><span className="text-right text-foreground tabular-nums">{formatNok(e.gross_amount)}</span>
                              <span>Gebyr</span><span className="text-right tabular-nums">{formatNok(e.fee_amount)}</span>
                              <span>Netto</span><span className="text-right text-foreground font-medium tabular-nums">{formatNok(e.net_amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* ── Manual income ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg">Andre inntekter</CardTitle>
                    <CardDescription className="text-xs">Sponsorer, støtte, barandel, merch m.m.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddIncome}><Plus className="h-4 w-4 mr-1" /> Ny inntekt</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {incomeGroups.map((group) => renderCategoryGroup(group, "income", renderIncomeTable, renderIncomeMobileCards))}
                {incomeGroups.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Ingen manuelle inntekter lagt til ennå.</p>}
              </CardContent>
            </Card>

            {/* ── Expenses ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg">Utgifter</CardTitle>
                    <CardDescription className="text-xs">Festivalens kostnader</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddExpense}><Plus className="h-4 w-4 mr-1" /> Ny rad</Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Switch id="only-missing-attachments" checked={showOnlyMissingAttachments} onCheckedChange={setShowOnlyMissingAttachments} />
                  <Label htmlFor="only-missing-attachments" className="text-xs text-muted-foreground">Vis kun rader uten vedlegg</Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {expenseGroups.map((group) => renderCategoryGroup(group, "expense", renderExpenseTable, renderExpenseMobileCards))}
                {expenseGroups.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Ingen utgifter lagt til ennå.</p>}

                {/* Total expenses footer */}
                {expenseGroups.length > 0 && (
                  <div className="flex items-center justify-between px-2 pt-3 border-t border-border/50">
                    <span className="text-sm font-bold">Totale utgifter</span>
                    <span className="text-sm font-bold tabular-nums">{formatNok(expenseTotal)}</span>
                  </div>
                )}

                <datalist id="finance-category-suggestions">
                  {(categorySuggestions || []).map((cat) => <option key={cat} value={cat} />)}
                </datalist>
                <datalist id="finance-subcategory-suggestions">
                  {subcategorySuggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </CardContent>
            </Card>

            {/* ── Reimbursements ── */}
            {reimbursementEntries.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Refusjoner / kostnadsdeling</CardTitle>
                  <CardDescription className="text-xs">Poster som reduserer utgiftene</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[110px]">Dato</TableHead>
                          <TableHead>Beskrivelse</TableHead>
                          <TableHead className="w-[130px]">Kategori</TableHead>
                          <TableHead className="w-[130px] text-right">Beløp (kr)</TableHead>
                          <TableHead className="w-16 text-right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reimbursementEntries.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-sm tabular-nums">{e.date_incurred}</TableCell>
                            <TableCell><Input className="h-8 text-xs" defaultValue={e.description} onBlur={(ev) => onExpenseFieldChange(e, "description", ev.target.value)} /></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{e.category || "–"}</TableCell>
                            <TableCell><Input type="number" className="h-8 text-xs text-right tabular-nums" defaultValue={e.net_amount ? (e.net_amount / 100).toString() : "0"} onBlur={(ev) => onExpenseFieldChange(e, "net_amount", ev.target.value)} /></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Slett" onClick={() => deleteEntry.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {reimbursementEntries.map((e) => (
                      <EntryCard key={e.id}
                        actions={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Slett" onClick={() => deleteEntry.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>}
                        fields={
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beskrivelse</label>
                              <Input className="h-8 text-sm" defaultValue={e.description} onBlur={(ev) => onExpenseFieldChange(e, "description", ev.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dato</label>
                                <p className="text-sm tabular-nums mt-1">{e.date_incurred}</p>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beløp (kr)</label>
                                <Input type="number" className="h-8 text-sm text-right tabular-nums" defaultValue={e.net_amount ? (e.net_amount / 100).toString() : "0"} onBlur={(ev) => onExpenseFieldChange(e, "net_amount", ev.target.value)} />
                              </div>
                            </div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!activeBookId && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Ingen økonomibok funnet. Opprett en for å komme i gang.</p>
              <Button onClick={handleCreateBook} disabled={createBook.isPending}><Plus className="h-4 w-4 mr-1" /> Opprett økonomibok</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
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
