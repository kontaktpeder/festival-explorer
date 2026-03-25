
-- 1. Live fields on event_program_slots
ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS live_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS actual_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS actual_ended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_note text NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Check constraint for consistent status values
ALTER TABLE public.event_program_slots
  DROP CONSTRAINT IF EXISTS event_program_slots_live_status_check;
ALTER TABLE public.event_program_slots
  ADD CONSTRAINT event_program_slots_live_status_check
  CHECK (live_status IN ('not_started','in_progress','completed','cancelled'));

-- 2. Operator permission flags
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS can_operate_runsheet boolean NOT NULL DEFAULT false;
ALTER TABLE public.festival_participants
  ADD COLUMN IF NOT EXISTS can_operate_runsheet boolean NOT NULL DEFAULT false;

-- 3. Helper functions for operator access

-- Event scope
CREATE OR REPLACE FUNCTION public.can_operate_runsheet_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.can_edit_event(p_event_id)
    OR EXISTS (
      SELECT 1
      FROM public.event_participants ep
      WHERE ep.event_id = p_event_id
        AND ep.can_operate_runsheet = true
        AND (
          (ep.participant_kind = 'persona' AND EXISTS (
            SELECT 1 FROM public.personas p
            WHERE p.id = ep.participant_id AND p.user_id = auth.uid()
          ))
          OR
          (ep.participant_kind = 'entity' AND EXISTS (
            SELECT 1 FROM public.entity_team et
            WHERE et.entity_id = ep.participant_id
              AND et.user_id = auth.uid()
              AND et.left_at IS NULL
              AND et.access IN ('owner','admin','editor')
          ))
        )
    );
$$;

