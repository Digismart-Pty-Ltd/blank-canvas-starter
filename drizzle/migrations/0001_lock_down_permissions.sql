-- A1. Start from nothing for the two browser-facing roles
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function public.admin_send_order_batch() from public, anon, authenticated;
revoke execute on function public.admin_set_tier(uuid, text) from public, anon, authenticated;
revoke execute on function public.become_member(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.check_in(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_order_batch(boolean) from public, anon, authenticated;
revoke execute on function public.event_start(date, time without time zone) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.queue_admin_email(text, text) from public, anon, authenticated;
revoke execute on function public.redeem_reward(uuid, text) from public, anon, authenticated;
revoke execute on function public.register_push_token(text) from public, anon, authenticated;
revoke execute on function public.registration_defaults() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.submit_advertisement(text, text, text, text, text, text, text, boolean, numeric, text, text, text, date, integer) from public, anon, authenticated;
revoke execute on function public.submit_order(text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.my_kind() from public;
revoke execute on function public.my_tier() from public;

-- A2. Visitors (not logged in): read public content only
grant select on public.events, public.sponsors, public.notifications to anon;
grant select on public.event_registration_counts, public.public_advertisements to anon;

-- A3. Logged-in users: tables where row security limits them to their own rows or to admins
grant select, insert, update, delete on
  public.events, public.sponsors, public.rewards, public.notifications,
  public.event_registrations, public.notification_states,
  public.orders, public.order_lines, public.advertisements,
  public.app_settings, public.user_roles
to authenticated;

grant select on public.redemptions, public.email_outbox to authenticated;
grant select, delete on public.push_tokens to authenticated;

-- A4. Profiles: members can READ and edit only a few safe columns.
--     Tier, membership type and waiver can only change through the functions below.
grant select on public.profiles to authenticated;
grant update (name, contact, emergency, id_number, avatar_path, last_run)
  on public.profiles to authenticated;

-- A5. Views
grant select on public.member_stats to authenticated;
grant select on public.event_registration_counts, public.public_advertisements to authenticated;

-- A6. Functions
-- Helpers that row-security policies call
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function public.my_kind() to anon, authenticated;
grant execute on function public.my_tier() to anon, authenticated;

-- Public forms (visitors may submit; the server validates everything)
grant execute on function public.submit_order(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.submit_advertisement(
  text, text, text, text, text, text, text, boolean, numeric, text, text, text, date, integer)
  to anon, authenticated;

-- Logged-in members
grant execute on function public.become_member(text, text, text, text) to authenticated;
grant execute on function public.check_in(uuid, text) to authenticated;
grant execute on function public.redeem_reward(uuid, text) to authenticated;
grant execute on function public.register_push_token(text) to authenticated;

-- Admin functions (they also check the admin role inside)
grant execute on function public.admin_set_tier(uuid, text) to authenticated;
grant execute on function public.admin_send_order_batch() to authenticated;

-- NOT granted to anyone from the browser (server-side only):
--   queue_admin_email, create_order_batch, handle_new_user,
--   registration_defaults, set_updated_at, event_start

-- A7. Storage: public images readable by anyone, but ONLY these three buckets.
--     Avatars stay private (owner + admins, from the policies in 01_schema.sql).
drop policy if exists "Anyone can view public images" on storage.objects;
create policy "Anyone can view public images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('event-images', 'sponsor-logos', 'advert-images'));