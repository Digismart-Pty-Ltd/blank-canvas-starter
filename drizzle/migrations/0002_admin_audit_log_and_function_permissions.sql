-- =====================================================================
-- 04_audit_log.sql
-- Records WHICH ADMIN changed WHAT and WHEN. Run after 01 and 03. Safe to re-run.
-- It stores only: who, when, which table, insert/update/delete, the row id,
-- and the NAMES of changed columns. It never copies the data itself,
-- so no personal details end up in the log.
-- Only actions by admins are logged (member sign-ups, bookings, form
-- submissions and the reminder job are not).
-- =====================================================================

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_name text,
  table_name text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  row_id text,
  changed_columns text[]
);
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
-- No insert/update/delete policies: only the trigger below can write, and nobody can edit it.


create or replace function public.log_admin_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb;
  v_cols text[];
begin
  if v_actor is null or not public.has_role(v_actor, 'admin') then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_cols
      from jsonb_each(to_jsonb(new)) n
     where n.key <> 'updated_at'
       and n.value is distinct from (to_jsonb(old) -> n.key);
    if v_cols is null then
      return null;   -- nothing really changed
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, actor_name, table_name, action, row_id, changed_columns)
  values (
    v_actor,
    (select p.name from public.profiles p where p.id = v_actor),
    tg_table_name,
    lower(tg_op),
    coalesce(v_row ->> 'id', v_row ->> 'key'),
    v_cols
  );
  return null;
end $$;

revoke execute on function public.log_admin_change() from public, anon, authenticated;

-- Attach to every table an admin can change
do $$
declare t text;
begin
  foreach t in array array[
    'events', 'rewards', 'sponsors', 'advertisements', 'orders', 'notifications',
    'event_registrations', 'profiles', 'user_roles', 'app_settings'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', t, t);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I
         for each row execute function public.log_admin_change()', t, t);
  end loop;
end $$;

alter function public.event_start(date, time) set search_path = public;
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.has_role(uuid, public.app_role), public.my_kind(), public.my_tier() from anon;
revoke execute on function public.log_admin_change() from public, anon, authenticated;