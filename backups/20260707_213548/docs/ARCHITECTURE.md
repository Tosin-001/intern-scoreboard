# Intern Scoreboard & Leaderboard Management System — Architecture Plan

**Status:** Draft v1
**Owner:** Teeblak (Adelakun Olayemi Oluwatosin)
**Purpose:** Internship deliverable + portfolio piece
**Stack:** Next.js 15 (App Router) · TypeScript · Bootstrap 5 · Supabase (PostgreSQL + Auth + Realtime) · Vercel

---

## 1. Tech Stack Decisions

| Layer | Choice | Reasoning |

| Frontend framework | Next.js 15, App Router | Spec requirement; Server Components cut client JS for the public leaderboard |
| Styling | Bootstrap 5 (+ small custom CSS layer) | Spec requirement; fast to theme for SaaS look (Vercel/Supabase/Linear inspired) |
| Language | TypeScript | Spec requirement; catches schema/prop mismatches early |
| Database | Supabase PostgreSQL | Spec allows this as the alt option — going with it because Auth + Realtime + DB come in one project, which matches your existing VerifyNG stack knowledge |
| Auth | Supabase Auth | Simpler than wiring NextAuth + a separate DB; row-level security (RLS) gives you admin-only writes for free |
| Real-time | Supabase Realtime (Postgres changes) | Leaderboard subscribes to `interns` table changes — no polling needed |
| Charts | Recharts | Lightweight, works cleanly in React Server/Client Component split |
| PDF export | `@react-pdf/renderer` (generated in an API route) | Works on Vercel serverless without headless Chrome overhead |
| Excel/CSV export | `xlsx` (SheetJS) for Excel, native CSV string builder for CSV | No server dependency needed, can run client-side |
| Deployment | Vercel | Spec requirement |

---

## 2. Folder Structure

