
-- Add finance_owner_persona_id to festivals
ALTER TABLE public.festivals
ADD COLUMN IF NOT EXISTS finance_owner_persona_id uuid REFERENCES public.personas(id);

-- Add new columns to festival_finance_entries
ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.festival_finance_entries
ADD COLUMN IF NOT EXISTS paid_amount bigint NULL;

-- Add check constraint for payment_status via trigger (safer than CHECK)
CREATE OR REPLACE FUNCTION public.validate_finance_entry_payment_status()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_status NOT IN ('unpaid', 'paid', 'partial', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  IF NEW.payment_status = 'partial' AND NEW.paid_amount IS NULL THEN
    RAISE EXCEPTION 'paid_amount required when payment_status is partial';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_finance_entry_payment_status ON public.festival_finance_entries;
CREATE TRIGGER trg_validate_finance_entry_payment_status
  BEFORE INSERT OR UPDATE ON public.festival_finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_finance_entry_payment_status();

-- Update import_ticket_revenue_for_book to set new fields
CREATE OR REPLACE FUNCTION public.import_ticket_revenue_for_book(
  p_book_id uuid,
  p_ticket_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_fee_per_ticket bigint := 900;
  v_max_seq integer;
  v_year text;
BEGIN
  -- Remove existing ticket-imported entries for this book
  DELETE FROM public.festival_finance_entries
  WHERE book_id = p_book_id
    AND entry_type = 'income'
    AND source_type = 'ticket';

  -- Determine year from ticket event
  SELECT EXTRACT(YEAR FROM COALESCE(te.starts_at, now()))::text
  INTO v_year
  FROM public.ticket_events te
  WHERE te.id = p_ticket_event_id;

  IF v_year IS NULL THEN
    v_year := EXTRACT(YEAR FROM now())::text;
  END IF;

  -- Find max existing voucher sequence for this book + year
  SELECT COALESCE(MAX(
    CASE
      WHEN e.voucher_number ~ ('^' || v_year || '-[0-9]+$')
      THEN SUBSTRING(e.voucher_number FROM LENGTH(v_year) + 2)::integer
      ELSE 0
    END
  ), 0)
  INTO v_max_seq
  FROM public.festival_finance_entries e
  WHERE e.book_id = p_book_id;

  -- Insert aggregated entries per ticket type with voucher numbers
  INSERT INTO public.festival_finance_entries (
    book_id, entry_type, source_type, category, description, counterparty,
    quantity, unit_amount, gross_amount, fee_amount, net_amount,
    vat_rate, vat_amount, date_incurred, status,
    source_ref_type, source_ref_id, created_by,
    internal_only, payment_status, paid_amount, voucher_number
  )
  SELECT
    p_book_id,
    'income',
    'ticket',
    'Billettsalg',
    CONCAT(tt.name, ' (', tt.code, ')'),
    NULL::text,
    COUNT(*)::numeric,
    tt.price_nok::bigint,
    (COUNT(*)::bigint * tt.price_nok::bigint),
    (SUM(
      CASE
        WHEN t.stripe_session_id IS NOT NULL
         AND t.stripe_session_id NOT ILIKE 'internal-%'
         AND COALESCE(tt.charge_stripe_fee, true) = true
        THEN 1 ELSE 0
      END
    )::bigint * v_fee_per_ticket),
    (COUNT(*)::bigint * tt.price_nok::bigint)
      - (SUM(
          CASE
            WHEN t.stripe_session_id IS NOT NULL
             AND t.stripe_session_id NOT ILIKE 'internal-%'
             AND COALESCE(tt.charge_stripe_fee, true) = true
            THEN 1 ELSE 0
          END
        )::bigint * v_fee_per_ticket),
    NULL::numeric,
    NULL::bigint,
    COALESCE(
      (SELECT te.starts_at::date FROM public.ticket_events te WHERE te.id = tt.event_id),
      now()::date
    ),
    'confirmed',
    'ticket_type',
    tt.id::text,
    auth.uid(),
    false,
    'paid',
    (COUNT(*)::bigint * tt.price_nok::bigint)
      - (SUM(
          CASE
            WHEN t.stripe_session_id IS NOT NULL
             AND t.stripe_session_id NOT ILIKE 'internal-%'
             AND COALESCE(tt.charge_stripe_fee, true) = true
            THEN 1 ELSE 0
          END
        )::bigint * v_fee_per_ticket),
    v_year || '-' || LPAD((v_max_seq + ROW_NUMBER() OVER (ORDER BY tt.id))::text, 4, '0')
  FROM public.tickets t
  JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.event_id = p_ticket_event_id
    AND t.status <> 'CANCELLED'
    AND t.refunded_at IS NULL
    AND t.chargeback_at IS NULL
  GROUP BY tt.id, tt.name, tt.code, tt.price_nok, tt.event_id, tt.charge_stripe_fee;
END;
$$;
