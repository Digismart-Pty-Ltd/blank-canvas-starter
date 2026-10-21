# Admin entry gate
- [x] Replace shared-password gate with existing email/password sign-in and password-reset flow.
- [x] Validate the current user and read their admin role, denying access while loading.
- [x] Start temporary Firebase session only for authorised admins; sign out both services on exit.
- [x] Remove storage-driven startup routing while preserving explicit PWA routing.
- [x] Test access states and verify the signed-in admin flow; report files and limitations.