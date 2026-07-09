# Migration Notes: Supabase (PostgreSQL) → Firebase (Firestore)

**Date:** 2026-07-07
**Reason:** Project direction changed to Firebase Authentication + Firestore + Firebase Storage, keeping Next.js 15 / TypeScript / Bootstrap 5 / Vercel.
**Old implementation:** preserved in `/archive/supabase-implementation/` — not deleted, per project rules.

---

## Why this isn't a drop-in swap

Postgres is relational with server-side SQL (views, triggers, window functions, RLS). Firestore is a NoSQL document store with none of those — client SDKs talk to it fairly directly, and most of what SQL did for us server-side has to move somewhere else: client-side computation, Cloud Functions, or Security Rules. Below is every feature that needed a redesign decision, and what was chosen.

## 1. Ranking (`leaderboard` view → `ROW_NUMBER()`)

**Problem:** Firestore has no window functions or server-side views.
**Decision:** Query `interns` ordered by `score desc`, compute rank client-side as array index + 1. At the scale of an intern program (dozens–low hundreds of people), fetching the full sorted set is cheap and avoids stale/denormalized rank fields.
**Trade-off:** If this ever needs to scale to thousands of interns with paginated ranking, this approach needs revisiting (denormalized `rank` field maintained by a Cloud Function, recalculated on writes). Not needed at current scale — documented here so it's a deliberate choice, not an oversight.

## 2. Score history auto-logging (Postgres trigger → Cloud Function)

**Problem:** No SQL triggers in Firestore.
**Decision:** A Firebase Cloud Function (`functions/src/index.ts`, `onDocumentUpdated` on `interns/{internId}`) detects `score` changes and writes to the `scoreHistory` collection automatically — same guarantee as before (can't be bypassed by whichever code path updated the score).
**New requirement:** This needs the Firebase CLI, a deployed Cloud Function, and the **Blaze (pay-as-you-go) plan** — Firestore triggers require it even at near-zero usage. Flagging this cost/setup step explicitly since it's new versus Supabase.

## 3. Row Level Security → Firestore Security Rules + hybrid auth model

**Problem:** RLS applied to *every* query automatically, regardless of which client made it. Firestore Security Rules only apply to requests made through a **client SDK** with an attached Firebase Auth token. Server-side code using `firebase-admin` (the Node.js Admin SDK) bypasses Security Rules entirely by design — it's meant to have full access.
**Decision (hybrid model):**
- **Public leaderboard reads** happen directly from the browser via the Firestore client SDK. Security Rules enforce "read-only, active interns only" — equivalent to the old RLS SELECT policy.
- **All admin writes** (add/edit/delete intern, update score) route through Next.js Server Actions / Route Handlers using `firebase-admin`. Since the Admin SDK bypasses rules, **authorization is now enforced in application code**: verify the session cookie, confirm the caller's UID has a doc in `admins`, then perform the write.
**Why this matters:** this is the single biggest philosophical shift from the Supabase version — you can no longer rely on "the database will reject it if unauthorized" as the sole safety net for writes. Security Rules still protect against a compromised/malicious *client-side* write attempt, but the app-code check on the server path is now load-bearing too.

## 4. Auth session handling (Supabase `@supabase/ssr` → manual Firebase session cookies)

**Problem:** Supabase's `@supabase/ssr` package handled cookie-based sessions for Next.js SSR/middleware out of the box. Firebase Auth has no equivalent first-party package for this.
**Decision:**
1. Client signs in with `signInWithEmailAndPassword` (Firebase client SDK) → gets an ID token.
2. Client POSTs the ID token to `/api/auth/session`.
3. That route uses `firebase-admin`'s `createSessionCookie()` to mint a long-lived (up to 14 days) session cookie, set as httpOnly via `Set-Cookie`.
4. `middleware.ts` checks *only that the cookie exists* (Edge runtime can't run `firebase-admin`, which is Node-only) — this is a UX-level redirect, not the security boundary.
5. Server Components/Actions/Route Handlers verify the cookie properly via `firebase-admin`'s `verifySessionCookie()` — this is where real authorization happens.
**Risk flagged:** Next.js 15 has experimental Node.js runtime support for middleware, which could let step 4 do real verification instead of a cookie-presence check. Not relying on that yet since it's experimental — worth revisiting once it's stable.

## 5. Full-text search (Postgres `tsvector`/GIN index → prefix match)

**Problem:** Firestore has no native full-text search.
**Decision (MVP):** Store a lowercased `fullNameLower` field, search via range query (`>= term`, `<= term + '\uf8ff'`) for prefix matching. Good enough for "type a few letters of a name."
**Not done now:** True full-text/fuzzy search would need a third-party add-on (Algolia via the "Search with Algolia" Firebase Extension is the standard pairing). Flagging as a future upgrade, not building it into Phase 1.

## 6. Dashboard aggregates (`COUNT`/`AVG`/`MIN`/`MAX` → Firestore aggregation queries)

**Good news — this one's basically a wash.** Firestore's modern Web SDK supports server-side aggregation (`getCountFromServer`, `getAggregateFromServer` with `average()`/`sum()`) without needing to fetch every document. Total interns, average score, etc. can be computed the same way conceptually as before.
**Gap:** Firestore aggregation doesn't do `MIN`/`MAX` server-side as of this writing. Highest/lowest score need a `orderBy(score, desc).limit(1)` / `orderBy(score, asc).limit(1)` query each — two small queries instead of one, but still cheap.

## 7. Pagination (SQL `OFFSET`/`LIMIT` → cursor-based)

**Problem:** Firestore doesn't support offset-based pagination efficiently (it has to walk and discard skipped docs).
**Decision:** Cursor-based pagination using `startAfter(lastVisibleDoc)`. Functionally fine, but "jump to page 7" style UI isn't natural in Firestore the way it is in SQL — next/previous page navigation is the supported pattern.

## 8. Referential integrity (`FK ... on delete cascade` → app-level responsibility)

**Problem:** No foreign key constraints in Firestore.
**Decision:** `scoreHistory.internId` is just a string field with no DB-level guarantee it points to a real intern. The Cloud Function that writes `scoreHistory` is the only writer, so in practice this stays consistent, but it's worth knowing there's no DB-enforced backstop anymore.

## 9. Where Firebase Storage fits

Not part of the original Postgres schema at all — added per this request. Planned use: generated PDF report exports (temporary signed URLs) and, if added later, intern profile photos. Not core to Phase 1 scope; revisit at Phase 8 (Reports).

---

## Net assessment

Most of this is very doable and some of it (real-time, aggregation queries) is arguably *simpler* on Firestore than it was on Postgres. The two things worth being upfront about for a portfolio/internship review: (1) the auth/authorization model is now hybrid and partly enforced in app code rather than 100% database-enforced, and (2) Cloud Functions + Blaze plan is a new piece of infrastructure that didn't exist in the Supabase version.
