
-- Update transfer_entity_ownership to also swap role_labels in entity_team
CREATE OR REPLACE FUNCTION public.transfer_entity_ownership(
  p_entity_id uuid,
  p_new_owner_entity_team_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_team_id uuid;
  v_caller_access access_level;
  v_new_owner_user_id uuid;
  v_new_owner_current_access access_level;
  v_new_owner_persona_id uuid;
  v_old_role_labels text[];
  v_new_role_labels text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Caller must be current owner
  SELECT id, access, role_labels INTO v_caller_team_id, v_caller_access, v_old_role_labels
  FROM public.entity_team
  WHERE entity_id = p_entity_id AND user_id = auth.uid() AND left_at IS NULL;

  IF NOT FOUND OR v_caller_access <> 'owner' THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Target row must belong to this entity and be an active member (not self)
  SELECT user_id, access, role_labels INTO v_new_owner_user_id, v_new_owner_current_access, v_new_role_labels
  FROM public.entity_team
  WHERE id = p_new_owner_entity_team_id
    AND entity_id = p_entity_id
    AND left_at IS NULL
    AND user_id <> auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive team member for transfer';
  END IF;

  -- Demote caller to admin, remove "Eier" from role_labels
  UPDATE public.entity_team
  SET access = 'admin',
      role_labels = array_remove(COALESCE(v_old_role_labels, '{}'), 'Eier')
  WHERE id = v_caller_team_id;

  -- Promote new owner, add "Eier" to role_labels (replace existing)
  UPDATE public.entity_team
  SET access = 'owner',
      role_labels = array_append(array_remove(COALESCE(v_new_role_labels, '{}'), 'Eier'), 'Eier')
  WHERE id = p_new_owner_entity_team_id;

  -- Update entities.created_by
  UPDATE public.entities SET created_by = v_new_owner_user_id WHERE id = p_entity_id;

  -- Also update entity_persona_bindings role_label
  SELECT id INTO v_new_owner_persona_id
  FROM public.personas
  WHERE user_id = v_new_owner_user_id
  LIMIT 1;

  IF v_new_owner_persona_id IS NOT NULL THEN
    UPDATE public.entity_persona_bindings
    SET role_label = 'Eier'
    WHERE entity_id = p_entity_id AND persona_id = v_new_owner_persona_id;
  END IF;

  -- Clear "Eier" from old owner's binding
  UPDATE public.entity_persona_bindings
  SET role_label = NULL
  WHERE entity_id = p_entity_id
    AND role_label = 'Eier'
    AND persona_id IN (
      SELECT id FROM public.personas WHERE user_id = auth.uid()
    );
END;
$$;

-- Fix existing data: remove "Eier" from role_labels where access is not owner
UPDATE public.entity_team
SET role_labels = array_remove(role_labels, 'Eier')
WHERE 'Eier' = ANY(role_labels) AND access <> 'owner';
