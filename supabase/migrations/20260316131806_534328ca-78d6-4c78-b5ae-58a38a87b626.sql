
-- 1. Add charge_stripe_fee column to ticket_types
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS charge_stripe_fee boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ticket_types.charge_stripe_fee IS
'Skal denne billettypen ha Stripe-gebyr i regnskap/import?';

-- 2. Set charge_stripe_fee = false for internal ticket types (LISTE, CREW, MUSIKERE)
UPDATE public.ticket_types
SET charge_stripe_fee = false
WHERE code IN ('LISTE', 'CREW', 'MUSIKERE');

-- 3. Replace import_ticket_revenue_for_book to exclude internal tickets from fees
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
  v_fee_per_ticket bigint := 900; -- 9 kr in øre
BEGIN
  -- Remove existing ticket-imported entries for this book
  DELETE FROM public.festival_finance_entries
  WHERE book_id = p_book_id
    AND entry_type = 'income'
    AND source_type = 'ticket';

  -- Insert aggregated entries per ticket type
  INSERT INTO public.festival_finance_entries (
    book_id,
    entry_type,
    source_type,
    category,
    description,
    counterparty,
    quantity,
    unit_amount,
    gross_amount,
    fee_amount,
    net_amount,
    vat_rate,
    vat_amount,
    date_incurred,
    status,
    source_ref_type,
    source_ref_id,
    created_by
  )
  SELECT
    p_book_id AS book_id,
    'income' AS entry_type,
    'ticket' AS source_type,
    'Billettsalg' AS category,
    CONCAT(tt.name, ' (', tt.code, ')') AS description,
    NULL::text AS counterparty,
    COUNT(*)::numeric AS quantity,
    tt.price_nok::bigint AS unit_amount,
    (COUNT(*)::bigint * tt.price_nok::bigint) AS gross_amount,
    -- Stripe fee only on tickets that actually went through Stripe AND type has charge_stripe_fee
    (SUM(
      CASE
        WHEN t.stripe_session_id IS NOT NULL
         AND t.stripe_session_id NOT ILIKE 'internal-%'
         AND COALESCE(tt.charge_stripe_fee, true) = true
        THEN 1 ELSE 0
      END
    )::bigint * v_fee_per_ticket) AS fee_amount,
    (COUNT(*)::bigint * tt.price_nok::bigint)
      - (SUM(
          CASE
            WHEN t.stripe_session_id IS NOT NULL
             AND t.stripe_session_id NOT ILIKE 'internal-%'
             AND COALESCE(tt.charge_stripe_fee, true) = true
            THEN 1 ELSE 0
          END
        )::bigint * v_fee_per_ticket) AS net_amount,
    NULL::numeric AS vat_rate,
    NULL::bigint AS vat_amount,
    COALESCE(
      (SELECT te.starts_at::date FROM public.ticket_events te WHERE te.id = tt.event_id),
      now()::date
    ) AS date_incurred,
    'confirmed' AS status,
    'ticket_type' AS source_ref_type,
    tt.id::text AS source_ref_id,
    auth.uid() AS created_by
  FROM public.tickets t
  JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.event_id = p_ticket_event_id
    AND t.status <> 'CANCELLED'
    AND t.refunded_at IS NULL
    AND t.chargeback_at IS NULL
  GROUP BY tt.id, tt.name, tt.code, tt.price_nok, tt.event_id, tt.charge_stripe_fee;
END;
$$;
