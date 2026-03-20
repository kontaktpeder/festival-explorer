import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  FestivalFinanceBook,
  FestivalFinanceEntry,
  FinanceEntryType,
  FinanceEntryStatus,
} from "@/types/finance";

export function useFinanceBooks(festivalId?: string, ticketEventId?: string) {
  return useQuery({
    queryKey: ["finance-books", festivalId, ticketEventId],
    queryFn: async () => {
      let query = supabase
        .from("festival_finance_books")
        .select("*")
        .order("created_at", { ascending: true });

      if (festivalId) query = query.eq("festival_id", festivalId);
      if (ticketEventId) query = query.eq("ticket_event_id", ticketEventId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FestivalFinanceBook[];
    },
    enabled: !!festivalId || !!ticketEventId,
  });
}

export function useFinanceEntries(bookId?: string) {
  return useQuery({
    queryKey: ["finance-entries", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_finance_entries")
        .select("*")
        .eq("book_id", bookId!)
        .order("date_incurred", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as FestivalFinanceEntry[];
    },
    enabled: !!bookId,
  });
}

export function useCreateFinanceBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      festival_id: string | null;
      ticket_event_id: string | null;
      name: string;
      type?: "budget" | "actual";
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("festival_finance_books")
        .insert({
          festival_id: payload.festival_id,
          ticket_event_id: payload.ticket_event_id,
          name: payload.name,
          type: payload.type ?? "actual",
          created_by: payload.created_by,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as FestivalFinanceBook;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["finance-books", vars.festival_id, vars.ticket_event_id],
      });
    },
  });
}

export function useUpsertExpenseEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FestivalFinanceEntry> & { id?: string; created_by?: string }) => {
      const base = {
        book_id: bookId,
        entry_type: "expense" as FinanceEntryType,
        source_type: payload.source_type ?? "manual",
      };

      if (payload.id) {
        const { id, created_by, created_at, ...rest } = payload;
        const { data, error } = await supabase
          .from("festival_finance_entries")
          .update({ ...rest, ...base })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data as FestivalFinanceEntry;
      } else {
        const { data, error } = await supabase
          .from("festival_finance_entries")
          .insert({
            ...base,
            created_by: payload.created_by!,
            description: payload.description ?? "",
            gross_amount: payload.gross_amount ?? 0,
            net_amount: payload.net_amount ?? payload.gross_amount ?? 0,
            date_incurred: payload.date_incurred ?? new Date().toISOString().slice(0, 10),
            status: (payload.status ?? "confirmed") as FinanceEntryStatus,
            category: payload.category ?? null,
            counterparty: payload.counterparty ?? null,
            notes: payload.notes ?? null,
            internal_only: payload.internal_only ?? false,
            payment_status: payload.payment_status ?? "unpaid",
            paid_amount: payload.paid_amount ?? null,
          })
          .select("*")
          .single();
        if (error) throw error;
        return data as FestivalFinanceEntry;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-entries", bookId] });
    },
  });
}

export function useUpsertIncomeEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FestivalFinanceEntry> & { id?: string; created_by?: string }) => {
      const base = {
        book_id: bookId,
        entry_type: "income" as FinanceEntryType,
        source_type: payload.source_type ?? "manual",
      };

      if (payload.id) {
        const { id, created_by, created_at, ...rest } = payload;
        const { data, error } = await supabase
          .from("festival_finance_entries")
          .update({ ...rest, ...base })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data as FestivalFinanceEntry;
      } else {
        const { data, error } = await supabase
          .from("festival_finance_entries")
          .insert({
            ...base,
            created_by: payload.created_by!,
            description: payload.description ?? "",
            gross_amount: payload.gross_amount ?? 0,
            net_amount: payload.net_amount ?? payload.gross_amount ?? 0,
            date_incurred: payload.date_incurred ?? new Date().toISOString().slice(0, 10),
            status: (payload.status ?? "confirmed") as FinanceEntryStatus,
            category: payload.category ?? null,
            counterparty: payload.counterparty ?? null,
            notes: payload.notes ?? null,
            internal_only: payload.internal_only ?? false,
            payment_status: payload.payment_status ?? "unpaid",
            paid_amount: payload.paid_amount ?? null,
          })
          .select("*")
          .single();
        if (error) throw error;
        return data as FestivalFinanceEntry;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-entries", bookId] });
    },
  });
}

export function useDeleteFinanceEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("festival_finance_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-entries", bookId] });
    },
  });
}

export function useImportTicketRevenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookId,
      ticketEventId,
    }: {
      bookId: string;
      ticketEventId: string;
    }) => {
      const { error } = await supabase.rpc("import_ticket_revenue_for_book" as any, {
        p_book_id: bookId,
        p_ticket_event_id: ticketEventId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["finance-entries", vars.bookId] });
    },
  });
}

/** Distinct category strings used across all books for a festival */
export function useFinanceCategoriesForFestival(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-categories-festival", festivalId],
    queryFn: async () => {
      if (!festivalId) return [] as string[];

      const { data: books, error: booksError } = await supabase
        .from("festival_finance_books")
        .select("id")
        .eq("festival_id", festivalId);

      if (booksError) throw booksError;
      if (!books || books.length === 0) return [] as string[];

      const { data, error } = await supabase
        .from("festival_finance_entries")
        .select("category")
        .in("book_id", books.map((b) => b.id));

      if (error) throw error;

      const set = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.category) set.add(row.category as string);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, "nb"));
    },
    enabled: !!festivalId,
  });
}
