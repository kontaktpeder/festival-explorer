
-- 1) Scope type
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'credit_scope'
      and n.nspname = 'public'
  ) then
    create type public.credit_scope as enum ('landing', 'festival_case');
  end if;
end $$;

-- 2) Table
create table if not exists public.public_page_credits (
  id uuid primary key default gen_random_uuid(),
  scope public.credit_scope not null,
  festival_id uuid null references public.festivals(id) on delete cascade,
  participant_kind text not null check (participant_kind in ('persona', 'entity', 'venue')),
  participant_id uuid not null,
  role_label text not null,
  sort_order int not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Enforce scope/festival consistency
alter table public.public_page_credits
  drop constraint if exists public_page_credits_scope_festival_ck;

alter table public.public_page_credits
  add constraint public_page_credits_scope_festival_ck
  check (
    (scope = 'landing' and festival_id is null)
    or
    (scope = 'festival_case' and festival_id is not null)
  );

-- 4) Avoid duplicates
create unique index if not exists public_page_credits_unique_entry
  on public.public_page_credits (scope, festival_id, participant_kind, participant_id, role_label);

create index if not exists public_page_credits_scope_idx
  on public.public_page_credits (scope, festival_id, sort_order);

-- 5) updated_at trigger
drop trigger if exists set_public_page_credits_updated_at on public.public_page_credits;
create trigger set_public_page_credits_updated_at
before update on public.public_page_credits
for each row execute procedure public.set_updated_at();

-- 6) RLS
alter table public.public_page_credits enable row level security;

-- Admin can manage landing credits
drop policy if exists "Admin can manage landing credits" on public.public_page_credits;
create policy "Admin can manage landing credits"
on public.public_page_credits
for all
to authenticated
using (scope = 'landing' and public.is_admin())
with check (scope = 'landing' and public.is_admin());

-- Festival editors can manage case credits for their festival
drop policy if exists "Festival editors can manage case credits" on public.public_page_credits;
create policy "Festival editors can manage case credits"
on public.public_page_credits
for all
to authenticated
using (
  scope = 'festival_case'
  and festival_id is not null
  and public.can_edit_festival(festival_id)
)
with check (
  scope = 'festival_case'
  and festival_id is not null
  and public.can_edit_festival(festival_id)
);

-- Public read landing credits
drop policy if exists "Public can read landing credits" on public.public_page_credits;
create policy "Public can read landing credits"
on public.public_page_credits
for select
to anon
using (scope = 'landing');

-- Public read case credits only when case is enabled and festival is published
drop policy if exists "Public can read enabled case credits" on public.public_page_credits;
create policy "Public can read enabled case credits"
on public.public_page_credits
for select
to anon
using (
  scope = 'festival_case'
  and festival_id is not null
  and exists (
    select 1
    from public.festival_case_content fcc
    join public.festivals f on f.id = fcc.festival_id
    where fcc.festival_id = public_page_credits.festival_id
      and fcc.case_enabled = true
      and f.status = 'published'
  )
);

-- Authenticated users can read landing + enabled case credits
drop policy if exists "Authenticated can read landing and enabled case credits" on public.public_page_credits;
create policy "Authenticated can read landing and enabled case credits"
on public.public_page_credits
for select
to authenticated
using (
  scope = 'landing'
  or (
    scope = 'festival_case'
    and festival_id is not null
    and exists (
      select 1
      from public.festival_case_content fcc
      join public.festivals f on f.id = fcc.festival_id
      where fcc.festival_id = public_page_credits.festival_id
        and fcc.case_enabled = true
        and f.status = 'published'
    )
  )
);
