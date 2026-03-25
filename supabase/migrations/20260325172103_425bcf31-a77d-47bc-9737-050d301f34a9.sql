
-- 1) Enum
do $$ begin
  create type public.live_role_level as enum ('viewer', 'crew', 'editor', 'admin');
exception
  when duplicate_object then null;
end $$;

-- 2) Add live_role column to event_participants
alter table public.event_participants
  add column if not exists live_role public.live_role_level not null default 'viewer';

-- 3) Add live_role column to festival_participants
alter table public.festival_participants
  add column if not exists live_role public.live_role_level not null default 'viewer';

-- 4) Backfill from existing booleans
update public.event_participants
set live_role = case
  when coalesce(can_operate_runsheet, false) = true then 'crew'::public.live_role_level
  when coalesce(can_view_runsheet, false) = true then 'viewer'::public.live_role_level
  else 'viewer'::public.live_role_level
end;

update public.festival_participants
set live_role = case
  when coalesce(can_operate_runsheet, false) = true then 'crew'::public.live_role_level
  when coalesce(can_view_runsheet, false) = true then 'viewer'::public.live_role_level
  else 'viewer'::public.live_role_level
end;

-- 5) Sync trigger: keep old booleans in sync when live_role changes
create or replace function public.sync_runsheet_flags_from_live_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.can_view_runsheet := (NEW.live_role in ('viewer','crew','editor','admin'));
  NEW.can_operate_runsheet := (NEW.live_role in ('crew','editor','admin'));
  return NEW;
end;
$$;

drop trigger if exists trg_sync_event_participants_live_role on public.event_participants;
create trigger trg_sync_event_participants_live_role
  before insert or update on public.event_participants
  for each row execute function public.sync_runsheet_flags_from_live_role();

drop trigger if exists trg_sync_festival_participants_live_role on public.festival_participants;
create trigger trg_sync_festival_participants_live_role
  before insert or update on public.festival_participants
  for each row execute function public.sync_runsheet_flags_from_live_role();

-- 6) Comments
comment on column public.event_participants.live_role is 'Live-rolle per event: viewer, crew, editor, admin';
comment on column public.festival_participants.live_role is 'Live-rolle per festival: viewer, crew, editor, admin';
