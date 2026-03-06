
CREATE OR REPLACE FUNCTION public.get_ticket_sold_counts()
RETURNS TABLE(ticket_type_id uuid, sold_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.ticket_type_id, COUNT(*)::bigint AS sold_count
  FROM public.tickets t
  WHERE t.status <> 'CANCELLED'
  GROUP BY t.ticket_type_id;
$$;
