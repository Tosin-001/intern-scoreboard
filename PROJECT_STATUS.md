# Project Status — Intern Scoreboard & Leaderboard Management System

_Last updated: 2026-07-11_

## ✅ Completed

- **Phases 1–5** — Firebase (Spark plan) backend, real-time public leaderboard, admin auth, full intern CRUD, Score Management with audit trail. Tagged `v0.4`, `v0.5`.
- **UI redesign** — design tokens, system font stack, sidebar/mobile nav, reusable component library (`Modal`, `StatusBadge`, `EmptyState`, `Spinner`, `StatCard`).
- **Phase 6** — `storage.rules` (deny-all, written and ready — not yet deployed; Storage isn't actually initialized on the Firebase project yet), `error.tsx`/`not-found.tsx`, dashboard Top Performers + Score Distribution charts (Recharts), dashboard rebuilt to use 1 Firestore query instead of 4. **Committed and tagged `v0.6`.**
- **Phase 10 (moved up ahead of schedule)** — **deployed to Vercel.** Admin login, dashboard, Firestore reads/writes, intern CRUD, score updates, and the public leaderboard all confirmed working in production. Vercel Analytics installed.
- **Phase 7** — search + department filter on the public leaderboard, Top 10 toggle, department filter added to `(admin)/interns` alongside the existing search. All client-side, zero new Firestore reads. **Committed and pushed (`312ef51`), confirmed live in production.**
- **Phase 8** — CSV export: single "Export Interns" card with search + department filter + Top 10 toggle + row selection + "Export CSV" (all filtered) / "Export Selected CSV". No PDF/Excel, no new API routes. Exports Rank/Name/Email/Department/Score/Status. **Committed and pushed (`e5d35ee`, `61d071f`).**
- **Mobile responsiveness (2 audit passes) + sidebar icons** — round 1 fixed a confirmed bulk-toolbar overflow bug plus added global `overflow-x:hidden` hardening; deployed, tested on a real phone, still found real issues. Round 2 went structural: Scores and Interns tables now switch to mobile card views below `md` (44px+ touch targets, no more cramped `btn-sm` groups in a scrolling table), Reports table hides secondary columns on mobile, all filter bars fully stack below `sm`. Sidebar emoji replaced with 5 hand-written SVG icons (no new dependency). **Round 1 committed and pushed (`d925558`). Round 2 implemented and build-verified — not yet committed** (per instruction, awaiting review — recommend a real-device check before merging).
- Full history preserved throughout: pre-migration/pre-refactor backups, archived Supabase and Cloud Functions implementations — nothing deleted, per project rules.

## 🔨 In Progress
- Mobile audit round 2: implemented, `tsc`/build verified, awaiting your review + a real-device check before commit.

## 📋 Pending
- [x] Phase 1–5: see CHANGELOG for full detail
- [x] Phase 6: Storage rules (written, deploy pending Storage init), error pages, dashboard charts — tagged `v0.6`
- [x] Phase 10 (moved up): Deployed to Vercel, verified working in production
- [x] Phase 7: Search/filter — committed, pushed, confirmed live
- [x] Phase 8: CSV export — committed, pushed
- [x] Mobile responsiveness round 1 + sidebar icons — committed, pushed (`d925558`)
- [x] Mobile responsiveness round 2 (structural card views) — implemented, build-verified, **not yet committed**
- [ ] Phase 9: Further polish — dark mode (bonus), animation pass, error monitoring (Sentry or equivalent), PDF export (deferred from Phase 8, could land here if wanted)

## ⚠️ Known Issues / Risks

### Accepted risk (owner-acknowledged, not fixed by choice)
- **A real Firebase Admin SDK private key was committed to `.env.example` in commit `3d88c99` (Phase 4) and was live in this public repository until it was replaced with placeholders in commit `0b89db9`.** The current branch and `.env.example` are clean. **The key itself has not been rotated** — confirmed directly with the project owner on 2026-07-10, who has chosen to keep the current key in use for now, understanding the risk that anyone who viewed the repo during the exposure window (including automated secret-scanners, which routinely index public GitHub repos within minutes) may still hold a working copy of it. This key grants full administrative access to Firestore, Auth, and Storage, bypassing all Security Rules. **Recorded here as a deliberate, informed decision — not an oversight.** Revisit if there's ever a reason to believe the key has been misused (unexpected Firestore writes, unfamiliar Auth users, billing alerts if the project is ever upgraded off Spark).

### Other open items
1. `storage.rules` written but not deployed — Storage still isn't initialized on the project, and Phase 8 ended up not needing it (CSV export is fully client-side). No urgency; deploy whenever something first needs Storage.
2. No rate limiting / App Check on `/api/auth/session`.
3. `listInterns()` has no pagination — fetches the whole collection every load. Fine at current scale (2 interns).
4. Zero automated tests anywhere in the project.
5. State-changing routes rely on `SameSite=Lax` only, no explicit CSRF token.
6. Score validation duplicated between `validators/intern.ts` and `lib/actions/scores.ts` — low priority.
7. No in-app admin management UI — fine for single-admin.
8. No error monitoring in production (Vercel Analytics tracks pageviews, not exceptions) — `error.tsx` only logs to console.
9. No CI pipeline — nothing catches a broken build before `main` except running it locally.

## Resolved
- ~~Weekly/Monthly Rankings~~ / ~~Notifications~~ / ~~Admin roles~~ / ~~Blaze plan requirement~~ / ~~No `error.tsx`/`not-found.tsx`~~ / ~~`updateIntern()` missing email-uniqueness check~~ — see CHANGELOG for each.
- Rank computed client-side from a full sorted query — documented trade-off, fine at current scale.
- Score-history logging is an app-code convention (`lib/actions/scores.ts` is the only writer), not a platform-enforced guarantee — documented in `docs/SPARK_PLAN_REFACTOR.md`.
