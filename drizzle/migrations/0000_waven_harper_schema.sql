do $$ begin
  create type public.app_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.event_start(d date, t time)
returns timestamptz
language sql immutable
as $$
  select ((d + coalesce(t, time '00:00')) at time zone 'Africa/Johannesburg')
$$;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  description text
);
alter table public.app_settings enable row level security;

drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings" on public.app_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_uid text unique,
  name text not null default '',
  email text not null default '',
  id_number text,
  contact text,
  emergency text,
  member_kind text not null default 'member' check (member_kind in ('member', 'open')),
  tier text not null default 'Pink' check (tier in ('Pink', 'Silver', 'Gold', 'Platinum')),
  rewards_pending integer not null default 0,
  last_run date,
  joined date not null default current_date,
  waiver_accepted boolean not null default false,
  waiver_accepted_at timestamptz,
  avatar_path text,
  tier_reset_at timestamptz,
  last_tier_check timestamptz,
  tier_downgraded_at timestamptz,
  upgraded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.my_kind()
returns text language sql stable security definer set search_path = public
as $$ select member_kind from public.profiles where id = auth.uid() $$;

create or replace function public.my_tier()
returns text language sql stable security definer set search_path = public
as $$ select tier from public.profiles where id = auth.uid() $$;

drop policy if exists "Members read own profile" on public.profiles;
create policy "Members read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Members update own profile" on public.profiles;
create policy "Members update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_waiver boolean := (m->>'waiver_accepted') = 'true';
begin
  insert into public.profiles
    (id, email, name, id_number, contact, emergency, member_kind, waiver_accepted, waiver_accepted_at)
  values
    (new.id, coalesce(new.email, ''), coalesce(m->>'name', ''), m->>'id_number',
     m->>'contact', m->>'emergency',
     case when m->>'member_kind' = 'open' then 'open' else 'member' end,
     v_waiver, case when v_waiver then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.become_member(
  p_name text, p_id_number text, p_contact text, p_emergency text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  update public.profiles
     set member_kind = 'member',
         name = coalesce(nullif(trim(p_name), ''), name),
         id_number = coalesce(p_id_number, id_number),
         contact = coalesce(p_contact, contact),
         emergency = coalesce(p_emergency, emergency),
         waiver_accepted = true,
         waiver_accepted_at = now(),
         upgraded_at = now()
   where id = auth.uid();
end $$;

create or replace function public.admin_set_tier(p_user uuid, p_tier text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if p_tier not in ('Pink', 'Silver', 'Gold', 'Platinum') then raise exception 'Unknown tier'; end if;
  update public.profiles set tier = p_tier where id = p_user;
end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  event_date date not null,
  event_time time,
  meeting_place text,
  after_run_place text,
  description text,
  image_url text,
  members_only boolean not null default false,
  distance_km numeric,
  distance_display text,
  image_orientation text check (image_orientation in ('landscape', 'portrait')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop policy if exists "Anyone reads events" on public.events;
create policy "Anyone reads events" on public.events
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null default '',
  contact text,
  emergency text,
  open_runner boolean not null default false,
  tier text,
  checked_in_at timestamptz,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists event_registrations_one_per_user
  on public.event_registrations (event_id, user_id) where user_id is not null;
create index if not exists event_registrations_user_idx on public.event_registrations (user_id);
alter table public.event_registrations enable row level security;

create or replace function public.registration_defaults()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.checked_in_at := null;
    new.reminder_sent := false;
    new.open_runner := (public.my_kind() = 'open');
    new.tier := case when public.my_kind() = 'member' then public.my_tier() end;
  end if;
  return new;
end $$;

drop trigger if exists registration_defaults on public.event_registrations;
create trigger registration_defaults before insert on public.event_registrations
  for each row execute function public.registration_defaults();

drop policy if exists "Members read own registrations" on public.event_registrations;
create policy "Members read own registrations" on public.event_registrations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins read all registrations" on public.event_registrations;
create policy "Admins read all registrations" on public.event_registrations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Members register themselves" on public.event_registrations;
create policy "Members register themselves" on public.event_registrations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (not e.members_only or public.my_kind() = 'member')
    )
  );

drop policy if exists "Members cancel own registration" on public.event_registrations;
create policy "Members cancel own registration" on public.event_registrations
  for delete to authenticated
  using (user_id = auth.uid() and checked_in_at is null);

drop policy if exists "Admins update registrations" on public.event_registrations;
create policy "Admins update registrations" on public.event_registrations
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete registrations" on public.event_registrations;
create policy "Admins delete registrations" on public.event_registrations
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace view public.event_registration_counts
  with (security_invoker = false) as
  select event_id, count(*)::int as registrations
  from public.event_registrations
  group by event_id;
grant select on public.event_registration_counts to anon, authenticated;

create or replace view public.member_stats
  with (security_invoker = true) as
  select p.id as user_id,
         count(r.id) filter (where r.checked_in_at is not null)::int as races_total,
         count(r.id) filter (
           where r.checked_in_at is not null
             and r.checked_in_at >= (date_trunc('year', now() at time zone 'Africa/Johannesburg')
                                     at time zone 'Africa/Johannesburg')
         )::int as races_this_year
  from public.profiles p
  left join public.event_registrations r on r.user_id = p.id
  group by p.id;
grant select on public.member_stats to authenticated;

create or replace function public.check_in(p_registration_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_reg public.event_registrations;
  v_start timestamptz;
  v_expected text;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;

  select * into v_reg from public.event_registrations
   where id = p_registration_id and user_id = auth.uid();
  if not found then raise exception 'Registration not found'; end if;
  if v_reg.checked_in_at is not null then raise exception 'Already checked in'; end if;

  select public.event_start(e.event_date, e.event_time) into v_start
    from public.events e where e.id = v_reg.event_id;
  if now() < v_start - interval '30 minutes' or now() > v_start + interval '2 hours' then
    raise exception 'Check-in is not open for this event';
  end if;

  select value into v_expected from public.app_settings where key = 'checkin_code';
  if v_expected is null or v_expected in ('', 'CHANGE_ME') then
    raise exception 'Check-in is not configured';
  end if;
  if p_code is distinct from v_expected then raise exception 'Invalid check-in code'; end if;

  update public.event_registrations set checked_in_at = now() where id = p_registration_id;
end $$;

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  logo_url text,
  website_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sponsors enable row level security;

drop policy if exists "Anyone reads sponsors" on public.sponsors;
create policy "Anyone reads sponsors" on public.sponsors
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage sponsors" on public.sponsors;
create policy "Admins manage sponsors" on public.sponsors
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  tier text not null check (tier in ('Pink', 'Silver', 'Gold', 'Platinum', 'Special')),
  title text not null,
  description text,
  expires_in_days integer,
  created_at timestamptz not null default now()
);
alter table public.rewards enable row level security;

drop policy if exists "Logged-in users read rewards" on public.rewards;
create policy "Logged-in users read rewards" on public.rewards
  for select to authenticated using (true);

drop policy if exists "Admins manage rewards" on public.rewards;
create policy "Admins manage rewards" on public.rewards
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (user_id, reward_id)
);
alter table public.redemptions enable row level security;

drop policy if exists "Members read own redemptions" on public.redemptions;
create policy "Members read own redemptions" on public.redemptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins read redemptions" on public.redemptions;
create policy "Admins read redemptions" on public.redemptions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.redeem_reward(p_reward_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_reward public.rewards;
  v_tier text;
  v_expected text;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if not found then raise exception 'Reward not found'; end if;

  v_tier := public.my_tier();
  if v_reward.tier <> 'Special' and v_reward.tier is distinct from v_tier then
    raise exception 'This reward is not available for your tier';
  end if;

  if v_reward.expires_in_days is not null
     and now() > v_reward.created_at + make_interval(days => v_reward.expires_in_days) then
    raise exception 'This reward has expired';
  end if;

  select value into v_expected from public.app_settings where key = 'redeem_code:' || v_reward.tier;
  if v_expected is null or v_expected in ('', 'CHANGE_ME') then
    raise exception 'Reward redemption is not configured';
  end if;
  if p_code is distinct from v_expected then raise exception 'Invalid reward code'; end if;

  begin
    insert into public.redemptions (user_id, reward_id) values (auth.uid(), p_reward_id);
  exception when unique_violation then
    raise exception 'Already redeemed';
  end;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  body text not null default '',
  audience text not null default 'all' check (audience in ('all', 'members', 'open')),
  target_tier text check (target_tier in ('Pink', 'Silver', 'Gold', 'Platinum')),
  user_id uuid,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "Visitors read public notifications" on public.notifications;
create policy "Visitors read public notifications" on public.notifications
  for select to anon
  using (user_id is null and audience = 'all' and target_tier is null);

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications" on public.notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and (target_tier is null or target_tier = public.my_tier())
      and (
        audience = 'all'
        or (audience = 'members' and public.my_kind() = 'member')
        or (audience = 'open' and public.my_kind() = 'open')
      )
    )
  );

drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.notification_states (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz,
  hidden_at timestamptz,
  primary key (notification_id, user_id)
);
alter table public.notification_states enable row level security;

drop policy if exists "Users manage own notification state" on public.notification_states;
create policy "Users manage own notification state" on public.notification_states
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;

drop policy if exists "Users read own push tokens" on public.push_tokens;
create policy "Users read own push tokens" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users delete own push tokens" on public.push_tokens;
create policy "Users delete own push tokens" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.register_push_token(p_token text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  if coalesce(trim(p_token), '') = '' then raise exception 'Token required'; end if;
  insert into public.push_tokens (user_id, token) values (auth.uid(), p_token)
  on conflict (token) do update set user_id = excluded.user_id, created_at = now();
end $$;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_emails text[] not null default '{}',
  subject text not null,
  body_text text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.email_outbox enable row level security;

drop policy if exists "Admins read outbox" on public.email_outbox;
create policy "Admins read outbox" on public.email_outbox
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.queue_admin_email(p_subject text, p_body text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_admin text;
begin
  select value into v_admin from public.app_settings where key = 'admin_email';
  insert into public.email_outbox (to_emails, subject, body_text)
  values (
    case when v_admin is null or v_admin in ('', 'CHANGE_ME') then '{}'::text[]
         else string_to_array(replace(v_admin, ' ', ''), ',') end,
    p_subject, p_body
  );
end $$;

create sequence if not exists public.order_number_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  order_number text not null unique
    default ('WH-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  name text not null,
  email text not null,
  phone text,
  notes text,
  batched boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product text not null,
  colour text,
  size text,
  qty integer not null check (qty > 0)
);
alter table public.order_lines enable row level security;

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage order lines" on public.order_lines;
create policy "Admins manage order lines" on public.order_lines
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.create_order_batch(p_force boolean default false)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
  v_body text;
begin
  perform pg_advisory_xact_lock(7001);
  select count(*) into v_count from public.orders where not batched;
  if v_count = 0 or (v_count < 10 and not p_force) then return 0; end if;

  select string_agg(
           o.order_number || ' - ' || o.name || ' (' || o.email || ', ' || coalesce(o.phone, '') || ')'
           || coalesce(E'\n' || (
                select string_agg('  ' || l.qty || ' x ' || l.product
                                  || ' / ' || coalesce(l.colour, '') || ' / ' || coalesce(l.size, ''),
                                  E'\n')
                from public.order_lines l where l.order_id = o.id), '')
           || case when coalesce(o.notes, '') <> '' then E'\n  Notes: ' || o.notes else '' end,
           E'\n\n' order by o.created_at)
    into v_body
    from public.orders o
   where not o.batched;

  perform public.queue_admin_email('Merchandise order batch (' || v_count || ' orders)', v_body);
  update public.orders set batched = true where not batched;
  return v_count;
end $$;

create or replace function public.submit_order(
  p_name text, p_email text, p_phone text, p_notes text, p_lines jsonb)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_number text;
  v_line jsonb;
  v_body text;
begin
  if coalesce(trim(p_name), '') = '' or length(p_name) > 200 then
    raise exception 'Name is required';
  end if;
  if p_email is null or length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) not between 1 and 20 then
    raise exception 'An order needs between 1 and 20 items';
  end if;

  insert into public.orders (name, email, phone, notes)
  values (trim(p_name), trim(p_email), left(coalesce(p_phone, ''), 40), left(coalesce(p_notes, ''), 2000))
  returning id, order_number into v_order_id, v_number;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if coalesce(trim(v_line->>'product'), '') = ''
       or coalesce((v_line->>'qty')::int, 0) not between 1 and 50 then
      raise exception 'Invalid order line';
    end if;
    insert into public.order_lines (order_id, product, colour, size, qty)
    values (v_order_id, left(v_line->>'product', 200),
            left(coalesce(v_line->>'colour', ''), 100),
            left(coalesce(v_line->>'size', ''), 50),
            (v_line->>'qty')::int);
  end loop;

  select 'New merchandise order ' || v_number || E'\n'
         || 'Name: ' || trim(p_name) || E'\nEmail: ' || trim(p_email)
         || E'\nPhone: ' || coalesce(p_phone, '') || E'\n\n'
         || string_agg(l.qty || ' x ' || l.product || ' / ' || coalesce(l.colour, '') || ' / '
                       || coalesce(l.size, ''), E'\n')
         || case when coalesce(p_notes, '') <> '' then E'\n\nNotes: ' || p_notes else '' end
    into v_body
    from public.order_lines l where l.order_id = v_order_id;

  perform public.queue_admin_email('New merchandise order ' || v_number, v_body);
  perform public.create_order_batch(false);
  return v_number;
end $$;

create or replace function public.admin_send_order_batch()
returns integer language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return public.create_order_batch(true);
end $$;

create sequence if not exists public.advert_number_seq;

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  order_number text not null unique
    default ('AD-' || lpad(nextval('public.advert_number_seq')::text, 5, '0')),
  business_name text not null,
  slogan text,
  logo_url text,
  website_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  is_member boolean not null default false,
  price numeric,
  ad_type text check (ad_type in ('logo', 'banner')),
  image_url text,
  dimensions text,
  activation_date date,
  months integer,
  expiry_date date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.advertisements enable row level security;

drop policy if exists "Admins manage advertisements" on public.advertisements;
create policy "Admins manage advertisements" on public.advertisements
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace view public.public_advertisements
  with (security_invoker = false) as
  select id, business_name, slogan, logo_url, website_url, ad_type, image_url,
         dimensions, activation_date, expiry_date
  from public.advertisements
  where status = 'approved'
    and enabled
    and (activation_date is null or activation_date <= current_date)
    and (expiry_date is null or expiry_date >= current_date);
grant select on public.public_advertisements to anon, authenticated;

create or replace function public.submit_advertisement(
  p_business_name text, p_slogan text, p_logo_url text, p_website_url text,
  p_contact_name text, p_contact_email text, p_contact_phone text,
  p_is_member boolean, p_price numeric, p_ad_type text, p_image_url text,
  p_dimensions text, p_activation_date date, p_months integer)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_number text;
  v_expiry date;
begin
  if coalesce(trim(p_business_name), '') = '' or length(p_business_name) > 200 then
    raise exception 'Business name is required';
  end if;
  if p_contact_email is null or length(p_contact_email) > 254
     or p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid contact email is required';
  end if;
  if p_ad_type is not null and p_ad_type not in ('logo', 'banner') then
    raise exception 'Unknown advert type';
  end if;
  if p_months is not null and p_months not between 1 and 36 then
    raise exception 'Months must be between 1 and 36';
  end if;
  if p_price is not null and p_price < 0 then raise exception 'Invalid price'; end if;

  if p_activation_date is not null and p_months is not null then
    v_expiry := (p_activation_date + make_interval(months => p_months))::date;
  end if;

  insert into public.advertisements
    (business_name, slogan, logo_url, website_url, contact_name, contact_email, contact_phone,
     is_member, price, ad_type, image_url, dimensions, activation_date, months, expiry_date,
     status, enabled)
  values
    (trim(p_business_name), left(p_slogan, 300), left(p_logo_url, 1000), left(p_website_url, 500),
     left(p_contact_name, 200), trim(p_contact_email), left(p_contact_phone, 40),
     coalesce(p_is_member, false), p_price, p_ad_type, left(p_image_url, 1000), left(p_dimensions, 100),
     p_activation_date, p_months, v_expiry, 'pending', false)
  returning order_number into v_number;

  perform public.queue_admin_email(
    'New advert application ' || v_number,
    'Business: ' || trim(p_business_name)
    || E'\nContact: ' || coalesce(p_contact_name, '') || ' / ' || trim(p_contact_email)
    || ' / ' || coalesce(p_contact_phone, '')
    || E'\nType: ' || coalesce(p_ad_type, '')
    || E'\nStart: ' || coalesce(p_activation_date::text, '') || ' for ' || coalesce(p_months::text, '?') || ' month(s)'
    || E'\nPrice: ' || coalesce(p_price::text, '')
    || E'\nMember: ' || coalesce(p_is_member, false)::text
    || E'\n\nReview it in the admin page.');

  return v_number;
end $$;

drop policy if exists "Admins manage event and sponsor images" on storage.objects;
create policy "Admins manage event and sponsor images" on storage.objects
  for all to authenticated
  using (bucket_id in ('event-images', 'sponsor-logos') and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id in ('event-images', 'sponsor-logos') and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Anyone uploads advert images" on storage.objects;
create policy "Anyone uploads advert images" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'advert-images');

drop policy if exists "Admins manage advert images" on storage.objects;
create policy "Admins manage advert images" on storage.objects
  for all to authenticated
  using (bucket_id = 'advert-images' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'advert-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Members manage own avatar" on storage.objects;
create policy "Members manage own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Admins read avatars" on storage.objects;
create policy "Admins read avatars" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Anyone can view public images" on storage.objects;
create policy "Anyone can view public images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('event-images', 'sponsor-logos', 'advert-images'));

do $$
declare t text;
begin
  foreach t in array array[
    'events', 'sponsors', 'notifications', 'notification_states', 'event_registrations',
    'rewards', 'redemptions', 'profiles', 'orders', 'advertisements'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

revoke execute on function public.queue_admin_email(text, text) from public, anon, authenticated;
revoke execute on function public.create_order_batch(boolean) from public, anon, authenticated;

revoke execute on function public.submit_order(text, text, text, text, jsonb) from public;
grant  execute on function public.submit_order(text, text, text, text, jsonb) to anon, authenticated;

revoke execute on function public.submit_advertisement(
  text, text, text, text, text, text, text, boolean, numeric, text, text, text, date, integer) from public;
grant  execute on function public.submit_advertisement(
  text, text, text, text, text, text, text, boolean, numeric, text, text, text, date, integer)
  to anon, authenticated;

revoke execute on function public.become_member(text, text, text, text) from public, anon;
grant  execute on function public.become_member(text, text, text, text) to authenticated;
revoke execute on function public.check_in(uuid, text) from public, anon;
grant  execute on function public.check_in(uuid, text) to authenticated;
revoke execute on function public.redeem_reward(uuid, text) from public, anon;
grant  execute on function public.redeem_reward(uuid, text) to authenticated;
revoke execute on function public.register_push_token(text) from public, anon;
grant  execute on function public.register_push_token(text) to authenticated;

revoke execute on function public.admin_set_tier(uuid, text) from public, anon;
grant  execute on function public.admin_set_tier(uuid, text) to authenticated;
revoke execute on function public.admin_send_order_batch() from public, anon;
grant  execute on function public.admin_send_order_batch() to authenticated;

grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.app_settings to service_role;
grant select, insert, update, delete on public.app_settings to authenticated;
grant all on public.profiles to service_role;
grant select on public.profiles to authenticated;
grant update (name, contact, emergency, id_number, avatar_path, last_run) on public.profiles to authenticated;
grant all on public.events to service_role;
grant select, insert, update, delete on public.events to authenticated;
grant select on public.events to anon;
grant all on public.event_registrations to service_role;
grant select, insert, update, delete on public.event_registrations to authenticated;
grant all on public.sponsors to service_role;
grant select, insert, update, delete on public.sponsors to authenticated;
grant select on public.sponsors to anon;
grant all on public.rewards to service_role;
grant select, insert, update, delete on public.rewards to authenticated;
grant all on public.redemptions to service_role;
grant select, insert, update, delete on public.redemptions to authenticated;
grant all on public.notifications to service_role;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.notifications to anon;
grant all on public.notification_states to service_role;
grant select, insert, update, delete on public.notification_states to authenticated;
grant all on public.push_tokens to service_role;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.email_outbox to service_role;
grant select on public.email_outbox to authenticated;
grant all on public.orders to service_role;
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.order_lines to service_role;
grant select, insert, update, delete on public.order_lines to authenticated;
grant all on public.advertisements to service_role;
grant select, insert, update, delete on public.advertisements to authenticated;