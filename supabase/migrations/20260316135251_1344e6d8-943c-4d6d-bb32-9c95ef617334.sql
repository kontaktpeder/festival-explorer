ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS paid_by_kind text NULL,
ADD COLUMN IF NOT EXISTS paid_by_id uuid NULL,
ADD COLUMN IF NOT EXISTS paid_by_label text NULL;