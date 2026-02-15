
-- delete_user_safely: also remove festival_participants, event_participants (persona refs),
-- and clear access_requests.reviewed_by so profile deletion never fails on FK.
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
  v_new_owner uuid;
  v_entity record;
  v_event record;
  v_festival record;
  v_media_record record;
  v_is_media_in_use boolean;
BEGIN
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this user';
  END IF;

  v_profile_id := p_user_id;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_profile_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 0. Delete staff_roles first
  WITH deleted AS (
    DELETE FROM public.staff_roles WHERE user_id = v_profile_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_staff_roles FROM deleted;

  -- 1. Transfer entities
  FOR v_entity IN 
    SELECT e.id FROM public.entities e WHERE e.created_by = v_profile_id AND e.is_system = false
  LOOP
    SELECT et.user_id INTO v_new_owner FROM public.entity_team et
    WHERE et.entity_id = v_entity.id AND et.user_id != v_profile_id AND et.left_at IS NULL AND et.access IN ('owner', 'admin')
    ORDER BY CASE et.access WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, et.joined_at ASC LIMIT 1;

    IF v_new_owner IS NULL THEN
      SELECT et.user_id INTO v_new_owner FROM public.entity_team et
      WHERE et.entity_id = v_entity.id AND et.user_id != v_profile_id AND et.left_at IS NULL
      ORDER BY et.joined_at ASC LIMIT 1;
    END IF;

    IF v_new_owner IS NULL THEN
      SELECT pa.user_id INTO v_new_owner FROM public.platform_access pa
      WHERE pa.access_level IN ('owner', 'admin') AND pa.revoked_at IS NULL AND pa.user_id != v_profile_id
      ORDER BY CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, pa.granted_at ASC LIMIT 1;
    END IF;

    IF v_new_owner IS NOT NULL THEN
      UPDATE public.entities SET created_by = v_new_owner WHERE id = v_entity.id;
      v_transferred_entities := v_transferred_entities + 1;
    END IF;
  END LOOP;

  -- 2. Transfer events
  FOR v_event IN SELECT e.id FROM public.events e WHERE e.created_by = v_profile_id
  LOOP
    SELECT pa.user_id INTO v_new_owner FROM public.platform_access pa
    WHERE pa.access_level IN ('owner', 'admin') AND pa.revoked_at IS NULL AND pa.user_id != v_profile_id
    ORDER BY CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, pa.granted_at ASC LIMIT 1;

    IF v_new_owner IS NOT NULL THEN
      UPDATE public.events SET created_by = v_new_owner WHERE id = v_event.id;
    END IF;
    v_transferred_events := v_transferred_events + 1;
  END LOOP;

  -- 3. Transfer festivals
  FOR v_festival IN SELECT f.id FROM public.festivals f WHERE f.created_by = v_profile_id
  LOOP
    SELECT pa.user_id INTO v_new_owner FROM public.platform_access pa
    WHERE pa.access_level IN ('owner', 'admin') AND pa.revoked_at IS NULL AND pa.user_id != v_profile_id
    ORDER BY CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, pa.granted_at ASC LIMIT 1;

    IF v_new_owner IS NOT NULL THEN
      UPDATE public.festivals SET created_by = v_new_owner WHERE id = v_festival.id;
    END IF;
    v_transferred_festivals := v_transferred_festivals + 1;
  END LOOP;

  -- 4. Handle media
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
      SELECT pr.id INTO v_new_owner FROM public.profiles pr
      WHERE (pr.avatar_url = v_media_record.public_url OR pr.avatar_url LIKE '%' || v_media_record.storage_path || '%')
        AND pr.id != v_profile_id LIMIT 1;
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

  -- 5. Delete designs
  WITH deleted AS (DELETE FROM public.designs WHERE created_by = v_profile_id RETURNING 1)
  SELECT COUNT(*) INTO v_deleted_designs FROM deleted;

  -- 5b. Remove user's personas from festival_participants and event_participants
  WITH deleted AS (
    DELETE FROM public.festival_participants
    WHERE participant_kind = 'persona'
      AND participant_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_festival_participants FROM deleted;

  WITH deleted AS (
    DELETE FROM public.event_participants
    WHERE participant_kind = 'persona'
      AND participant_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_event_participants FROM deleted;

  -- 6. Delete entity_persona_bindings and personas
  DELETE FROM public.entity_persona_bindings WHERE persona_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id);
  WITH deleted AS (DELETE FROM public.personas WHERE user_id = v_profile_id RETURNING 1)
  SELECT COUNT(*) INTO v_deleted_personas FROM deleted;

  -- 7. Remove from entity teams
  WITH deleted AS (DELETE FROM public.entity_team WHERE user_id = v_profile_id RETURNING 1)
  SELECT COUNT(*) INTO v_deleted_team_memberships FROM deleted;

  -- 8. Delete platform access
  WITH deleted AS (DELETE FROM public.platform_access WHERE user_id = v_profile_id RETURNING 1)
  SELECT COUNT(*) INTO v_deleted_platform_access FROM deleted;

  -- 9. Invitations: revoke pending + reassign inviter
  WITH updated AS (
    UPDATE public.access_invitations
    SET status = CASE WHEN status = 'pending' THEN 'revoked' ELSE status END
    WHERE invited_by = v_profile_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_invitations FROM updated;

  SELECT pa.user_id INTO v_new_owner
  FROM public.platform_access pa
  WHERE pa.access_level IN ('owner', 'admin') AND pa.revoked_at IS NULL AND pa.user_id != v_profile_id
  ORDER BY CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END, pa.granted_at ASC
  LIMIT 1;

  IF v_new_owner IS NOT NULL THEN
    UPDATE public.access_invitations SET invited_by = v_new_owner WHERE invited_by = v_profile_id;
  ELSE
    DELETE FROM public.access_invitations WHERE invited_by = v_profile_id;
  END IF;

  -- 9b. Clear reviewed_by so profile deletion does not fail on FK
  WITH updated AS (
    UPDATE public.access_requests SET reviewed_by = NULL WHERE reviewed_by = v_profile_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_cleared_reviewed_by FROM updated;

  -- 10. Delete profile
  DELETE FROM public.profiles WHERE id = v_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_personas', v_deleted_personas,
    'deleted_team_memberships', v_deleted_team_memberships,
    'deleted_platform_access', v_deleted_platform_access,
    'affected_invitations', v_deleted_invitations,
    'deleted_media', v_deleted_media,
    'deleted_designs', v_deleted_designs,
    'deleted_staff_roles', v_deleted_staff_roles,
    'deleted_festival_participants', v_deleted_festival_participants,
    'deleted_event_participants', v_deleted_event_participants,
    'cleared_access_requests_reviewed_by', v_cleared_reviewed_by,
    'transferred_media', v_transferred_media,
    'transferred_entities', v_transferred_entities,
    'transferred_events', v_transferred_events,
    'transferred_festivals', v_transferred_festivals
  );
END;
$function$;

-- One-time: remove access_requests rows for deleted user
DELETE FROM public.access_requests
WHERE lower(email) = 'peder.august12@gmail.com';
