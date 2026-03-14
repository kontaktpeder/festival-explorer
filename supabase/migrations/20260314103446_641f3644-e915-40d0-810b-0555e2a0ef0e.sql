
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS sales_start timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sales_end timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.ticket_types.sales_start IS 'When ticket sales open. NULL = always open.';
COMMENT ON COLUMN public.ticket_types.sales_end IS 'When ticket sales close. NULL = never closes.';
