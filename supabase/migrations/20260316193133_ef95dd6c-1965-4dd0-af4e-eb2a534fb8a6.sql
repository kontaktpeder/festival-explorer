ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS voucher_number text NULL,
ADD COLUMN IF NOT EXISTS attachment_url text NULL,
ADD COLUMN IF NOT EXISTS attachment_name text NULL;