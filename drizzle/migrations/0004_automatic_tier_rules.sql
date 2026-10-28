create extension if not exists pg_cron;

create or replace function public.tier_rank(t text) returns int
language sql immutable set search_path = public as $$
  select case t when 'Platinum' then 4 when 'Gold' then 3 when 'Silver' then 2 else 1 end
$$;

create or replace function public.races_between(p_user uuid, p_from date, p_to date) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
    from public.event_registrations r
    join public.events e on e.id = r.event_id
   where r.user_id = p_user and r.checked_in_at is not null
     and e.event_date >= p_from and e.event_date < p_to
$$;

create or replace function public.recompute_tier(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now() at time zone 'Africa/Johannesburg');
  v_n int := public.races_between(p_user, make_date(v_year,1,1), make_date(v_year+1,1,1));
  v_earned text := case when v_n >= 36 then 'Platinum' when v_n >= 24 then 'Gold'
                        when v_n >= 12 then 'Silver' else 'Pink' end;
begin
  update public.profiles
     set tier = v_earned, last_tier_check = now()
   where id = p_user and member_kind = 'member'
     and public.tier_rank(v_earned) > public.tier_rank(tier);
end $$;

create or replace function public.on_checkin_recompute_tier() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.checked_in_at is not null and old.checked_in_at is null and new.user_id is not null then
    perform public.recompute_tier(new.user_id);
  end if;
  return new;
end $$;

create trigger recompute_tier_on_checkin
  after update of checked_in_at on public.event_registrations
  for each row execute function public.on_checkin_recompute_tier();

create or replace function public.yearly_tier_reset() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set tier = 'Pink', tier_reset_at = now(), last_tier_check = now()
   where member_kind = 'member' and tier <> 'Platinum';
  update public.profiles set tier_reset_at = now()
   where member_kind = 'member' and tier = 'Platinum';
end $$;

create or replace function public.platinum_retention_check() returns void
language plpgsql security definer set search_path = public as $$
declare v_year int := extract(year from now() at time zone 'Africa/Johannesburg');
begin
  update public.profiles p
     set tier = 'Gold', tier_downgraded_at = now(), last_tier_check = now()
   where p.member_kind = 'member' and p.tier = 'Platinum'
     and public.races_between(p.id, make_date(v_year,1,1), make_date(v_year,7,1)) < 12;
end $$;

revoke execute on function public.races_between(uuid,date,date) from public, anon, authenticated;
revoke execute on function public.recompute_tier(uuid) from public, anon, authenticated;
revoke execute on function public.on_checkin_recompute_tier() from public, anon, authenticated;
revoke execute on function public.yearly_tier_reset() from public, anon, authenticated;
revoke execute on function public.platinum_retention_check() from public, anon, authenticated;