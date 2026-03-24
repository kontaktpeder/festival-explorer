
-- Fix: make asset_handles_resolved a regular view (not security definer)
-- and grant proper access by ensuring RLS on underlying tables handles auth
drop view if exists public.asset_handles_resolved;

create view public.asset_handles_resolved
with (security_invoker = true) as
select
  ah.id as asset_id,
  'media'::text as source_type,
  ah.media_id as source_id,
  m.original_filename,
  m.file_type,
  m.mime_type,
  m.size_bytes,
  m.public_url,
  null::uuid as festival_id,
  m.created_by,
  m.created_at
from public.asset_handles ah
join public.media m on m.id = ah.media_id
union all
select
  ah.id as asset_id,
  'festival_media'::text as source_type,
  ah.festival_media_id as source_id,
  fm.original_filename,
  fm.file_type,
  fm.mime_type,
  fm.size_bytes,
  fm.public_url,
  fm.festival_id,
  fm.created_by,
  fm.created_at
from public.asset_handles ah
join public.festival_media fm on fm.id = ah.festival_media_id;
