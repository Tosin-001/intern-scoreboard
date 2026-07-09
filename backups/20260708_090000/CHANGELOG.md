# Changelog

All notable changes to this project are logged here.

---

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
