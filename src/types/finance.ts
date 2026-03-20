export interface FestivalFinanceBook {
  id: string;
  festival_id: string | null;
  ticket_event_id: string | null;
  name: string;
  type: "budget" | "actual";
  currency: string;
  status: "draft" | "active" | "closed";
  created_by: string;
  created_at: string;
}

export type FinanceEntryType = "income" | "expense";
export type FinanceEntryStatus = "planned" | "confirmed" | "paid" | "cancelled";
export type FinancePaymentStatus = "unpaid" | "paid" | "partial" | "cancelled";
export type FinanceInvoiceStatus = "pending" | "received" | "not_required";

export interface FestivalFinanceEntry {
  id: string;
  book_id: string;
  entry_type: FinanceEntryType;
  source_type: "ticket" | "manual" | "stripe" | "adjustment" | string;
  category_id: string | null;
  category: string | null;
  subcategory: string | null;
  description: string;
  counterparty: string | null;
  quantity: number | null;
  unit_amount: number | null;
  gross_amount: number;
  fee_amount: number | null;
  net_amount: number;
  vat_rate: number | null;
  vat_amount: number | null;
  date_incurred: string;
  date_paid: string | null;
  status: FinanceEntryStatus;
  source_ref_type: string | null;
  source_ref_id: string | null;
  sort_order: number | null;
  notes: string | null;
  linked_entry_id: string | null;
  paid_by_kind: string | null;
  paid_by_id: string | null;
  paid_by_label: string | null;
  voucher_number: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  internal_only: boolean;
  payment_status: FinancePaymentStatus;
  paid_amount: number | null;
  created_at: string;
  created_by: string;
}
