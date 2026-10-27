# Move everything off Firebase to Lovable Cloud

## Decisions (from your answers)
- Old Firebase data is copied over (needs an export from you).
- Phone alerts use standard web push (no Firebase).
- Admins can upload event photos.
- Removing an event with bookings archives it (hidden from members, bookings kept).

## Phases
1. **Database prep** (I will show you the exact SQL before running it)
   - Add "archived" (on/off, default off) to events; members only see non-archived events.
   - Change the bookings-to-event link so an event with bookings cannot be hard-deleted.
   - Storage rule so admins can upload into event photos.
   - Table for web-push subscriptions (replaces Firebase tokens).
2. **Admin dashboard, tab by tab** on Lovable Cloud: Overview, Events (with photo upload + archive), Members, Rewards, Orders, Notifications, QR Codes (read live from settings), Sponsors, Adverts.
3. **Member screens still on Firebase**: merch orders (RunningClub), advert application + adverts list/banner, notifications feed, header/footer, membership fallback.
4. **Web push**: new keys, browser subscription, a server function that sends alerts when admins post a notification.
5. **Remove Firebase**: delete firebase setup, old services, old store, anonymous admin sign-in, Firebase parts of the service worker; uninstall the package.
6. **Data import**: once you send the Firebase export (JSON/CSV for users, events, bookings, orders, adverts, notifications, sponsors, rewards, photos), import it. Member passwords cannot be copied, so imported members will set a new password via "Forgot password".

## Needed from you
- Firebase export files (phase 6).
- Approval of each SQL step before it runs.

## Technical notes
- Firestore `onSnapshot` replaced by realtime subscriptions in `src/lib/api/*`.
- Uploads go to the private `event-images` bucket; displayed via signed links (existing `useImageUrl`).
- Admin writes rely on existing `has_role` admin policies; every change is recorded in the audit log.
- Web push: VAPID keys stored as secrets, `web-push` sending in an edge function.
