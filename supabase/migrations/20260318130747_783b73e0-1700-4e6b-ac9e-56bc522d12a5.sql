
-- festival_case_content: case/portfolio fields per festival

create table if not exists public.festival_case_content (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,

  case_enabled boolean not null default false,
  case_public_show_attendees boolean not null default false,

  case_summary text null,
  case_what_was_this text null,
  case_what_worked text null,
  case_challenges text null,
  case_video_embed_url text null,
  case_quote text null,

  case_image_1_media_id uuid null references public.festival_media(id) on delete set null,
  case_image_2_media_id uuid null references public.festival_media(id) on delete set null,
  case_image_3_media_id uuid null references public.festival_media(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists festival_case_content_festival_id_uniq
  on public.festival_case_content(festival_id);

-- updated_at trigger
create trigger set_festival_case_content_updated_at
  before update on public.festival_case_content
  for each row execute procedure public.set_updated_at();

alter table public.festival_case_content enable row level security;

-- Festival editors can manage
create policy "Festival editors can manage festival_case_content"
  on public.festival_case_content
  for all
  to authenticated
  using (public.can_edit_festival(festival_id))
  with check (public.can_edit_festival(festival_id));

-- Public (anon) read when enabled + festival published
create policy "Public can read enabled festival_case_content"
  on public.festival_case_content
  for select
  to anon
  using (
    case_enabled = true
    and exists (
      select 1 from public.festivals f
      where f.id = festival_case_content.festival_id
        and f.status = 'published'
    )
  );

-- Authenticated users can also read enabled cases
create policy "Authenticated can read enabled festival_case_content"
  on public.festival_case_content
  for select
  to authenticated
  using (
    case_enabled = true
    and exists (
      select 1 from public.festivals f
      where f.id = festival_case_content.festival_id
        and f.status = 'published'
    )
  );
