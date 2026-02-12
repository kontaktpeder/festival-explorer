-- Secure reset_checkin_atomic: only staff can call it
CREATE OR REPLACE FUNCTION public.reset_checkin_atomic(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted int;
BEGIN
  IF NOT public.is_staff() THEN
    RETURN jsonb_build_object('result', 'denied', 'error', 'Staff access required');
  END IF;

  DELETE FROM public.checkins WHERE ticket_id = p_ticket_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

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