# Changelog

All notable changes to this project are logged here.

---

## [2026-07-08] — Verification pass: fixed indexes, rules, environment bugs; confirmed / /login /dashboard all work end-to-end

### Fixed
- **Missing Firestore index:** `(admin)/dashboard/page.tsx`'s "lowest score" query (`isDeleted ASC + score ASC`) had no matching composite index — only the descending variant was ever added to `firestore.indexes.json`. Added and deployed.
- **Invalid index entry:** `firestore.indexes.json` had a single-field composite index for `scoreHistory.updatedAt` — Firestore auto-manages single-field indexes; declaring one explicitly is invalid and was blocking every index deploy with a 400. Removed.
- **Dead code / lint warnings in `firestore.rules`:** the `isAdmin()` helper function was defined but never actually called anywhere (all rules use hardcoded checks) — removed, resolving the "Invalid variable name / Invalid function name" deploy warnings.
- **Root cause of repeated `EvalError: Code generation from strings disallowed for this context` crashes:** `NODE_ENV=production` was set at the process level in the dev shell, which (a) made `npm install` silently skip all devDependencies (`--omit=dev` behavior), and (b) caused the Next.js Edge middleware sandbox to fail on every fresh build. Fixed by clearing the stray env var and hardening `package.json` scripts with `cross-env` so `dev`/`build`/`start` always force the correct `NODE_ENV` regardless of what's inherited from the shell — this can't silently break again.
- **Next.js workspace-root misdetection:** an unrelated project's `package.json`/`package-lock.json` one directory up (`C:\Users\ADELAKUN OLUWATOSIN\`) was making Next.js infer the wrong monorepo root. Fixed with an explicit `outputFileTracingRoot` in `next.config.ts`.

### Added
- `scripts/verify-setup.ts` — connectivity check confirming `firebase-admin` can reach Firestore and Auth, and reports whether any admin accounts are provisioned.
- `scripts/verify-dashboard-queries.ts` — runs the exact four Firestore queries the dashboard uses, to confirm indexes are live without needing a browser session.
- `scripts/verify-auth-e2e.ts` — full auth pipeline test: mints a custom token for a real admin, exchanges it for an ID token via the Identity Toolkit REST API, posts it to `/api/auth/session` exactly like the real login page, then uses the resulting cookie to fetch `/dashboard` directly and confirm it renders. Kept as a permanent diagnostic utility, not a one-off — useful any time auth needs re-verifying without a browser.

### Verified (all confirmed working end-to-end)
- `GET /` → 200, real-time leaderboard renders, Firestore `onSnapshot` connected.
- `GET /login` → 200, form renders.
- `GET /dashboard` (no cookie) → 307 to `/login`, correct middleware behavior.
- `GET /dashboard` (valid session cookie, via `verify-auth-e2e.ts`) → 200, renders "Admin Dashboard", stat cards populated from live aggregation queries, no error overlay.
- Firestore connection confirmed (read/write both tested).
- Firebase Auth confirmed (real admin account, real sign-in, real session cookie).
- No runtime errors in dev server logs across a clean rebuild.

## [2026-07-08] — Fix: build missing page.tsx/layout.tsx files (/ and /login and /dashboard were 404ing)

### Backed up
- Pre-fix state backed up to `backups/20260708_090000/` (CHANGELOG.md excerpt; full prior history remains in `backups/20260707_213548/` and `backups/20260708_041644/`).

### Root cause
- `src/app/(public)`, `src/app/(admin)/login`, `src/app/(admin)/dashboard`, `src/app/(admin)/interns`, and `src/app/(admin)/reports` were all empty directories — no `page.tsx` anywhere. There was also no root `src/app/layout.tsx`. Next.js App Router 404s any route segment without a `page.tsx`, and can't render at all without a root layout. Only the API routes (`api/auth/session`, `api/scores/bulk`) had actually been built in Phase 1 — the UI layer was never started, despite PROJECT_STATUS.md correctly showing Phase 2/3/6 as still pending.

