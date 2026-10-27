alter table public.events
  add column archived boolean not null default false;

alter table public.event_registrations
  drop constraint event_registrations_event_id_fkey;

alter table public.event_registrations
  add constraint event_registrations_event_id_fkey
  foreign key (event_id) references public.events(id) on delete restrict;