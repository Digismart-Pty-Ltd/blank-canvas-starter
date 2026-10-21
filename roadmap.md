# Admin entry gate
- [ ] Replace shared-password gate with existing email/password sign-in and password-reset flow.
- [ ] Validate the current user and read their admin role, denying access while loading.
- [ ] Start temporary Firebase session only for authorised admins; sign out both services on exit.
- [ ] Remove storage-driven startup routing while preserving explicit PWA routing.
- [ ] Test access states and verify the signed-in admin flow; report files and limitations.