### Added
- `src/app/layout.tsx` — root layout (html/body, Bootstrap CSS import, metadata). This alone was blocking every route from rendering, not just the missing pages.
- `src/app/globals.css` — minimal custom styling on top of Bootstrap.
- `src/app/(public)/page.tsx` — working public leaderboard (Phase 2, first version): real-time via Firestore `onSnapshot`, ordered by score, rank computed client-side per docs/ARCHITECTURE.md §3, status badges, top-3 row highlighting. Search/filter/pagination not yet built (Phase 7).
- `src/app/(admin)/layout.tsx` — minimal placeholder wrapper for the admin route group. Full sidebar/top nav from docs/ARCHITECTURE.md is still Phase 6 polish, not built here.
- `src/app/(admin)/login/page.tsx` — working login page (Phase 3, first version): Firebase client SDK sign-in → POST to `/api/auth/session` → redirect to `/dashboard` on success, inline error on failure.
- `src/app/(admin)/dashboard/page.tsx` — working dashboard (Phase 6, first version): `verifySession()`-gated (redirects to `/login` if not authenticated), stat cards (total interns, average/highest/lowest score) via Firestore aggregation queries through `firebase-admin`. Charts and intern management not yet built.
- `src/components/shared/LogoutButton.tsx` — client component calling `DELETE /api/auth/session`, used on the dashboard.

### Why
- User confirmed `npm run dev` was running successfully, but `/`, `/login`, and `/dashboard` all returned 404 — the routing layer simply didn't exist yet. Built minimal-but-real working versions rather than static placeholders, since the underlying Firebase/Firestore/session infrastructure from Phase 1 was already in place and ready to be used.

### Still missing (see PROJECT_STATUS.md for full gap analysis)
- `/interns` and `/reports` pages (still empty directories)
- Intern CRUD (add/edit/soft-delete) — Phase 4
- Full sidebar/top-nav admin layout — Phase 6 polish
- Dashboard charts (performance distribution, top 10, score trends) — Phase 6
- Search/filter on public and admin views — Phase 7
- CSV/Excel/PDF export — Phase 8
- Dark mode, responsive polish pass — Phase 9

## [2026-07-08] — Refactor: remove Cloud Functions, run entirely on Firebase Spark (free) plan

### Backed up
- Pre-refactor state backed up to `backups/20260708_041644/` (functions/, docs/, firebase.json, firestore.rules, package.json, src/types, CHANGELOG.md, PROJECT_STATUS.md).

### Archived (not deleted)
- `functions/` (Cloud Functions subproject: `package.json`, `tsconfig.json`, `src/index.ts`) → `archive/cloud-functions-implementation/`

### Added
- `docs/SPARK_PLAN_REFACTOR.md` — full explanation of what changed, why, and the trade-off introduced (score-history logging is now an app-code convention rather than a platform-enforced guarantee).
- `src/lib/actions/scores.ts` — `updateInternScore()` and `bulkUpdateScores()`. Replaces the Cloud Function: runs a Firestore transaction that atomically updates `interns.score` and writes the matching `scoreHistory` entry. This is now the ONLY code path allowed to change a score.
- `src/app/api/scores/bulk/route.ts` — implemented (was previously just a planned folder). Thin Route Handler wrapping `bulkUpdateScores()`.

### Changed
- `firebase.json` — removed the `functions` block and the Functions emulator entirely.
- `docs/ARCHITECTURE.md` (now v3) — tech stack table, folder structure, data design, score update flow, Phase 1 status, and risks section all updated to remove every Cloud Function reference and describe the Server Action transaction approach instead.
- `docs/SETUP.md` — rewritten: no Blaze plan step, no `functions/` install step, deploy step is now `firebase deploy --only firestore:rules,firestore:indexes` only.
- `docs/MIGRATION_NOTES.md` §2 — added a forward-pointer note to `SPARK_PLAN_REFACTOR.md` without rewriting the original historical reasoning.
- `src/types/firestore.ts` — removed the transient `lastUpdatedBy` field from `InternDoc` (existed only for the old Cloud Function to read; no longer needed since the transaction already has the admin's UID in scope).
- `package.json` — version bumped to 0.3.0; no functional dependency changes needed (firebase-admin was already required for Server Actions, independent of Cloud Functions).

### Why
- No billing account available — Cloud Functions require the Blaze plan even at near-zero usage. The entire project must run on Firebase's free Spark plan: no Cloud Functions, no billing, no paid features, no deploy step requiring Functions.

### Risk noted
- The audit trail's completeness now depends on every score-changing code path going through `lib/actions/scores.ts`. Documented clearly in `SPARK_PLAN_REFACTOR.md` and in code comments at the top of that file — flagging here too since it's a real trade-off worth remembering as the project grows.

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
