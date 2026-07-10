# Project Status — Intern Scoreboard & Leaderboard Management System

_Last updated: 2026-07-10_

## ✅ Completed

- **Phase 1** — Firebase project setup (Spark plan, no billing), Firestore schema/rules/indexes, `lib/actions/scores.ts` (score updates + audit logging via transactions, no Cloud Functions), session cookie auth (`lib/firebase/{client,admin,session}.ts`), seed script.
- **Phase 2** — Public leaderboard (`/`): real-time via `onSnapshot`, top-3 podium + polished table, status badges, rank computed client-side.
- **Phase 3** — Admin auth: login page, session cookie mint/verify/clear, middleware route protection.
- **Phase 4** — Intern CRUD, complete and verified: listing page (`/interns`), add/edit modal, soft-delete with confirm modal, server-side validation (Zod), email-uniqueness enforced on both create *and* edit. **Committed and tagged `v0.4`.**
- **UI redesign** (done alongside Phase 4, per request): design tokens + system font stack in `globals.css`/`layout.tsx`, `AdminSidebar` + `MobileTopBar` (real nav chrome, not bare pages), reusable `Modal`/`StatusBadge`/`EmptyState`/`Spinner`/`StatCard` components, redesigned login/dashboard/leaderboard pages.
- **Phase 5** — Score Management, complete and verified end-to-end: dedicated `/scores` page (quick-adjust buttons, direct-set input, bulk update panel, Recent Score Changes panel), `internName` denormalized onto `scoreHistory` for cheap history display, `GET /api/scores/history`. **Committed and tagged `v0.5`.**
- **Phase 6** — Storage rules, error pages, dashboard charts: `storage.rules` (deny-all default, closes a real gap where Storage was live and unguarded), `error.tsx`/`not-found.tsx` (styled, replace Next's generic screens), Top Performers + Score Distribution charts on the dashboard (Recharts, mobile-responsive), dashboard rebuilt to use a single Firestore query instead of 4 separate aggregate queries. Full detail in `CHANGELOG.md` [2026-07-10].
- Full history preserved: pre-migration/pre-refactor backups, archived Supabase and Cloud Functions implementations — nothing deleted, per project rules.
- `docs/MIGRATION_NOTES.md` (Postgres → Firestore) and `docs/SPARK_PLAN_REFACTOR.md` (Cloud Functions → Server Actions) — full redesign rationale for both major pivots.

## 🔨 In Progress
- Nothing actively in progress. Phase 6 implemented and build-verified; not yet committed (per instruction — awaiting review). Ready for Phase 10 (deploy) or Phase 7 (search/filter) next per the recommended order in the last full audit.

## 📋 Pending
- [x] Phase 1: Firebase project setup (Spark plan), rules/indexes, score Server Actions, seed data
- [x] Phase 2: Public leaderboard — search/department filter/pagination still not built (that's Phase 7 scope)
- [x] Phase 3: Admin auth
- [x] Phase 4: Intern CRUD — **verified, tagged v0.4**
- [x] Phase 5: Score Management — **verified end-to-end, tagged v0.5**
- [x] Phase 6: Storage rules, error pages, dashboard charts — **implemented, build-verified, not yet committed**
- [ ] Phase 7: Search/filter (public + admin)
- [ ] Phase 8: Reports (CSV/Excel/PDF export) — `(admin)/reports` is still a stub page, `api/reports` not implemented
- [ ] Phase 9: Further polish — dark mode (bonus), animation pass
- [ ] Phase 10: Deploy to Vercel, env vars, final QA — **not started, still local-only.** Recommended to do this before Phases 7–9 (see last full audit) — nothing has run outside `localhost` yet.

## ⚠️ Known Issues / Risks (top 10 from the pre-Phase-5 audit — updated for what Phase 6 resolved)
1. ~~No Cloud Storage security rules deployed~~ — **Fixed 2026-07-10:** `storage.rules` (deny-all default) added, not yet deployed to the live project (deploy step is manual, see `docs/SETUP.md` step 8).
2. **No production deployment yet** — Phase 10 not started, no Vercel env vars set, no live URL. Still the single biggest remaining gap.
3. No rate limiting / App Check on `/api/auth/session`.
4. `listInterns()` has no pagination — fetches the whole collection every load. Fine now, will cost more reads as it grows. (Dashboard's own read pattern was optimized in Phase 6, but `/interns` and `/scores` still use the unpaginated `listInterns()`.)
5. ~~No `error.tsx` / `not-found.tsx`~~ — **Fixed 2026-07-10.**
6. Zero automated tests anywhere in the project.
7. State-changing routes rely on `SameSite=Lax` only, no explicit CSRF token.
8. Score validation duplicated between `validators/intern.ts` and `lib/actions/scores.ts` — still true, low priority.
9. No in-app admin management UI — fine for single-admin, a gap the moment there's a second admin.
10. ~~`updateIntern()` missing email-uniqueness check on edit~~ — Fixed 2026-07-09.

## Resolved from earlier phases
- ~~Weekly/Monthly Rankings~~ / ~~Notifications~~ / ~~Admin roles~~ / ~~Blaze plan requirement~~ — all resolved, see earlier CHANGELOG entries.
- Rank computed client-side from a full sorted query — fine at current scale, documented trade-off.
- Search is prefix-match only — Algolia flagged as a future upgrade if ever needed.
- Score-history logging is an app-code convention (`lib/actions/scores.ts` is the only writer), not a platform-enforced guarantee — documented in `docs/SPARK_PLAN_REFACTOR.md`.
