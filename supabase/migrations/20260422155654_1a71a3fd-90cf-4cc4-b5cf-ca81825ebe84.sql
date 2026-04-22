CREATE OR REPLACE FUNCTION public.enforce_runsheet_live_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow internal maintenance operations used by secure account deletion.
  IF current_setting('app.delete_user_safely', true) = 'on' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.delete_user_safely(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_deleted_personas integer := 0;
  v_deleted_team_memberships integer := 0;
  v_deleted_platform_access integer := 0;
  v_deleted_invitations integer := 0;
  v_deleted_media integer := 0;
  v_deleted_designs integer := 0;
  v_deleted_staff_roles integer := 0;
  v_deleted_festival_participants integer := 0;
  v_deleted_event_participants integer := 0;
  v_cleared_reviewed_by integer := 0;
  v_transferred_media integer := 0;
  v_transferred_entities integer := 0;
  v_transferred_events integer := 0;
  v_transferred_festivals integer := 0;
  v_deleted_asset_handles integer := 0;
  v_fallback_owner uuid;
  v_new_owner uuid;
  v_entity record;
  v_event record;
  v_festival record;
  v_media_record record;
  v_is_media_in_use boolean;
BEGIN
  PERFORM set_config('app.delete_user_safely', 'on', true);

  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this user';
  END IF;

  v_profile_id := p_user_id;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_profile_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT pa.user_id INTO v_fallback_owner
  FROM public.platform_access pa
  WHERE pa.access_level IN ('owner', 'admin')
    AND pa.revoked_at IS NULL
    AND pa.user_id != v_profile_id
  ORDER BY CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, pa.granted_at ASC
  LIMIT 1;

  IF v_fallback_owner IS NULL THEN
    SELECT e.created_by INTO v_fallback_owner
    FROM public.entities e
    WHERE e.is_system = true AND e.created_by IS NOT NULL AND e.created_by != v_profile_id
    LIMIT 1;
  END IF;

  IF v_fallback_owner IS NULL THEN
    SELECT p.id INTO v_fallback_owner
    FROM public.profiles p
    WHERE p.id != v_profile_id
    ORDER BY p.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  DELETE FROM public.staff_roles WHERE user_id = v_profile_id;
  GET DIAGNOSTICS v_deleted_staff_roles = ROW_COUNT;

  UPDATE public.festival_finance_entries e
  SET linked_entry_id = NULL
  WHERE e.linked_entry_id IN (
    SELECT fe.id FROM public.festival_finance_entries fe
    WHERE fe.created_by = v_profile_id
       OR fe.book_id IN (SELECT b.id FROM public.festival_finance_books b WHERE b.created_by = v_profile_id)
  );

  DELETE FROM public.festival_finance_attachments a
  WHERE a.uploaded_by = v_profile_id
     OR a.entry_id IN (
       SELECT fe.id FROM public.festival_finance_entries fe
       WHERE fe.created_by = v_profile_id
          OR fe.book_id IN (SELECT b.id FROM public.festival_finance_books b WHERE b.created_by = v_profile_id)
     );

  DELETE FROM public.festival_finance_entries e
  WHERE e.created_by = v_profile_id
     OR e.book_id IN (SELECT b.id FROM public.festival_finance_books b WHERE b.created_by = v_profile_id);

  DELETE FROM public.festival_finance_books b WHERE b.created_by = v_profile_id;

  UPDATE public.program_slot_types SET created_by = NULL WHERE created_by = v_profile_id;
  UPDATE public.event_issue SET owner_user_id = NULL WHERE owner_user_id = v_profile_id;
  DELETE FROM public.social_assets WHERE created_by = v_profile_id;
  DELETE FROM public.project_members WHERE profile_id = v_profile_id;
  DELETE FROM public.venue_members WHERE profile_id = v_profile_id;
  DELETE FROM public.pending_festival_team_invites WHERE user_id = v_profile_id;

  UPDATE public.entities
  SET tech_rider_asset_id = NULL, hosp_rider_asset_id = NULL
  WHERE created_by = v_profile_id
    AND (tech_rider_asset_id IS NOT NULL OR hosp_rider_asset_id IS NOT NULL);

  UPDATE public.event_program_slots
  SET tech_rider_asset_id = NULL, hosp_rider_asset_id = NULL
  WHERE (tech_rider_asset_id IS NOT NULL OR hosp_rider_asset_id IS NOT NULL)
    AND (
      event_id IN (SELECT id FROM public.events WHERE created_by = v_profile_id)
      OR festival_id IN (SELECT id FROM public.festivals WHERE created_by = v_profile_id)
    );

  DELETE FROM public.asset_handles WHERE created_by = v_profile_id;
  GET DIAGNOSTICS v_deleted_asset_handles = ROW_COUNT;

  FOR v_entity IN SELECT e.id FROM public.entities e WHERE e.created_by = v_profile_id AND e.is_system = false
  LOOP
    v_new_owner := NULL;
    SELECT et.user_id INTO v_new_owner FROM public.entity_team et
    WHERE et.entity_id = v_entity.id AND et.user_id != v_profile_id AND et.left_at IS NULL
      AND et.access IN ('owner', 'admin')
    ORDER BY CASE et.access WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, et.joined_at ASC LIMIT 1;

    IF v_new_owner IS NULL AND v_fallback_owner IS NOT NULL THEN
      v_new_owner := v_fallback_owner;
    END IF;

    IF v_new_owner IS NOT NULL THEN
      UPDATE public.entities SET created_by = v_new_owner WHERE id = v_entity.id;
      v_transferred_entities := v_transferred_entities + 1;
    END IF;
  END LOOP;

  IF v_fallback_owner IS NOT NULL THEN
    UPDATE public.events SET created_by = v_fallback_owner WHERE created_by = v_profile_id;
    UPDATE public.festivals SET created_by = v_fallback_owner WHERE created_by = v_profile_id;
    UPDATE public.projects SET created_by = v_fallback_owner WHERE created_by = v_profile_id;
    UPDATE public.venues SET created_by = v_fallback_owner WHERE created_by = v_profile_id;
    UPDATE public.entities SET created_by = v_fallback_owner WHERE created_by = v_profile_id;
  END IF;

  FOR v_media_record IN SELECT m.id, m.public_url, m.storage_path FROM public.media m WHERE m.created_by = v_profile_id
  LOOP
    v_is_media_in_use := false;
    v_new_owner := NULL;

    SELECT e.created_by INTO v_new_owner FROM public.entities e
    WHERE (e.hero_image_url = v_media_record.public_url OR e.hero_image_url LIKE '%' || v_media_record.storage_path || '%')
      AND e.created_by != v_profile_id LIMIT 1;
    IF v_new_owner IS NOT NULL THEN v_is_media_in_use := true; END IF;

    IF NOT v_is_media_in_use THEN
      SELECT p.user_id INTO v_new_owner FROM public.personas p
      WHERE (p.avatar_url = v_media_record.public_url OR p.avatar_url LIKE '%' || v_media_record.storage_path || '%')
        AND p.user_id != v_profile_id LIMIT 1;
      IF v_new_owner IS NOT NULL THEN v_is_media_in_use := true; END IF;
    END IF;

    IF NOT v_is_media_in_use THEN
      SELECT ev.created_by INTO v_new_owner FROM public.events ev
      WHERE (ev.hero_image_url = v_media_record.public_url OR ev.hero_image_url LIKE '%' || v_media_record.storage_path || '%')
        AND ev.created_by != v_profile_id LIMIT 1;
      IF v_new_owner IS NOT NULL THEN v_is_media_in_use := true; END IF;
    END IF;

    IF v_is_media_in_use AND v_new_owner IS NOT NULL THEN
      UPDATE public.media SET created_by = v_new_owner WHERE id = v_media_record.id;
      v_transferred_media := v_transferred_media + 1;
    ELSE
      DELETE FROM public.media WHERE id = v_media_record.id;
      v_deleted_media := v_deleted_media + 1;
    END IF;
  END LOOP;

  DELETE FROM public.designs WHERE created_by = v_profile_id;
  GET DIAGNOSTICS v_deleted_designs = ROW_COUNT;

  DELETE FROM public.festival_participants
  WHERE participant_kind = 'persona'
    AND participant_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id);
  GET DIAGNOSTICS v_deleted_festival_participants = ROW_COUNT;

  DELETE FROM public.event_participants
  WHERE participant_kind = 'persona'
    AND participant_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id);
  GET DIAGNOSTICS v_deleted_event_participants = ROW_COUNT;

  DELETE FROM public.entity_persona_bindings WHERE persona_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id);
  DELETE FROM public.personas WHERE user_id = v_profile_id;
  GET DIAGNOSTICS v_deleted_personas = ROW_COUNT;

  DELETE FROM public.entity_team WHERE user_id = v_profile_id;
  GET DIAGNOSTICS v_deleted_team_memberships = ROW_COUNT;

  DELETE FROM public.platform_access WHERE user_id = v_profile_id;
  GET DIAGNOSTICS v_deleted_platform_access = ROW_COUNT;

  UPDATE public.access_invitations SET invited_user_id = NULL WHERE invited_user_id = v_profile_id;

  IF v_fallback_owner IS NOT NULL THEN
    UPDATE public.access_invitations SET invited_by = v_fallback_owner WHERE invited_by = v_profile_id;
  ELSE
    DELETE FROM public.access_invitations WHERE invited_by = v_profile_id;
  END IF;

  UPDATE public.access_requests SET reviewed_by = NULL WHERE reviewed_by = v_profile_id;
  GET DIAGNOSTICS v_cleared_reviewed_by = ROW_COUNT;

  DELETE FROM public.profiles WHERE id = v_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_personas', v_deleted_personas,
    'deleted_team_memberships', v_deleted_team_memberships,
    'deleted_platform_access', v_deleted_platform_access,
    'deleted_media', v_deleted_media,
    'deleted_designs', v_deleted_designs,
    'deleted_staff_roles', v_deleted_staff_roles,
    'deleted_festival_participants', v_deleted_festival_participants,
    'deleted_event_participants', v_deleted_event_participants,
    'transferred_media', v_transferred_media,
    'transferred_entities', v_transferred_entities,
    'deleted_asset_handles', v_deleted_asset_handles,
    'fallback_owner_id', v_fallback_owner
  );
END;
$function$;