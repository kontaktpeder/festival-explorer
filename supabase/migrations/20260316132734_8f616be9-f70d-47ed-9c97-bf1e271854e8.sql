ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS linked_entry_id uuid NULL
  REFERENCES public.festival_finance_entries(id) ON DELETE SET NULL;