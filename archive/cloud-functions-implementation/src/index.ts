/**
 * Cloud Functions for Intern Scoreboard & Leaderboard Management System.
 *
 * Replaces the old Postgres `log_score_change()` trigger. This is the ONLY
 * place `scoreHistory` documents get written — app code (Server Actions,
 * Route Handlers) should never write to `scoreHistory` directly. That keeps
 * the audit trail guaranteed-complete regardless of which code path changed
 * a score.
 *
 * See docs/MIGRATION_NOTES.md §2 for why this exists as a Cloud Function
 * instead of a DB-level trigger.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const logScoreChange = onDocumentUpdated(
  "interns/{internId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    // Only log genuine score changes — not every field update (e.g. an
    // admin editing department shouldn't create a score_history row).
    if (before.score === after.score) return;

    const internId = event.params.internId;

    // `updatedBy` is expected to be set on the intern doc by the Server
    // Action that performed the write (e.g. as a transient field), so the
    // Cloud Function can attribute the change to the admin who made it.
    // If it's missing, we still log the change with a null actor rather
    // than silently dropping the audit entry.
    const updatedBy = after.lastUpdatedBy ?? null;

    await db.collection("scoreHistory").add({
      internId,
      oldScore: before.score,
      newScore: after.score,
      updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
);
