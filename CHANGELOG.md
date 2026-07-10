# Changelog

All notable changes to this project are logged here.

---

## [2026-07-10] — Phase 6: Storage rules, error pages, dashboard charts

### Added
- **`storage.rules`** — deny-all default. Firebase Storage was enabled on the project since setup but had no rules deployed, meaning it was live and unguarded; this closes that gap even though nothing in the app writes to Storage yet (Phase 8 will be the first). Wired into `firebase.json`. Commented guidance included for the admin-gated pattern to follow once Phase 8 needs it.
- **`src/app/error.tsx`** — styled to match the existing card/design-token system, "Try again" (`reset()`) and a link to the dashboard. Replaces Next's generic error screen.
- **`src/app/not-found.tsx`** — same visual treatment, links to the leaderboard and dashboard. Replaces Next's generic 404 screen. Confirmed via live test: custom page renders, not the generic "This page could not be found."
- **Dashboard charts** (`components/dashboard/TopPerformersChart.tsx`, `ScoreDistributionChart.tsx`) — Recharts, wrapped in `ResponsiveContainer` for mobile. Top Performers: horizontal bar, top 5 by score. Score Distribution: bar chart of counts per status band, reusing the same `computeStatus()` bands used everywhere else in the app.
- `scripts/verify-phase6-dashboard.ts` — confirms the dashboard renders both charts against a real session, no error overlay.

### Changed
- **`(admin)/dashboard/page.tsx` — replaced 4 separate Firestore aggregate queries with a single document fetch.** The previous version ran `count()`, `average()`, `orderBy desc limit 1`, and `orderBy asc limit 1` as four separate queries. Since the new charts need per-document data regardless, the page now does one `orderBy("score", "desc")` fetch of active interns and derives total/average/highest/lowest **and** both charts' data from that single result set in JS. Net effect: same stat cards, two new charts, fewer round trips — not more reads for the new features, per the "no unnecessary reads" requirement.
- `docs/SETUP.md` step 8 — deploy command now includes `storage`: `firebase deploy --only firestore:rules,firestore:indexes,storage`.

### Verified
- `npx tsc --noEmit` — zero errors.
- `npm run build` — passes completely, 13 routes (now including a real `/_not-found`), zero errors.
- Custom 404 page confirmed live (not Next's generic "This page could not be found").
- Dashboard confirmed rendering both charts against a real authenticated session, no error overlay.
- No new Firestore indexes required — the dashboard's single query uses the same `isDeleted ASC + score DESC` composite index already deployed for the leaderboard.

---

## [2026-07-09] — Phase 5 complete: Score Management, verified end-to-end

### Context
- Phase 4 (Intern CRUD) was completed, verified, committed, and tagged `v0.4` in a prior session. Phase 5 work began, was interrupted mid-implementation by a Desktop Commander disconnect, and was captured in a `WIP: Phase 5 score management` commit. This entry covers finishing that work from the existing filesystem state — nothing was recreated from scratch.

### Added
- **`(admin)/scores` page** — dedicated Score Management page, separate from the Interns CRUD page per the spec's "update scores without editing the entire intern record" requirement. Includes:
  - Quick-adjust buttons (−5/−1/+1/+5) per intern, calling the existing `PATCH /api/interns/[id]` score-only path.
  - A direct-set numeric input per intern (on blur) for exact-value changes.
  - A bulk-update panel: multi-select interns via checkboxes, apply either a delta (add/subtract N) or set-to-value across the selection, via the existing `POST /api/scores/bulk` endpoint.
  - A "Recent Score Changes" side panel showing the last 15 changes with intern name, old→new score, delta badge, and relative time.
- **`internName` denormalized onto `scoreHistory`** (`lib/actions/scores.ts`, `types/firestore.ts`) — written inside the same transaction that already reads the intern doc, so displaying history never needs a per-row intern lookup (no N+1 reads).
- **`getRecentScoreHistory()`** (`lib/actions/scores.ts`) + **`GET /api/scores/history?limit=N`** — admin-only, session-gated, powers the Recent Changes panel.
- **`lib/utils/time.ts`** — small `timeAgo()` relative-time helper for the history panel.
- `/scores` added to `middleware.ts`'s protected-route matcher, and to both `AdminSidebar` and `MobileTopBar` nav lists. Dashboard "Quick actions" card links to it too.
- **Diagnostic scripts** (kept as permanent utilities, same pattern as earlier phases): `scripts/verify-phase5.ts` (full end-to-end: session → `/scores` page → single adjust → confirms `scoreHistory` row written with correct `internName`/`updatedBy` → confirms `/api/scores/history` surfaces it → bulk update → revert) and `scripts/verify-nav-links.ts` (confirms sidebar nav hrefs render on all three admin pages with a real session).

### Fixed (found during this pass, not new regressions)
- **Bug:** `updateIntern()` in `lib/actions/interns.ts` didn't check email uniqueness on *edit* (only `createIntern()` did) — an admin could rename one intern's email to collide with another's, silently. Added the same duplicate check to the update path.
- **TypeScript strict-mode errors blocking `npm run build`:** several `noUncheckedIndexedAccess` violations from array-index access without a guard (`docs[0].data()` after only checking `.empty`, and `cookie.split(";")[0]` typed as possibly `undefined`) — fixed in `(admin)/dashboard/page.tsx`, `lib/actions/interns.ts`, `scripts/verify-auth-e2e.ts`, and `scripts/verify-dashboard-queries.ts`.
- **`tsconfig.json`** now excludes `archive/` and `backups/` — those folders intentionally reference removed dependencies (Supabase, Cloud Functions) and were never meant to be type-checked; they were only ever noise in `tsc`/build output, not real errors.
- Stray formatting/indentation artifact in `scripts/verify-auth-e2e.ts` left over from the interrupted session, cleaned up.
- **Build reliability:** `src/app/layout.tsx` was using `next/font/google` (Inter), which requires build-time network access to Google's font CDN — a fragile dependency that caused `npm run build` to hang/fail on a transient network timeout during this verification pass. Replaced with a system font stack (`-apple-system, Segoe UI, Roboto...`, the same fallback chain Vercel/Linear/GitHub use) in `globals.css`. Zero external dependency now, same visual result.

### Verified (all via live testing against a real session, not just code review)
- `npm run build` — passes completely, all 14 routes compile, zero TypeScript errors.
- `GET /scores` (no cookie) → 307 to `/login`; (valid session) → 200, renders "Score Management".
- `PATCH /api/interns/[id]` with a `score` field → correctly updates the intern doc AND writes a `scoreHistory` row in the same call, confirmed by direct Firestore reads before/after.
- The written `scoreHistory` row has the correct denormalized `internName` and a real admin `updatedBy` UID.
- `GET /api/scores/history` → 200, returns the just-written entry as the most recent.
- `POST /api/scores/bulk` → 200, correctly updates and reverts a test score.
- Sidebar/mobile nav `href="/scores"`, `/interns`, `/reports`, `/dashboard` all confirmed present on `/scores`, `/dashboard`, and `/interns` pages with a live session.
- **No new Firestore composite indexes required** — confirmed live: `scoreHistory` queries used here are a single-field equality filter (`internId ==`, auto-indexed) and a single-field `orderBy` with no `where` clause (auto-indexed). Zero `FAILED_PRECONDITION` errors during any test run.
- Dev server logs across the full verification run: zero 500s, zero stack traces — every response was 200/307/400 (the one 400 was a deliberately-invalid test case correctly rejected by validation).

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
