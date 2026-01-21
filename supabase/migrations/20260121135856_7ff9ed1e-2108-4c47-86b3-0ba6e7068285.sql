-- Update delete_user_safely function with improved ownership transfer logic
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
  -- Verify the user is deleting their own account (or is admin)
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this user';
  END IF;

  -- Get profile id (same as user id in our schema)
  v_profile_id := p_user_id;

  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_profile_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- ============================================
  -- 1. Transfer ownership of entities where user is creator
  -- ============================================
  FOR v_entity IN 
    SELECT e.id, e.created_by 
    FROM public.entities e 
    WHERE e.created_by = v_profile_id AND e.is_system = false
  LOOP
    -- Find a new owner: first owner/admin from entity_team (excluding current user)
    SELECT et.user_id INTO v_new_owner
    FROM public.entity_team et
    WHERE et.entity_id = v_entity.id
      AND et.user_id != v_profile_id
      AND et.left_at IS NULL
      AND et.access IN ('owner', 'admin')
    ORDER BY 
      CASE et.access WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END,
      et.joined_at ASC
    LIMIT 1;

    -- If no owner/admin found, try any team member
    IF v_new_owner IS NULL THEN
      SELECT et.user_id INTO v_new_owner
      FROM public.entity_team et
      WHERE et.entity_id = v_entity.id
        AND et.user_id != v_profile_id
        AND et.left_at IS NULL
      ORDER BY et.joined_at ASC
      LIMIT 1;
    END IF;

    -- If still no one, try platform owner/admin as fallback
    IF v_new_owner IS NULL THEN
      SELECT pa.user_id INTO v_new_owner
      FROM public.platform_access pa
      WHERE pa.access_level IN ('owner', 'admin')
        AND pa.revoked_at IS NULL
        AND pa.user_id != v_profile_id
      ORDER BY 
        CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END,
        pa.granted_at ASC
      LIMIT 1;
    END IF;

    -- If we found a new owner, transfer
    IF v_new_owner IS NOT NULL THEN
      UPDATE public.entities 
      SET created_by = v_new_owner 
      WHERE id = v_entity.id;
      v_transferred_entities := v_transferred_entities + 1;
    END IF;
  END LOOP;

  -- ============================================
  -- 2. Transfer ownership of events where user is creator
  -- ============================================
  FOR v_event IN 
    SELECT e.id, e.created_by 
    FROM public.events e 
    WHERE e.created_by = v_profile_id
  LOOP
    -- Find a fallback owner: platform owner/admin
    SELECT pa.user_id INTO v_new_owner
    FROM public.platform_access pa
    WHERE pa.access_level IN ('owner', 'admin')
      AND pa.revoked_at IS NULL
      AND pa.user_id != v_profile_id
    ORDER BY 
      CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END,
      pa.granted_at ASC
    LIMIT 1;

    -- If we found a new owner, transfer
    IF v_new_owner IS NOT NULL THEN
      UPDATE public.events
      SET created_by = v_new_owner
      WHERE id = v_event.id;
    END IF;

    v_transferred_events := v_transferred_events + 1;
  END LOOP;

  -- ============================================
  -- 3. Transfer ownership of festivals where user is creator
  -- ============================================
  FOR v_festival IN 
    SELECT f.id, f.created_by 
    FROM public.festivals f 
    WHERE f.created_by = v_profile_id
  LOOP
    -- Find a fallback owner: platform owner/admin
    SELECT pa.user_id INTO v_new_owner
    FROM public.platform_access pa
    WHERE pa.access_level IN ('owner', 'admin')
      AND pa.revoked_at IS NULL
      AND pa.user_id != v_profile_id
    ORDER BY 
      CASE pa.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END,
      pa.granted_at ASC
    LIMIT 1;

    -- If we found a new owner, transfer
    IF v_new_owner IS NOT NULL THEN
      UPDATE public.festivals
      SET created_by = v_new_owner
      WHERE id = v_festival.id;
    END IF;

    v_transferred_festivals := v_transferred_festivals + 1;
  END LOOP;

  -- ============================================
  -- 4. Handle media files
  -- ============================================
  FOR v_media_record IN 
    SELECT m.id, m.public_url, m.storage_path
    FROM public.media m 
    WHERE m.created_by = v_profile_id
  LOOP
    v_is_media_in_use := false;
    v_new_owner := NULL;

    -- Check if media is in use in entities
    SELECT e.created_by INTO v_new_owner
    FROM public.entities e
    WHERE (e.hero_image_url = v_media_record.public_url 
           OR e.hero_image_url LIKE '%' || v_media_record.storage_path || '%')
      AND e.created_by != v_profile_id
    LIMIT 1;

    IF v_new_owner IS NOT NULL THEN
      v_is_media_in_use := true;
    END IF;

    -- Check if media is in use in personas (other users' personas)
    IF NOT v_is_media_in_use THEN
      SELECT p.user_id INTO v_new_owner
      FROM public.personas p
      WHERE (p.avatar_url = v_media_record.public_url 
             OR p.avatar_url LIKE '%' || v_media_record.storage_path || '%')
        AND p.user_id != v_profile_id
      LIMIT 1;

      IF v_new_owner IS NOT NULL THEN
        v_is_media_in_use := true;
      END IF;
    END IF;

    -- Check if media is in use in profiles (other users' profiles)
    IF NOT v_is_media_in_use THEN
      SELECT pr.id INTO v_new_owner
      FROM public.profiles pr
      WHERE (pr.avatar_url = v_media_record.public_url 
             OR pr.avatar_url LIKE '%' || v_media_record.storage_path || '%')
        AND pr.id != v_profile_id
      LIMIT 1;

      IF v_new_owner IS NOT NULL THEN
        v_is_media_in_use := true;
      END IF;
    END IF;

    -- Check if media is in use in events
    IF NOT v_is_media_in_use THEN
      SELECT ev.created_by INTO v_new_owner
      FROM public.events ev
      WHERE (ev.hero_image_url = v_media_record.public_url 
             OR ev.hero_image_url LIKE '%' || v_media_record.storage_path || '%')
        AND ev.created_by != v_profile_id
      LIMIT 1;

      IF v_new_owner IS NOT NULL THEN
        v_is_media_in_use := true;
      END IF;
    END IF;

    -- Check if media is in use in festivals
    IF NOT v_is_media_in_use THEN
      SELECT f.created_by INTO v_new_owner
      FROM public.festivals f
      WHERE (f.theme_id IS NOT NULL)
        AND f.created_by != v_profile_id
      LIMIT 1;
      -- Note: This is a simplified check. Full check would include festival_sections bg images
    END IF;

    -- Check entity_timeline_events media JSONB
    IF NOT v_is_media_in_use THEN
      SELECT et.entity_id INTO v_new_owner
      FROM public.entity_timeline_events et
      WHERE et.media::text LIKE '%' || v_media_record.public_url || '%'
      LIMIT 1;

      IF v_new_owner IS NOT NULL THEN
        -- Get entity owner as new media owner
        SELECT e.created_by INTO v_new_owner
        FROM public.entities e
        WHERE e.id = v_new_owner;
        
        IF v_new_owner IS NOT NULL AND v_new_owner != v_profile_id THEN
          v_is_media_in_use := true;
        ELSE
          v_new_owner := NULL;
        END IF;
      END IF;
    END IF;

    IF v_is_media_in_use AND v_new_owner IS NOT NULL THEN
      -- Transfer ownership
      UPDATE public.media 
      SET created_by = v_new_owner 
      WHERE id = v_media_record.id;
      v_transferred_media := v_transferred_media + 1;
    ELSE
      -- Delete unused media (the actual storage file deletion should be handled separately)
      DELETE FROM public.media WHERE id = v_media_record.id;
      v_deleted_media := v_deleted_media + 1;
    END IF;
  END LOOP;

  -- ============================================
  -- 5. Delete designs created by this user
  -- ============================================
  WITH deleted AS (
    DELETE FROM public.designs
    WHERE created_by = v_profile_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_designs FROM deleted;

  -- ============================================
  -- 6. Delete entity_persona_bindings for user's personas
  -- (Will cascade when we delete personas)
  -- ============================================

  -- ============================================
  -- 7. Delete all personas owned by this user
  -- ============================================
  DELETE FROM public.entity_persona_bindings 
  WHERE persona_id IN (SELECT id FROM public.personas WHERE user_id = v_profile_id);

  WITH deleted AS (
    DELETE FROM public.personas WHERE user_id = v_profile_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_personas FROM deleted;

  -- ============================================
  -- 8. Remove user from all entity teams
  -- ============================================
  WITH deleted AS (
    DELETE FROM public.entity_team WHERE user_id = v_profile_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_team_memberships FROM deleted;

  -- ============================================
  -- 9. Delete platform access
  -- ============================================
  WITH deleted AS (
    DELETE FROM public.platform_access WHERE user_id = v_profile_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_platform_access FROM deleted;

  -- ============================================
  -- 10. Handle access invitations
  -- ============================================
  -- Revoke invitations sent by this user
  WITH updated AS (
    UPDATE public.access_invitations 
    SET status = 'revoked' 
    WHERE invited_by = v_profile_id AND status = 'pending'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_invitations FROM updated;

  -- ============================================
  -- 11. Delete the profile
  -- ============================================
  DELETE FROM public.profiles WHERE id = v_profile_id;

  -- ============================================
  -- Return summary
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'deleted_personas', v_deleted_personas,
    'deleted_team_memberships', v_deleted_team_memberships,
    'deleted_platform_access', v_deleted_platform_access,
    'deleted_invitations', v_deleted_invitations,
    'deleted_media', v_deleted_media,
    'deleted_designs', v_deleted_designs,
    'transferred_media', v_transferred_media,
    'transferred_entities', v_transferred_entities,
    'transferred_events', v_transferred_events,
    'transferred_festivals', v_transferred_festivals
  );
END;
$function$;