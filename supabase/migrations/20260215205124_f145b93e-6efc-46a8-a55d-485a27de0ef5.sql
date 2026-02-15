
-- transfer_entity_ownership: current owner transfers ownership to another team member.
-- Caller must be owner. New owner must be existing active member (not self).
-- After transfer: caller becomes 'admin', new member becomes 'owner'.
-- entities.created_by is updated to new owner's user_id.

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
END;
$$;
