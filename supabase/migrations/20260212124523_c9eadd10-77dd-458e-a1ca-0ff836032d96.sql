
CREATE OR REPLACE FUNCTION public.reserve_ticket_slot_atomic(
  p_ticket_type_id uuid,
  p_event_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_stripe_session_id text,
  p_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_capacity int;
  v_sold_count int;
  v_ticket_id uuid;
  v_ticket_code text;
BEGIN
  -- Lock ticket_types row to prevent race on capacity
  SELECT capacity
  INTO v_capacity
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    RETURN jsonb_build_object('result', 'error', 'reason', 'ticket_type_not_found');
  END IF;

  -- Count sold tickets (non-cancelled)
  SELECT count(*)
  INTO v_sold_count
  FROM public.tickets
  WHERE ticket_type_id = p_ticket_type_id
    AND status <> 'CANCELLED';

  IF v_sold_count >= v_capacity THEN
    RETURN jsonb_build_object('result', 'sold_out');
  END IF;

  -- Generate unique ticket code
  SELECT generate_ticket_code() INTO v_ticket_code;

  INSERT INTO public.tickets (
    event_id,
    ticket_type_id,
    buyer_name,
    buyer_email,
    ticket_code,
    stripe_session_id,
    stripe_payment_intent_id,
    status
  )
  VALUES (
    p_event_id,
    p_ticket_type_id,
    p_buyer_name,
    p_buyer_email,
    v_ticket_code,
    p_stripe_session_id,
    p_payment_intent_id,
    'VALID'
  )
  RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object(
    'result', 'success',
    'ticket_id', v_ticket_id,
    'ticket_code', v_ticket_code
  );
END;
$$;
