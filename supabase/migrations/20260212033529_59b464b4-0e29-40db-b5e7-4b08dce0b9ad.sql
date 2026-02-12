-- 1. Create atomic check-in RPC (UPDATE tickets + INSERT checkins in one transaction)
CREATE OR REPLACE FUNCTION public.checkin_ticket_atomic(
  p_ticket_id uuid,
  p_checked_in_by uuid,
  p_method text DEFAULT 'qr',
  p_note text DEFAULT NULL,
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_checked_in_at timestamptz := now();
  v_updated_count int;
BEGIN
  -- Atomic UPDATE: only succeeds if ticket is still VALID
  UPDATE public.tickets
  SET status = 'USED',
      checked_in_at = v_checked_in_at,
      checked_in_by = p_checked_in_by
  WHERE id = p_ticket_id
    AND status = 'VALID';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Race condition or ticket no longer VALID
    RETURN jsonb_build_object('result', 'already_used', 'updated', 0);
  END IF;

  -- Insert checkins audit row (same transaction – rolls back if this fails)
  INSERT INTO public.checkins (ticket_id, checked_in_by, method, note, device_id)
  VALUES (p_ticket_id, p_checked_in_by, p_method, p_note, p_device_id);

  RETURN jsonb_build_object(
    'result', 'success',
    'updated', 1,
    'checked_in_at', v_checked_in_at
  );
END;
$$;

-- 2. Create atomic reset RPC (DELETE checkins + UPDATE tickets in one transaction)
CREATE OR REPLACE FUNCTION public.reset_checkin_atomic(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted int;
BEGIN
  -- Delete checkins first
  DELETE FROM public.checkins WHERE ticket_id = p_ticket_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Reset ticket
  UPDATE public.tickets
  SET status = 'VALID',
      checked_in_at = NULL,
      checked_in_by = NULL
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'result', 'success',
    'checkins_deleted', v_deleted
  );
END;
$$;

-- 3. Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_tickets_event_id_status ON public.tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON public.checkins(checked_in_at DESC);