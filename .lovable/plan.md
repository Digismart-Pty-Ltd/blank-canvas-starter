# Firebase to Lovable Cloud — data migration plan

## Where things stand (audit, read-only)
- App code: Firebase is already removed. Every screen (members, events, bookings, check-in, rewards, notifications, adverts, sponsors, orders, admin) reads and writes Lovable Cloud.
- New merch orders already save to Cloud. `src/lib/orders.ts` (browser storage, key `whf:orders:v1`) is no longer used by any screen, so old orders only survive in the browsers that placed them or ran the old admin page.
- What is NOT yet moved is the **old data** still sitting in Firebase. The Firebase settings are gone from the code, so the export must come from the Firebase console (you, or whoever owns that project).

## What to export from Firebase, and where it lands

| Firebase source | Lovable Cloud destination | Notes |
|---|---|---|
| Auth accounts | auth users + `profiles` | Passwords cannot be copied. Members get a "set your password" email. |
| `users` / members collection | `profiles` (name, id number, contact, emergency `Name — Number`, member kind, tier, joined, waiver) | Old Firebase id kept in `legacy_uid` |
| admin flags | `user_roles` (admin) | Only the people you confirm by email |
| `events` | `events` | Old id in `legacy_id`; image becomes a path in the private event-images bucket |
| `registrations` / bookings | `event_registrations` | Linked by event and member; check-in times kept so race counts and tiers are right |
| `rewards`, `redemptions` | `rewards`, `redemptions` | One redemption per member per reward |
| `notifications` (+ readBy / deletedBy) | `notifications` + `notification_states` | Read/hidden lists become per-member rows |
| `sponsors` | `sponsors` | Logos to sponsor-logos bucket |
| `advertisements` | `advertisements` | Images to advert-images bucket; keeps status, dates, enabled |
| `orders` (if any were in Firestore) | `orders` + `order_lines` | Marked as already batched so no repeat emails |
| Storage files (event photos, avatars, logos, advert images) | 4 private buckets | Database rows store the new path, shown via signed links |
| FCM push tokens | not carried over | Old tokens don't work with standard web push. Members tap "Enable alerts" once again. |
| Cloud Functions | already replaced | Push sending = `send-push`; order/advert emails = queue (sending still waits on Gmail/domain); tier rules = database functions + 1 Jan / 1 Jul jobs |

Relationships: bookings → events (deleting an event with bookings is blocked; it gets archived), bookings/redemptions → member profiles, order lines → orders, notification states → notifications, profiles/roles → login accounts.

## Old orders saved in browsers
Old orders exist only on devices that used the site before the switch (mainly Waven's/admin phone or laptop). For **each** such browser/device:
1. Open the old site address in that same browser (same profile, not private mode).
2. Open a small export page I will add (`/export-old-orders`). It reads `whf:orders:v1` and downloads `orders-<device>.json`. Nothing is deleted.
   - Fallback on a computer: press F12 → Console → `copy(localStorage.getItem("whf:orders:v1"))` and paste into a text file.
3. Send me the files. Phones: Chrome/Safari on each phone separately; the installed app counts as its own browser on iPhone.
4. I merge all files, drop duplicates (same id or same name+email+time), and import them as already-sent orders.

## Order of work (after approval)
1. You send: Firebase Auth export (`firebase auth:export users.json`), Firestore export (JSON/CSV per collection), Storage files (zip or `gsutil cp -r`), and old order files.
2. I build a one-off import function (admin only) and run a **dry run** reporting counts, duplicates and broken links, without writing anything.
3. You approve the counts; I import into Cloud, upload files, and rewrite image paths.
4. Recalculate tiers from imported check-ins; send "set your password" emails only when you say so.
5. Remove the 6 TEST rows only with your OK. Firebase data is never deleted by me.

## Security
- All tables keep row rules: members see only their own data; admin role (database only) manages everything; buckets stay private.
- The import runs as an admin-only function; no keys go in the browser.
- No new tables are expected. If a column is missing, I'll show the exact SQL first.

## Risks
- Passwords can't move: every member must reset once.
- Emails used twice or changed in Firebase → duplicate accounts; resolved by email match in the dry run.
- Bookings pointing at deleted events/members are skipped and listed.
- Old orders on a cleared/lost browser are gone for good.
- Image links that were public Firebase URLs stop working once Firebase is shut down — they will be copied first.
- Imported check-ins may lift tiers instantly; open runners stay Pink.
- Order/advert email sending still needs the Gmail connection.
