
-- 1) Unique index: no duplicate voucher per book
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_entries_book_voucher
  ON public.festival_finance_entries (book_id, voucher_number)
  WHERE voucher_number IS NOT NULL;

-- 2) Trigger function: auto-allocate voucher on INSERT (if null),
--    and protect existing voucher on UPDATE (never overwrite non-null).
CREATE OR REPLACE FUNCTION public.allocate_voucher_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_max_seq integer;
BEGIN
  -- On INSERT: allocate voucher if not already set
  IF TG_OP = 'INSERT' THEN
    IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
      v_year := EXTRACT(YEAR FROM NEW.date_incurred::date)::text;

      SELECT COALESCE(MAX(
        CASE
          WHEN e.voucher_number ~ ('^' || v_year || '-[0-9]+$')
          THEN SUBSTRING(e.voucher_number FROM LENGTH(v_year) + 2)::integer
          ELSE 0
        END
      ), 0)
      INTO v_max_seq
      FROM public.festival_finance_entries e
      WHERE e.book_id = NEW.book_id;

      NEW.voucher_number := v_year || '-' || LPAD((v_max_seq + 1)::text, 4, '0');
    END IF;
  END IF;

  -- On UPDATE: never overwrite an existing voucher
  IF TG_OP = 'UPDATE' THEN
    IF OLD.voucher_number IS NOT NULL AND OLD.voucher_number <> '' THEN
      NEW.voucher_number := OLD.voucher_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Attach trigger (before insert or update)
DROP TRIGGER IF EXISTS trg_allocate_voucher ON public.festival_finance_entries;
CREATE TRIGGER trg_allocate_voucher
  BEFORE INSERT OR UPDATE ON public.festival_finance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_voucher_number();
