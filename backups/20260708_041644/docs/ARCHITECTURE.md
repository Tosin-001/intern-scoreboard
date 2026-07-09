# Intern Scoreboard & Leaderboard Management System — Architecture Plan (v2, Firebase)

**Status:** Active — supersedes the original Supabase-based plan
**Owner:** Teeblak (Adelakun Olayemi Oluwatosin)
**Purpose:** Internship deliverable + portfolio piece
**Stack:** Next.js 15 (App Router) · TypeScript · Bootstrap 5 · Firebase (Auth + Firestore + Storage) · Vercel

> See `docs/MIGRATION_NOTES.md` for the full reasoning behind every change from the original Postgres/Supabase design.

---

## 1. Tech Stack Decisions

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend framework | Next.js 15, App Router | unchanged |
| Styling | Bootstrap 5 | unchanged |
| Language | TypeScript | unchanged |
| Database | **Firestore** (NoSQL document store) | per this request |
| Auth | **Firebase Authentication** (email/password) | per this request |
| File storage | **Firebase Storage** | per this request; used for PDF report exports and future profile photos |
| Server-side auth/DB access | `firebase-admin` (Node.js Admin SDK) | used in Server Actions/Route Handlers; bypasses Security Rules, so app code owns authorization on the write path (see Migration Notes §3) |
| Business-logic automation | Firebase Cloud Functions | replaces the old Postgres trigger for score-history logging |
| Charts | Recharts | unchanged |
| PDF export | `@react-pdf/renderer`, output optionally stored in Firebase Storage | unchanged approach, new storage backend |
| Excel/CSV export | `xlsx` (client-side) | unchanged |
| Deployment | Vercel | unchanged |

---

## 2. Folder Structure (changes from v1 in **bold**)

```
intern-scoreboard/
├── docs/
│   ├── ARCHITECTURE.md          (this file)
│   ├── MIGRATION_NOTES.md       (**new** — Postgres → Firestore redesign log)
│   ├── SETUP.md                 (rewritten for Firebase)
│   ├── API.md
│   └── DEV_LOG.md
├── archive/
│   └── supabase-implementation/ (**new** — old Supabase code, preserved not deleted)
├── backups/                     (timestamped backups, per project rules)
├── functions/                    (**new** — Firebase Cloud Functions, own package.json)
│   └── src/
│       └── index.ts             (score-history auto-log trigger)
├── firestore.rules               (**new** — replaces RLS policies)
├── firestore.indexes.json        (**new** — composite index definitions)
├── src/
│   ├── app/
│   │   ├── (public)/page.tsx
│   │   ├── (admin)/{login,dashboard,interns,reports,settings}/...
│   │   └── api/
│   │       ├── auth/session/route.ts   (**new** — mints/clears Firebase session cookie)
│   │       ├── interns/route.ts
│   │       ├── scores/bulk/route.ts
│   │       └── reports/[format]/route.ts
│   ├── components/{leaderboard,dashboard,interns,shared}/
│   ├── lib/
│   │   ├── firebase/            (**new**, replaces lib/supabase/)
│   │   │   ├── client.ts        (Firebase client SDK init, browser-only)
│   │   │   ├── admin.ts         (firebase-admin init, server-only)
│   │   │   └── session.ts       (session cookie create/verify helpers)
│   │   ├── actions/
│   │   ├── validators/
│   │   └── utils/
│   ├── types/
│   │   └── firestore.ts         (**replaces** types/database.ts)
│   └── middleware.ts             (**rewritten** — cookie-presence check only, see Migration Notes §4)
├── CHANGELOG.md
├── PROJECT_STATUS.md
└── .env.example                  (**rewritten** for Firebase config)
```

---

## 3. Firestore Data Design

Firestore is schemaless — the shapes below are enforced by `firestore.rules` + TypeScript types, not a DB schema.

### Collection: `admins/{uid}`
Document ID **is** the Firebase Auth UID (1:1, mirrors the old `admins.id = auth.users.id` design).

| Field | Type | Notes |
|---|---|---|
| email | string | |
| fullName | string \| null | |
| createdAt | Timestamp | |

### Collection: `interns/{internId}`
Document ID auto-generated.

| Field | Type | Notes |
|---|---|---|
| fullName | string | |
| fullNameLower | string | lowercased copy of `fullName`, for prefix search |
| email | string | |
| department | string | |
| score | number | 0–100 |
| isDeleted | boolean | soft delete, default false |
| deletedAt | Timestamp \| null | |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

> `rank` and `status` (Excellent/Good/Average/Needs Improvement) are **not stored** — computed client-side from a query ordered by `score desc`, same rationale as the old view but now client-side instead of a SQL view. See Migration Notes §1.

### Collection: `scoreHistory/{historyId}`
Top-level collection (not a subcollection) so the admin dashboard's "Recent Updates" card can query across all interns in one go.

| Field | Type | Notes |
|---|---|---|
| internId | string | references `interns/{internId}`, no DB-enforced FK |
| oldScore | number | |
| newScore | number | |
| updatedBy | string \| null | admin UID |
| updatedAt | Timestamp | |

