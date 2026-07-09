# Changelog

All notable changes to this project are logged here.

---

## [2026-07-07] — Migration: Supabase (PostgreSQL) → Firebase (Auth + Firestore + Storage)

### Backed up
- Full pre-migration project state backed up to `backups/20260707_213548/` before any changes were made, per project rules.

### Archived (not deleted)
- `supabase/` (all migrations + seed.sql) → `archive/supabase-implementation/supabase/`
- `src/lib/supabase/` (client.ts, server.ts, middleware.ts) → `archive/supabase-implementation/supabase/`
- old `src/middleware.ts` → `archive/supabase-implementation/middleware.ts.old`
- old `src/types/database.ts` → `archive/supabase-implementation/database.ts.old`

### Added
- `docs/MIGRATION_NOTES.md` — full review of every feature requiring redesign moving from Postgres/RLS to Firestore (ranking, score-history trigger → Cloud Function, RLS → Security Rules + hybrid app-code auth, session handling, full-text search, aggregates, pagination, referential integrity).
- `firestore.rules` — replaces the old RLS policies. Public read-only on active interns, no client writes anywhere (writes go through `firebase-admin` server-side), `scoreHistory` fully locked to server-side access only.
- `firestore.indexes.json` — composite indexes for department+score queries, name-prefix search, and scoreHistory lookups.
- `firebase.json` — wires Firestore rules/indexes and the Cloud Functions codebase together; includes emulator config for local dev.
- `functions/` — new Cloud Functions subproject. `functions/src/index.ts` contains `logScoreChange`, an `onDocumentUpdated` trigger on `interns/{internId}` that auto-writes to `scoreHistory` whenever `score` changes — direct replacement for the old Postgres trigger, same "can't be bypassed by app code" guarantee.
- `src/lib/firebase/client.ts` — Firebase client SDK init (browser-only: Auth, Firestore, Storage).
- `src/lib/firebase/admin.ts` — `firebase-admin` init for server-only code (Server Actions/Route Handlers). Explicitly documented that it bypasses Security Rules.
- `src/lib/firebase/session.ts` — session cookie creation (`createSessionCookie`) and verification (`verifySession`) — this is the real authorization boundary now, not middleware.
- `src/app/api/auth/session/route.ts` — `POST` mints the session cookie after client-side sign-in and an admin-doc check; `DELETE` clears it on logout.
- `src/types/firestore.ts` — replaces `types/database.ts`. Firestore document shapes for `admins`, `interns`, `scoreHistory`, plus the client-computed `LeaderboardEntry` shape and a shared `computeStatus()` helper.
- `scripts/seed.ts` — Node/Admin-SDK seed script replacing `seed.sql` (Firestore has no SQL to seed with). Idempotent — skips interns that already exist by email.

### Changed
- `docs/ARCHITECTURE.md` — rewritten (v2) for the Firebase stack: tech stack table, folder structure, Firestore data design (replaces the relational DB Design section), Security Rules summary, rewritten auth flow, rewritten score-update flow, real-time strategy, reports/storage approach, and an updated phase table reflecting Firebase-specific work.
- `src/middleware.ts` — rewritten. Now only checks whether the `__session` cookie is *present* (Edge runtime can't run `firebase-admin`). Explicitly documented as a UX-only check, not the security boundary — real verification happens via `verifySession()` in server-side code.
- `package.json` — swapped `@supabase/supabase-js` / `@supabase/ssr` for `firebase` (client SDK) and `firebase-admin`; added `server-only`, `tsx`, `dotenv` for the seed script.
- `.env.example` — rewritten for Firebase client config + Admin SDK service account credentials.

### Why
- Direction change requested: Firebase Authentication + Firestore + Firebase Storage, keeping Next.js 15 / TypeScript / Bootstrap 5 / Vercel. Full redesign rationale is in `docs/MIGRATION_NOTES.md` rather than repeated here.

### Risks noted (see docs/MIGRATION_NOTES.md and updated docs/ARCHITECTURE.md §10 for full detail)
- Cloud Functions require the Blaze (pay-as-you-go) plan — new requirement vs. Supabase's free tier.
- Authorization for admin writes is now partly enforced in application code (Server Actions calling `verifySession()`), since `firebase-admin` bypasses Security Rules. This is a meaningful shift from "the database enforces it" to "the app must enforce it correctly."
- Rank is computed client-side from a full sorted query; fine at current scale, would need rework if the intern list grows into the thousands.
- Full-text search is prefix-only for now; true full-text would need a future Algolia integration.

## [2026-07-07] — Phase 1: Supabase schema + Next.js scaffold

### Added
- `supabase/migrations/0001_init_schema.sql` — `admins`, `interns`, `score_history` tables; indexes; `updated_at` trigger; `log_score_change()` trigger that auto-writes to `score_history` on every score change; `public.leaderboard` view with on-read rank computation.
- `supabase/migrations/0002_rls_policies.sql` — Row Level Security: public read on active interns, admin-only writes, admin-only read on score_history and own admin record.
- `supabase/seed.sql` — 10 sample interns across 4 departments for local dev/testing.
- Next.js 15 project scaffold: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitignore`.
- `src/types/database.ts` — hand-written types matching the schema (placeholder until `supabase gen types` is run against the live project).
- `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` — Supabase client wiring for Client Components, Server Components/Actions, and session-refresh middleware.
- `src/middleware.ts` — route protection for `/dashboard`, `/interns`, `/reports`, `/settings`.
- `docs/SETUP.md` — full setup walkthrough including how to provision the first admin account (admin accounts are manually provisioned, not self-service, by design).
- Full folder structure per `docs/ARCHITECTURE.md` (app router route groups, components, lib, api routes — folders created, pages not yet built).

### Why
- Kicking off Phase 1 per the approved architecture plan. Decisions locked in this phase: rankings computed on the fly (no snapshot table), toast-only notifications, single admin role (no super_admin), CSV/Excel/PDF export all in scope.

### Notes
- No npm install / supabase CLI commands were actually run in this environment (no network access to Supabase or an existing project to link to) — these are ready-to-run files for you to execute locally per `docs/SETUP.md`.

## [2026-07-07]

### Added
- Initial project scaffolding: `/docs`, `/backups` folders created.
- `docs/ARCHITECTURE.md` — full architecture plan covering tech stack decisions, folder structure, database design (admins/interns/score_history), auth flow, real-time strategy, score update flow, reporting approach, and phased build timeline.
- `CHANGELOG.md` and `PROJECT_STATUS.md` created to track project history going forward.

### Why
- Starting build of the Intern Scoreboard & Leaderboard Management System (internship deliverable + portfolio piece) from the provided project spec PDF.
