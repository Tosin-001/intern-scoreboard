# Project Status — Intern Scoreboard & Leaderboard Management System

_Last updated: 2026-07-08_

## ✅ Completed
- **Full verification pass (2026-07-08):** `/`, `/login`, `/dashboard` all confirmed working end-to-end — Firestore connection, Firebase Auth, session cookies, and the dashboard's aggregation queries all tested and passing. Fixed along the way: a missing composite index, an invalid index entry blocking deploys, dead code in `firestore.rules`, a `NODE_ENV` environment bug that was silently breaking both `npm install` and the dev server, and a stray unrelated project confusing Next.js's workspace-root detection. Full detail in `CHANGELOG.md`.
- **Routing fix:** root `src/app/layout.tsx` was missing entirely (blocked every route from rendering), and `(public)`, `(admin)/login`, `(admin)/dashboard` had no `page.tsx`. All now built as working first versions — see below and `CHANGELOG.md` for detail.
- Project spec reviewed and scoped.
- Architecture plan drafted, migrated from Supabase/PostgreSQL to Firebase (Auth + Firestore + Storage), then **refactored to run entirely on Firebase's free Spark plan** (no billing account, no Cloud Functions).
- Full history preserved: pre-migration state in `backups/20260707_213548/`, pre-refactor state in `backups/20260708_041644/`; old Supabase code in `archive/supabase-implementation/`, old Cloud Functions code in `archive/cloud-functions-implementation/` — nothing deleted.
- `docs/MIGRATION_NOTES.md` — Postgres → Firestore redesign review.
- `docs/SPARK_PLAN_REFACTOR.md` — Cloud Functions → Server Action transaction refactor, with the trade-off this introduces spelled out explicitly.
- **Phase 1 (Spark-plan compatible): DB layer + project scaffold**
  - Firestore data design: `admins`, `interns`, `scoreHistory` collections (see `docs/ARCHITECTURE.md` §3)
  - `firestore.rules` — public read-only leaderboard, no client writes, scoreHistory server-only
  - `firestore.indexes.json` — composite indexes for filtered/sorted queries
  - `src/lib/actions/scores.ts` — score update + audit logging via Firestore transactions, no Cloud Functions
  - `src/app/api/scores/bulk/route.ts` — bulk score update endpoint, implemented
  - `firebase.json` — rules/indexes/emulator config only, no Functions
  - `src/lib/firebase/{client,admin,session}.ts` — client SDK, Admin SDK, and session cookie helpers
  - `src/app/api/auth/session/route.ts` — session cookie mint/clear endpoint
  - `src/types/firestore.ts` — Firestore document types + shared `computeStatus()` helper
  - `scripts/seed.ts` — Node-based seed script
  - `docs/SETUP.md` rewritten — no Blaze plan, no Functions install/deploy steps

## 🔨 In Progress
- Phase 2, 3, and 6 each have a working first version now (leaderboard, login, dashboard) but are not feature-complete — see the breakdown below.

## 📋 Pending
- [x] Phase 1: Firebase project setup (Spark plan), Firestore rules/indexes, score-history Server Action, seed data
- [~] Phase 2: Public leaderboard — **done:** real-time `onSnapshot`, rank/status computed client-side, top-3 highlighting. **missing:** search, department filter, pagination.
- [~] Phase 3: Admin auth — **done:** login page, session cookie flow, logout. **missing:** "forgot password" (not in original spec anyway), nicer error states.
- [ ] Phase 4: Intern CRUD (add/edit/soft-delete) — `(admin)/interns` page still an empty directory.
- [ ] Phase 5: Score management UI (single edit form + bulk update UI) — `lib/actions/scores.ts` and the `/api/scores/bulk` endpoint exist and work, but there's no admin page/form calling them yet.
- [~] Phase 6: Dashboard — **done:** stat cards (total/average/highest/lowest via Firestore aggregation queries), session-gated. **missing:** charts (performance distribution, top 10, score trends), sidebar/top-nav layout from the architecture doc (`(admin)/layout.tsx` is currently a bare pass-through wrapper).
- [ ] Phase 7: Search/filter (public + admin)
- [ ] Phase 8: Reports (CSV/Excel/PDF export) — `(admin)/reports` still an empty directory, `api/reports` route not implemented.
- [ ] Phase 9: Polish — responsive pass, top-3 styling refinement, dark mode (bonus)
- [ ] Phase 10: Deploy to Vercel, env vars, final QA

## ⚠️ Known Issues / Open Decisions
- ~~Weekly/Monthly Rankings~~ — **Resolved:** computed on the fly, no snapshot table.
- ~~Notifications~~ — **Resolved:** toast only.
- ~~Admin roles~~ — **Resolved:** single admin role, no super_admin.
- ~~Blaze plan requirement~~ — **Resolved:** Cloud Functions removed entirely, score-history logging moved into `lib/actions/scores.ts` via Firestore transactions. Project now runs fully on the free Spark plan.
- **New risk (Spark refactor):** score-history logging is now an app-code convention (everything must go through `lib/actions/scores.ts`), not a platform-enforced guarantee. Documented clearly in `docs/SPARK_PLAN_REFACTOR.md` — worth double-checking during Phase 4/5 that no new code path writes `interns.score` directly.
- Authorization for admin writes is enforced in app code (`verifySession()` in every Server Action) since `firebase-admin` bypasses Security Rules — see `docs/MIGRATION_NOTES.md` §3.
- Rank computed client-side from a full sorted query — fine now, would need rework at large scale.
- Search is prefix-match only (no true full-text) — Algolia flagged as a future upgrade if needed.
- PDF export approach — still needs a feasibility check for `@react-pdf/renderer` on Vercel, plus a decision on whether to route exports through Firebase Storage or stream them directly (Phase 8).
- `npm install`, `firebase deploy`, and `npm run seed` have not been run in this environment (no live Firebase project to deploy against). You'll run Phase 1's setup steps locally per `docs/SETUP.md`.
