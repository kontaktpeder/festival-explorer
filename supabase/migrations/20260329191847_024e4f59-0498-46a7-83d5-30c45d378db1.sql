alter table public.event_program_slots
  drop constraint if exists event_program_slots_section_id_fkey;

alter table public.event_program_slots
  add constraint event_program_slots_section_id_fkey
  foreign key (section_id)
  references public.event_program_sections(id)
  on delete cascade;