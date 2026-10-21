# Architecture rules
- Admin entry uses validated Cloud identity and a fresh own-user roles query, never legacy store flags; database policies remain the security boundary for Cloud data.
- Keep legacy Firebase dashboard components behind the admin gate and await temporary anonymous Firebase sign-in before mounting them, until their data migration is explicitly requested.
- Keep admin display-state decisions in a small pure helper with executable access-rule tests so loading and signed-out states cannot accidentally reveal the dashboard.