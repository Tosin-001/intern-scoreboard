# Spark Plan Refactor: Removing the Cloud Functions Dependency

**Date:** 2026-07-08
**Reason:** No billing account available — the project must run entirely on
Firebase's free Spark plan. Cloud Functions (used in the previous design for
score-history auto-logging) require the paid Blaze plan even at near-zero
usage, so they're removed entirely.
**Old implementation:** preserved in `archive/cloud-functions-implementation/`
— not deleted, per project rules.

---

## What changed

The only thing on Firebase's paid tier in the previous design was the
`logScoreChange` Cloud Function (`functions/src/index.ts`), which watched
`interns/{id}` for score changes and wrote to `scoreHistory` automatically.
Everything else — Firestore itself (including transactions), Firebase Auth,
and Firebase Storage — is already free on Spark within generous daily quotas.
So the fix is narrow: replace that one trigger with equivalent logic that
runs inside the app instead of inside Firebase's infrastructure.

## New mechanism

`src/lib/actions/scores.ts` now owns score updates end-to-end:

- `updateInternScore(internId, newScore)` — single score edit
- `bulkUpdateScores(updates[])` — the spec's bulk update feature

Both funnel through one internal function, `applyScoreUpdate()`, which runs a
**Firestore transaction** (`adminDb.runTransaction`) that reads the old
score, writes the new score, and writes the matching `scoreHistory` document
— all atomically, in one round trip. This preserves the same guarantee the
Cloud Function gave: a score change and its audit-log entry either both
happen or neither does. Firestore transactions are a standard part of the
Firestore SDK, not a paid feature — no billing account needed.

## The trade-off this introduces

This is the one thing worth being upfront about: **the "can't be bypassed"
guarantee is now a code convention, not a platform guarantee.**

- **Before (Cloud Function):** even if some future code path updated
  `interns.score` directly and forgot to log history, Firestore itself would
  still fire the trigger and write the `scoreHistory` entry. The logging
  literally could not be skipped, no matter which code touched the document.
- **Now (Server Action transaction):** logging only happens if the code path
  that changes a score calls `updateInternScore()` / `bulkUpdateScores()`.
  If a future engineer (or future you, six months from now) writes a new
  admin feature that updates `interns.score` some other way — directly via
  `adminDb.collection("interns").doc(id).update({ score })`, for instance —
  the audit trail silently stops being complete for that code path, and
  nothing will error or warn about it.

**Mitigation:** `lib/actions/scores.ts` is documented as the single
required entry point for score changes, and it's the only file that should
ever call `.update()` on an intern's `score` field. If this project grows a
second admin surface (e.g. an internal API for another tool) that changes
scores, route it through these same functions rather than writing new
Firestore calls.

## What did NOT change

- Firestore data design (`admins`, `interns`, `scoreHistory` collections) —
  identical to the previous design.
- `firestore.rules` and `firestore.indexes.json` — functionally unchanged
  (one comment updated to stop referencing the removed Cloud Function).
- Firebase Auth / session cookie flow — unchanged, was never dependent on
  Blaze.
- Firebase Storage — unchanged, has its own free tier on Spark, was never
  the issue.

## Removed / archived

- `functions/` (Cloud Functions subproject, its own `package.json`,
  `tsconfig.json`, and `src/index.ts`) → archived to
  `archive/cloud-functions-implementation/`, not deleted.
- The `functions` block and functions emulator config in `firebase.json`.
- The transient `lastUpdatedBy` field on `InternDoc` (`src/types/firestore.ts`)
  — it existed only so the old Cloud Function could read who made a change;
  the new transaction already has the admin's UID in scope directly, so the
  hack is gone.

## Deployment impact

`firebase deploy` no longer needs `--only functions` — and in fact, there's
no `functions` codebase left to deploy at all. The only Firebase-side deploy
step remaining is:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

No billing account, no Blaze plan, no Cloud Functions quota to worry about.
See the updated `docs/SETUP.md` for the full current setup flow.
