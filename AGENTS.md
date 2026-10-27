# Architecture rules
- Admin entry uses validated Cloud identity and a fresh own-user roles query, never legacy store flags; database policies remain the security boundary for Cloud data.
- Firebase is fully removed; all data, uploads and push go through Lovable Cloud (data access in `src/lib/api/*` and the `*Service.ts` adapters) so there is one backend to secure.
- Images are stored as paths in private buckets and displayed via signed links (`useImageUrl` / `SignedImage`), because public buckets are blocked in this workspace.
- Events with bookings are archived, never hard-deleted, because bookings keep members' race history (the database enforces this).
- Web push uses standard VAPID subscriptions saved via `register_push_token` and sent by the `send-push` function, avoiding any third-party push vendor.
- Keep admin display-state decisions in a small pure helper with executable access-rule tests so loading and signed-out states cannot accidentally reveal the dashboard.
