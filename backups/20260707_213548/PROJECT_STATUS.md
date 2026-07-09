# Project Status — Intern Scoreboard & Leaderboard Management System

_Last updated: 2026-07-07_

## ✅ Completed
- Project spec reviewed and scoped.
- Architecture plan drafted (`docs/ARCHITECTURE.md`).
- Project folder structure + changelog initialized.
- **Phase 1: Supabase schema + Next.js scaffold**
  - `admins`, `interns`, `score_history` tables + indexes
  - `updated_at` trigger + `log_score_change()` audit trigger
  - `public.leaderboard` view (on-read rank computation)
  - RLS policies (public read, admin-only write)
  - Seed data (10 sample interns)
  - Next.js 15 + TS project scaffold, Supabase client wiring (browser/server/middleware), route protection middleware
  - `docs/SETUP.md` with full bootstrap + first-admin instructions

## 🔨 In Progress
- Nothing actively in progress — ready for Phase 2 (public leaderboard UI) whenever you are.

## 📋 Pending
- [x] Phase 1: Supabase project setup, schema + RLS, seed data
- [ ] Phase 2: Public leaderboard (static → realtime)
- [ ] Phase 3: Admin auth (login, middleware, protected layout)
- [ ] Phase 4: Intern CRUD (add/edit/soft-delete)
- [ ] Phase 5: Score management + score_history + bulk update
- [ ] Phase 6: Dashboard stats + charts
- [ ] Phase 7: Search/filter (public + admin)
- [ ] Phase 8: Reports (CSV/Excel/PDF export)
- [ ] Phase 9: Polish — responsive pass, top-3 styling, dark mode (bonus)
- [ ] Phase 10: Deploy to Vercel, env vars, final QA

## ⚠️ Known Issues / Open Decisions
- ~~Weekly/Monthly Rankings~~ — **Resolved:** computed on the fly, no snapshot table.
- ~~Notifications~~ — **Resolved:** toast only.
- ~~Admin roles~~ — **Resolved:** single admin role, no super_admin.
- PDF export approach on Vercel — still needs a quick feasibility check for `@react-pdf/renderer`'s bundle size/cold-start before Phase 8; flagged again there.
- `npm install` and `supabase db push` have not been run in this environment (no network access to npm registry beyond what's whitelisted, and no live Supabase project to link to). You'll need to run Phase 1's setup steps locally per `docs/SETUP.md` before Phase 2 can be tested against a real DB.
