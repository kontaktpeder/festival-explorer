CREATE UNIQUE INDEX IF NOT EXISTS event_issue_one_open_rider_per_slot_idx
  ON public.event_issue (related_program_slot_id)
  WHERE type = 'rider_missing' AND status = 'open';