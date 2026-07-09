# Project Status — Intern Scoreboard & Leaderboard Management System

_Last updated: 2026-07-07_

## ✅ Completed
- Project spec reviewed and scoped.
- Architecture plan drafted, then **migrated from Supabase/PostgreSQL to Firebase (Auth + Firestore + Storage)**.
- Full pre-migration state backed up (`backups/20260707_213548/`) and old Supabase code archived, not deleted (`archive/supabase-implementation/`).
- `docs/MIGRATION_NOTES.md` — complete redesign review (ranking, score-history trigger, RLS→rules, session handling, search, aggregates, pagination, referential integrity).
- **Phase 1 (rebuilt for Firebase): DB layer + project scaffold**
  - Firestore data design: `admins`, `interns`, `scoreHistory` collections (see `docs/ARCHITECTURE.md` §3)
  - `firestore.rules` — public read-only leaderboard, no client writes, scoreHistory server-only
  - `firestore.indexes.json` — composite indexes for filtered/sorted queries
  - `functions/src/index.ts` — Cloud Function auto-logging score changes (replaces the old Postgres trigger)
  - `firebase.json` — rules/indexes/functions/emulator config
  - `src/lib/firebase/{client,admin,session}.ts` — client SDK, Admin SDK, and session cookie helpers
  - `src/app/api/auth/session/route.ts` — session cookie mint/clear endpoint
  - `src/types/firestore.ts` — Firestore document types + shared `computeStatus()` helper
  - `scripts/seed.ts` — Node-based seed script (replaces `seed.sql`)
  - `docs/SETUP.md` rewritten for Firebase project setup, Blaze plan, and first-admin provisioning

## 🔨 In Progress
- Nothing actively in progress — ready for Phase 2 (public leaderboard UI, now built on Firestore `onSnapshot`) whenever you are.

## 📋 Pending
- [x] Phase 1: Firebase project setup, Firestore rules/indexes, Cloud Function, seed data
- [ ] Phase 2: Public leaderboard (static → `onSnapshot` real-time)
- [ ] Phase 3: Admin auth (login, middleware, protected layout)
- [ ] Phase 4: Intern CRUD (add/edit/soft-delete)
- [ ] Phase 5: Score management + score_history + bulk update
- [ ] Phase 6: Dashboard stats + charts
- [ ] Phase 7: Search/filter (public + admin)
- [ ] Phase 8: Reports (CSV/Excel/PDF export)
- [ ] Phase 9: Polish — responsive pass, top-3 styling, dark mode (bonus)
- [ ] Phase 10: Deploy to Vercel, env vars, final QA

## ⚠️ Known Issues / Open Decisions
- ~~Weekly/Monthly Rankings~~ — **Resolved:** computed on the fly, no snapshot table (still holds under Firestore).
- ~~Notifications~~ — **Resolved:** toast only.
- ~~Admin roles~~ — **Resolved:** single admin role, no super_admin.
- **New (Firebase):** Cloud Functions require the Blaze plan — needs a billing account attached before Phase 1's Cloud Function can actually be deployed.
- **New (Firebase):** Authorization for admin writes is partly enforced in app code now (`verifySession()` in every Server Action), not purely by the database — see `docs/MIGRATION_NOTES.md` §3. Worth double-checking every write path calls it correctly during Phase 4/5 review.
- **New (Firebase):** Rank computed client-side from a full sorted query — fine now, would need rework at large scale.
- **New (Firebase):** Search is prefix-match only (no true full-text) — Algolia flagged as a future upgrade if needed.
- PDF export approach — still needs a feasibility check for `@react-pdf/renderer` on Vercel, plus a decision on whether to route exports through Firebase Storage or stream them directly (Phase 8).
- `npm install`, `firebase deploy`, and `npm run seed` have not been run in this environment (no live Firebase project to deploy against, and Firebase CLI auth isn't available here). You'll run Phase 1's setup steps locally per `docs/SETUP.md`.