intern-scoreboard/
├── docs/
│   ├── ARCHITECTURE.md          (this file)
│   ├── SETUP.md                 (env vars, local dev instructions)
│   ├── API.md                   (server action / API route reference)
│   └── DEV_LOG.md               (running log of build sessions)
├── backups/                     (timestamped file backups before edits)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                 → public leaderboard
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx       → stats cards + charts
│   │   │   ├── interns/page.tsx         → CRUD table
│   │   │   ├── interns/[id]/page.tsx    → edit intern
│   │   │   ├── reports/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── layout.tsx               → sidebar + top nav, auth-gated
│   │   └── api/
│   │       ├── interns/route.ts         → GET/POST
│   │       ├── interns/[id]/route.ts    → PATCH/DELETE
│   │       ├── scores/bulk/route.ts     → POST bulk score update
│   │       └── reports/[format]/route.ts→ export endpoint
│   ├── components/
│   │   ├── leaderboard/
│   │   ├── dashboard/
│   │   ├── interns/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                → browser client
│   │   │   ├── server.ts                → server client (RSC/actions)
│   │   │   └── middleware.ts            → session refresh
│   │   ├── actions/                     → Server Actions (add/edit/delete intern, update score)
│   │   ├── validators/                  → Zod schemas
│   │   └── utils/
│   ├── types/
│   │   └── database.ts                  → generated Supabase types
│   └── middleware.ts                    → route protection for (admin)/*
├── CHANGELOG.md
├── PROJECT_STATUS.md
└── .env.local (gitignored)

```
---
## 3. Database Design

### `admins` table
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | matches `auth.users.id` |
| email | text, unique | |
| role | text | `super_admin` \| `admin` (for bonus: admin roles) |
| created_at | timestamptz | default now() |

> Password handling is delegated to Supabase Auth — no `password_hash` column needed on our side (spec's suggestion of storing it directly is outdated once Supabase Auth is in play).

### `interns`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default gen_random_uuid() |
| full_name | text | |
| email | text, unique | |
| department | text | |
| score | integer | default 0 |
| status | text (generated or computed) | Excellent/Good/Average/Poor bands, computed from score at query time |
| is_deleted | boolean | default false — soft delete |
| deleted_at | timestamptz, nullable | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `score_history`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| intern_id | uuid, FK → interns.id | |
| old_score | integer | |
| new_score | integer | |
| updated_by | uuid, FK → admins.id | |
| updated_at | timestamptz | default now() |

**Indexes:** `interns(score DESC)` for fast ranking, `interns(department)` for filter, `score_history(intern_id)`.

**Ranking logic:** rank is *not stored* — it's computed at query time via `ROW_NUMBER() OVER (ORDER BY score DESC)` on non-deleted interns. This guarantees ranks are always correct with zero risk of drift, at the cost of a cheap window function on read.

**RLS policies:**
- `interns` SELECT: public (anon) allowed, only `is_deleted = false` rows visible to anon.
- `interns` INSERT/UPDATE/DELETE: `auth.uid()` must exist in `admins`.
- `score_history`: SELECT/INSERT admin-only.

---

## 4. Auth Flow

1. Admin hits `/login` → Supabase Auth `signInWithPassword`.
2. On success, Supabase sets an httpOnly session cookie.
3. `middleware.ts` checks session on every `(admin)/*` route; redirects to `/login` if absent.
4. Server Components/Actions use `lib/supabase/server.ts` to read the session server-side (never trust client-only checks).
5. Logout clears the Supabase session and redirects to `/login`.

---

## 5. Real-Time Strategy

- Public leaderboard page mounts a Supabase Realtime channel subscribed to `postgres_changes` on `interns` (INSERT/UPDATE/DELETE).
- On event, the client re-fetches (or optimistically patches) the ranked list — no polling interval needed.
- Admin dashboard stat cards can subscribe the same way, or simply refetch on route focus — lower priority than the public leaderboard.

---

## 6. Score Update Flow (core business logic)

1. Admin edits a score (single or bulk) via a Server Action.
2. Action runs inside a Postgres transaction:
   - Reads current score
   - Updates `interns.score`
   - Inserts a row into `score_history` (old_score, new_score, updated_by)
3. Realtime broadcasts the `interns` UPDATE automatically — leaderboard re-ranks itself, no separate "recalculate ranks" step needed since rank is computed, not stored.

---

## 7. Reports/Export

- **CSV:** build client-side from the currently filtered dataset — no server round trip needed.
- **Excel:** `xlsx` library, client-side, same data source as CSV.
- **PDF:** routed through `/api/reports/pdf` — server renders a styled table via `@react-pdf/renderer` and streams the file back.

---

## 8. Build Phases (suggested order)

| Phase | Scope | Est. time |
|---|---|---|
| 1 | Supabase project setup, schema + RLS, seed data | 0.5–1 day |
| 2 | Public leaderboard (static first, then realtime) | 1–2 days |
| 3 | Admin auth (login, middleware, protected layout) | 1 day |
| 4 | Intern CRUD (add/edit/soft-delete) | 1–2 days |
| 5 | Score management + score_history + bulk update | 1 day |
| 6 | Dashboard stats + charts | 1–2 days |
| 7 | Search/filter (public + admin) | 1 day |
| 8 | Reports (CSV/Excel/PDF export) | 1 day |
| 9 | Polish: responsive pass, top-3 styling, dark mode (bonus) | 1–2 days |
| 10 | Deploy to Vercel, env vars, final QA | 0.5 day |

**Total: roughly 10–14 working days** for the full spec including most bonus features, done at a portfolio-quality bar rather than rushed.

---

## 9. Risks / Open Questions

- **"Weekly/Monthly Rankings" (bonus)** — needs a decision: snapshot-based (cron job storing periodic rank snapshots) or computed on the fly from `score_history` timestamps. Recommend snapshot table if you want this — flag if you want it in scope.
- **Notifications (bonus)** — in-app toast vs. persisted notification table. Needs scoping before Phase 9.
- **PDF export on Vercel** — confirm `@react-pdf/renderer` works within Vercel's serverless function size/time limits before committing; fallback is a client-side `jsPDF` approach if needed.
- **Multi-admin roles** — spec only shows one `role` field; needs a decision on what `admin` vs `super_admin` can actually do differently (e.g., can regular admins delete interns?).

---

*This document should be updated as decisions are made. Log changes in `CHANGELOG.md`.*
