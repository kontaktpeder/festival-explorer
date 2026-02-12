-- Deduplicate checkins: keep the latest check-in per ticket
DELETE FROM public.checkins a
USING public.checkins b
WHERE a.ticket_id = b.ticket_id
  AND a.checked_in_at < b.checked_in_at;

-- Ensure exactly one check-in row per ticket
ALTER TABLE public.checkins
ADD CONSTRAINT checkins_ticket_id_key UNIQUE (ticket_id);