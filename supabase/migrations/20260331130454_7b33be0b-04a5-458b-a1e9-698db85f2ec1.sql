
-- Add archived_at columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_archived_at
  ON public.events(archived_at);

CREATE INDEX IF NOT EXISTS idx_festivals_archived_at
  ON public.festivals(archived_at);

-- Comments
COMMENT ON COLUMN public.events.archived_at IS 'Soft-archive timestamp. NULL = active.';
COMMENT ON COLUMN public.festivals.archived_at IS 'Soft-archive timestamp. NULL = active.';

-- RPC: archive single event
CREATE OR REPLACE FUNCTION public.archive_event(p_event_id uuid, p_archive boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_edit_event(p_event_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Ingen tilgang';
  END IF;

  UPDATE public.events
  SET archived_at = CASE WHEN p_archive THEN now() ELSE NULL END
  WHERE id = p_event_id;
END;
$$;

-- RPC: archive festival + linked events
CREATE OR REPLACE FUNCTION public.archive_festival_with_events(p_festival_id uuid, p_archive boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_edit_events(p_festival_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Ingen tilgang';
  END IF;

  UPDATE public.festivals
  SET archived_at = CASE WHEN p_archive THEN now() ELSE NULL END
  WHERE id = p_festival_id;

  UPDATE public.events e
  SET archived_at = CASE WHEN p_archive THEN now() ELSE NULL END
  WHERE EXISTS (
    SELECT 1
    FROM public.festival_events fe
    WHERE fe.festival_id = p_festival_id
      AND fe.event_id = e.id
  );
END;
$$;
