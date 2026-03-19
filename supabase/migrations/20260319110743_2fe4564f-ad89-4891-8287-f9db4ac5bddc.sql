-- landing_page_content: CMS-light for offentlig landing
create table if not exists public.landing_page_content (
  id int primary key default 1,

  hero_title text null,
  hero_subtitle text null,
  hero_cta_text text null,
  hero_video_url text null,

  proof_enabled boolean not null default false,
  proof_show_attendees boolean not null default false,

  section_case_enabled boolean not null default true,
  section_case_title text null,
  section_case_subtitle text null,

  updated_at timestamptz not null default now()
);

create trigger set_landing_page_content_updated_at
before update on public.landing_page_content
for each row execute procedure public.set_updated_at();

alter table public.landing_page_content enable row level security;

-- Admin/editor kan lese/skrive via backstage-tilgang
create policy "Landing editors can manage landing_page_content"
on public.landing_page_content
for all
to authenticated
using (public.has_backstage_access())
with check (public.has_backstage_access());

-- Offentlig kan lese
create policy "Public can read landing_page_content"
on public.landing_page_content
for select
to anon
using (true);

create policy "Authenticated can read landing_page_content"
on public.landing_page_content
for select
to authenticated
using (true);

-- Seed default rad
insert into public.landing_page_content (
  id,
  hero_title,
  hero_subtitle,
  hero_cta_text,
  hero_video_url,
  proof_enabled,
  proof_show_attendees,
  section_case_enabled,
  section_case_title,
  section_case_subtitle
)
values (
  1,
  'Lag konserter, uten kaos',
  'GIGGEN samler booking, program og billetter på ett sted – laget for artister og arrangører i startfasen.',
  'Få hjelp til å sette opp ditt event',
  null,
  false,
  false,
  true,
  'GIGGEN Festival',
  'GIGGEN Festival er vårt første proof of concept – en ekte festival bygget og drevet gjennom plattformen.'
)
on conflict (id) do nothing;