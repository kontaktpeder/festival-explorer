-- Fix search_path on existing functions that are missing it

-- Fix set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- The other functions (is_project_admin, is_project_member, is_venue_admin) 
-- are legacy functions for the old project/venue model.
-- We'll update them to use search_path for consistency:

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = auth.uid()
      and pm.is_admin = true
      and pm.left_at is null
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = auth.uid()
      and pm.left_at is null
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_venue_admin(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select exists (
    select 1 from public.venue_members vm
    where vm.venue_id = p_venue_id
      and vm.profile_id = auth.uid()
      and vm.is_admin = true
  );
$function$;