**Written exclusively by the Cloud Function** in `functions/src/index.ts` — never by app code directly, same guarantee the Postgres trigger gave us.

---

## 4. Security Rules Summary (`firestore.rules`)

- `interns`: public read where `isDeleted == false`; all writes denied at the rules level (writes only happen server-side via `firebase-admin`, which bypasses rules — so this line mainly blocks *rogue client-side* writes).
- `admins`: a user can read their own doc only; no client writes.
- `scoreHistory`: no client reads or writes at all — this collection is admin-dashboard data, fetched server-side through a Route Handler that checks the session cookie, not directly by the browser.

Full rule syntax lives in `firestore.rules`.

---

## 5. Auth Flow (rewritten — see Migration Notes §4 for why)

1. Admin submits email/password on `/login` → client-side `signInWithEmailAndPassword` (Firebase client SDK).
2. Client sends the resulting ID token to `POST /api/auth/session`.
3. Route Handler verifies the ID token, checks `admins/{uid}` exists, then calls `firebase-admin`'s `createSessionCookie()` and sets it as an httpOnly cookie.
4. `middleware.ts` redirects to `/login` if the cookie is simply absent (Edge runtime — can't run `firebase-admin` there).
5. Every protected Server Component/Action/Route Handler calls `verifySessionCookie()` (in `lib/firebase/session.ts`) to get the real, verified UID before doing anything — this is the actual security boundary, not the middleware.
6. Logout: `DELETE /api/auth/session` clears the cookie (and optionally revokes refresh tokens via `firebase-admin`).

---

## 6. Score Update Flow

1. Admin submits a score change via a Server Action.
2. Server Action verifies the session cookie → confirms `admins/{uid}` exists → writes the new `score` to `interns/{internId}` via `firebase-admin`.
3. The Cloud Function trigger (`onDocumentUpdated`) fires, detects `score` changed, writes a `scoreHistory` doc automatically.
4. Any client with an open `onSnapshot` listener on the `interns` query gets the update in real time — leaderboard re-renders, rank recalculates client-side.

---

## 7. Real-Time Strategy

Native Firestore `onSnapshot` on a query (`interns` where `isDeleted == false`, ordered by `score desc`) — actually less code than the old Supabase Realtime channel setup. No separate real-time subscription concept to manage.

---

## 8. Reports/Export

- **CSV/Excel:** unchanged — built client-side from the currently loaded/filtered dataset.
- **PDF:** rendered server-side via `@react-pdf/renderer` in a Route Handler; optionally uploaded to **Firebase Storage** and served via a signed URL instead of streamed directly, if we want exports to be retrievable later rather than one-shot downloads. Decision on which approach ships can wait until Phase 8.

---

## 9. Build Phases (updated)

| Phase | Scope | Est. time | Status |
|---|---|---|---|
| 1 | ~~Supabase project setup, schema + RLS, seed data~~ → **Firebase project setup, Firestore rules/indexes, Cloud Function, seed script** | 1–1.5 days | Re-doing now |
| 2 | Public leaderboard (static → `onSnapshot` real-time) | 1–2 days | Pending |
| 3 | Admin auth (login, session cookie flow, middleware) | 1–1.5 days | Pending (session cookie flow adds ~0.5 day vs. Supabase) |
| 4 | Intern CRUD (add/edit/soft-delete) | 1–2 days | Pending |
| 5 | Score management + scoreHistory + bulk update | 1 day | Pending |
| 6 | Dashboard stats + charts (aggregation queries) | 1–2 days | Pending |
| 7 | Search/filter (prefix search + department filter) | 1 day | Pending |
| 8 | Reports (CSV/Excel/PDF, optional Storage upload) | 1–1.5 days | Pending |
| 9 | Polish: responsive, top-3 styling, dark mode (bonus) | 1–2 days | Pending |
| 10 | Deploy to Vercel + Firebase (Functions, rules, indexes), final QA | 1 day | Pending |

**Total: ~10–15 working days** — roughly the same as before; the Firebase auth/session work adds a little time, but real-time and aggregation queries save some elsewhere.

---

## 10. Risks / Open Questions (updated)

- **Blaze plan required** for Cloud Functions (score-history trigger). Free Spark plan can't run Firestore triggers. Confirm you're OK provisioning a billing account (usage will be near-$0 at this scale, but it's not zero-setup like Supabase's free tier).
- **Middleware auth is UX-only, not security** — flagged clearly in Migration Notes §4. Make sure every actual data-touching Server Action/Route Handler does its own `verifySessionCookie()` call; don't rely on middleware having "already checked."
- **Rank at scale** — client-computed rank is fine now; would need rework if the intern list grows into the thousands.
- **Search** — prefix-only for now; true full-text needs Algolia later if that's ever required.
- Same open items as before: weekly/monthly rankings (resolved: computed on the fly), notifications (resolved: toast only), single admin role (resolved) — all still hold under Firebase, no change needed there.

---

*This document reflects the Firebase rebuild as of 2026-07-07. Log further changes in `CHANGELOG.md`.*
