
-- Add invoice_status column
ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS invoice_status text NOT NULL DEFAULT 'pending';

-- Backfill: existing rows with attachment -> 'received'
UPDATE public.festival_finance_entries
SET invoice_status = 'received'
WHERE attachment_url IS NOT NULL AND attachment_url <> ''
  AND invoice_status = 'pending';

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_invoice_status()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.invoice_status NOT IN ('pending', 'received', 'not_required') THEN
    RAISE EXCEPTION 'Invalid invoice_status: %', NEW.invoice_status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_invoice_status
  BEFORE INSERT OR UPDATE ON public.festival_finance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_status();
