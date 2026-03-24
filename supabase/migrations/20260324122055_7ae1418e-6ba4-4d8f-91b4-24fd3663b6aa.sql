
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Caller must be current owner
  SELECT id, access INTO v_caller_team_id, v_caller_access
  FROM public.entity_team
  WHERE entity_id = p_entity_id AND user_id = auth.uid() AND left_at IS NULL;

  IF NOT FOUND OR v_caller_access <> 'owner' THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Target row must belong to this entity and be an active member (not self)
  SELECT user_id, access INTO v_new_owner_user_id, v_new_owner_current_access
  FROM public.entity_team
  WHERE id = p_new_owner_entity_team_id
    AND entity_id = p_entity_id
    AND left_at IS NULL
    AND user_id <> auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive team member for transfer';
  END IF;

  -- Atomic: demote caller to admin, promote new owner, update entities.created_by
  UPDATE public.entity_team SET access = 'admin' WHERE id = v_caller_team_id;
  UPDATE public.entity_team SET access = 'owner' WHERE id = p_new_owner_entity_team_id;
  UPDATE public.entities SET created_by = v_new_owner_user_id WHERE id = p_entity_id;

  -- Update role_label in entity_persona_bindings for new owner
  SELECT id INTO v_new_owner_persona_id
  FROM public.personas
  WHERE user_id = v_new_owner_user_id
  LIMIT 1;

  IF v_new_owner_persona_id IS NOT NULL THEN
    UPDATE public.entity_persona_bindings
    SET role_label = 'Eier'
    WHERE entity_id = p_entity_id AND persona_id = v_new_owner_persona_id;
  END IF;

  -- Clear "Eier" role_label from old owner's binding
  UPDATE public.entity_persona_bindings
  SET role_label = NULL
  WHERE entity_id = p_entity_id
    AND role_label = 'Eier'
    AND persona_id IN (
      SELECT id FROM public.personas WHERE user_id = auth.uid()
    );
END;
$$;
