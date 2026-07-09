# Changelog

All notable changes to this project are logged here.

---

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
