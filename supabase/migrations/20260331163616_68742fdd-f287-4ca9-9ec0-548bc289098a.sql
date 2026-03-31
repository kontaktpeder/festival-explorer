
CREATE INDEX IF NOT EXISTS idx_event_program_slots_event_id
  ON public.event_program_slots(event_id);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id
  ON public.event_participants(event_id);

CREATE INDEX IF NOT EXISTS idx_event_invitations_event_status
  ON public.event_invitations(event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_issue_event_status
  ON public.event_issue(event_id, status);