-- Festival scope
CREATE OR REPLACE FUNCTION public.can_operate_runsheet_festival(p_festival_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.can_edit_events(p_festival_id)
    OR EXISTS (
      SELECT 1
      FROM public.festival_participants fp
      WHERE fp.festival_id = p_festival_id
        AND fp.can_operate_runsheet = true
        AND (
          (fp.participant_kind = 'persona' AND EXISTS (
            SELECT 1 FROM public.personas p
            WHERE p.id = fp.participant_id AND p.user_id = auth.uid()
          ))
          OR
          (fp.participant_kind = 'entity' AND EXISTS (
            SELECT 1 FROM public.entity_team et
            WHERE et.entity_id = fp.participant_id
              AND et.user_id = auth.uid()
              AND et.left_at IS NULL
              AND et.access IN ('owner','admin','editor')
          ))
        )
    );
$$;

-- Slot wrapper
CREATE OR REPLACE FUNCTION public.can_operate_runsheet_slot(p_festival_id uuid, p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (p_event_id IS NOT NULL AND public.can_operate_runsheet_event(p_event_id))
    OR
    (p_festival_id IS NOT NULL AND public.can_operate_runsheet_festival(p_festival_id));
$$;

-- 4. RLS policy for live updates
DROP POLICY IF EXISTS "runsheet live update" ON public.event_program_slots;
CREATE POLICY "runsheet live update"
  ON public.event_program_slots
  FOR UPDATE
  TO authenticated
  USING (public.can_operate_runsheet_slot(festival_id, event_id))
  WITH CHECK (public.can_operate_runsheet_slot(festival_id, event_id));

-- 5. Trigger: protect plan fields from live operators
CREATE OR REPLACE FUNCTION public.enforce_runsheet_live_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow full plan-edit for admin/editor
  IF public.is_admin()
    OR (OLD.event_id IS NOT NULL AND public.can_edit_event(OLD.event_id))
    OR (OLD.festival_id IS NOT NULL AND public.can_edit_events(OLD.festival_id)) THEN
    RETURN NEW;
  END IF;

  -- Live operator: only allowed to change live columns
  IF (NEW.starts_at IS DISTINCT FROM OLD.starts_at) THEN RAISE EXCEPTION 'Forbidden: starts_at is plan data'; END IF;
  IF (NEW.ends_at IS DISTINCT FROM OLD.ends_at) THEN RAISE EXCEPTION 'Forbidden: ends_at is plan data'; END IF;
  IF (NEW.is_canceled IS DISTINCT FROM OLD.is_canceled) THEN RAISE EXCEPTION 'Forbidden: is_canceled is plan data'; END IF;
  IF (NEW.internal_status IS DISTINCT FROM OLD.internal_status) THEN RAISE EXCEPTION 'Forbidden: internal_status'; END IF;
  IF (NEW.internal_note IS DISTINCT FROM OLD.internal_note) THEN RAISE EXCEPTION 'Forbidden: internal_note'; END IF;
  IF (NEW.visibility IS DISTINCT FROM OLD.visibility) THEN RAISE EXCEPTION 'Forbidden: visibility'; END IF;
  IF (NEW.is_visible_public IS DISTINCT FROM OLD.is_visible_public) THEN RAISE EXCEPTION 'Forbidden: is_visible_public'; END IF;
  IF (NEW.stage_label IS DISTINCT FROM OLD.stage_label) THEN RAISE EXCEPTION 'Forbidden: stage_label'; END IF;
  IF (NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes) THEN RAISE EXCEPTION 'Forbidden: duration_minutes'; END IF;
  IF (NEW.sequence_number IS DISTINCT FROM OLD.sequence_number) THEN RAISE EXCEPTION 'Forbidden: sequence_number'; END IF;
  IF (NEW.performer_kind IS DISTINCT FROM OLD.performer_kind) THEN RAISE EXCEPTION 'Forbidden: performer_kind'; END IF;
  IF (NEW.performer_entity_id IS DISTINCT FROM OLD.performer_entity_id) THEN RAISE EXCEPTION 'Forbidden: performer_entity_id'; END IF;
  IF (NEW.performer_persona_id IS DISTINCT FROM OLD.performer_persona_id) THEN RAISE EXCEPTION 'Forbidden: performer_persona_id'; END IF;
  IF (NEW.performer_name_override IS DISTINCT FROM OLD.performer_name_override) THEN RAISE EXCEPTION 'Forbidden: performer_name_override'; END IF;
  IF (NEW.contract_media_id IS DISTINCT FROM OLD.contract_media_id) THEN RAISE EXCEPTION 'Forbidden: contract_media_id'; END IF;
  IF (NEW.tech_rider_media_id IS DISTINCT FROM OLD.tech_rider_media_id) THEN RAISE EXCEPTION 'Forbidden: tech_rider_media_id'; END IF;
  IF (NEW.hosp_rider_media_id IS DISTINCT FROM OLD.hosp_rider_media_id) THEN RAISE EXCEPTION 'Forbidden: hosp_rider_media_id'; END IF;
  IF (NEW.tech_rider_asset_id IS DISTINCT FROM OLD.tech_rider_asset_id) THEN RAISE EXCEPTION 'Forbidden: tech_rider_asset_id'; END IF;
  IF (NEW.hosp_rider_asset_id IS DISTINCT FROM OLD.hosp_rider_asset_id) THEN RAISE EXCEPTION 'Forbidden: hosp_rider_asset_id'; END IF;
  IF (NEW.parallel_group_id IS DISTINCT FROM OLD.parallel_group_id) THEN RAISE EXCEPTION 'Forbidden: parallel_group_id'; END IF;
  IF (NEW.title_override IS DISTINCT FROM OLD.title_override) THEN RAISE EXCEPTION 'Forbidden: title_override'; END IF;
  IF (NEW.slot_kind IS DISTINCT FROM OLD.slot_kind) THEN RAISE EXCEPTION 'Forbidden: slot_kind'; END IF;
  IF (NEW.slot_type IS DISTINCT FROM OLD.slot_type) THEN RAISE EXCEPTION 'Forbidden: slot_type'; END IF;
  IF (NEW.event_id IS DISTINCT FROM OLD.event_id) THEN RAISE EXCEPTION 'Forbidden: event_id'; END IF;
  IF (NEW.festival_id IS DISTINCT FROM OLD.festival_id) THEN RAISE EXCEPTION 'Forbidden: festival_id'; END IF;
  IF (NEW.entity_id IS DISTINCT FROM OLD.entity_id) THEN RAISE EXCEPTION 'Forbidden: entity_id'; END IF;
  IF (NEW.source IS DISTINCT FROM OLD.source) THEN RAISE EXCEPTION 'Forbidden: source'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_runsheet_live_fields ON public.event_program_slots;
CREATE TRIGGER trg_enforce_runsheet_live_fields
  BEFORE UPDATE ON public.event_program_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_runsheet_live_field_updates();
