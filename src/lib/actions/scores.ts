// ============================================================================
// Score update logic. THIS IS THE ONLY PLACE in the app allowed to change
// an intern's score. Every score-changing code path — single edit, bulk
// update, any future admin tool — MUST call updateInternScore() or
// bulkUpdateScores() from here rather than writing to `interns.score`
// directly.
//
// This replaces the Cloud Function trigger from the previous (Blaze-plan)
// design. See docs/SPARK_PLAN_REFACTOR.md for the full reasoning and the
// trade-off this introduces: logging is now an app-code CONVENTION
// enforced by "there's only one function that does this", not a DB-level
// guarantee. As long as nothing else ever writes `interns.score` directly,
// the audit trail stays complete — same outcome as the trigger, different
// mechanism.
// ============================================================================

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifySession } from "@/lib/firebase/session";

export interface ScoreUpdateResult {
  internId: string;
  ok: boolean;
  error?: string;
}

/**
 * Core transaction: reads the current score, writes the new score, and
 * writes the scoreHistory entry — all atomically, so a crash mid-update
 * can never leave a score changed without a matching history row (or vice
 * versa). This is the same atomicity guarantee the Postgres trigger and
 * Cloud Function both gave us, just implemented as a Firestore transaction
 * instead.
 */
async function applyScoreUpdate(
  internId: string,
  newScore: number,
  adminUid: string
): Promise<void> {
  if (!Number.isInteger(newScore) || newScore < 0 || newScore > 100) {
    throw new Error(
      `Invalid score for intern ${internId}: must be an integer between 0 and 100.`
    );
  }

  const internRef = adminDb.collection("interns").doc(internId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(internRef);
    if (!snap.exists) {
      throw new Error(`Intern ${internId} not found.`);
    }

    const data = snap.data()!;
    if (data.isDeleted) {
      throw new Error(`Cannot update score for a deleted intern (${internId}).`);
    }

    const oldScore: number = data.score;
    if (oldScore === newScore) {
      // No actual change — skip both the update and the history write.
      // Mirrors the old trigger's `IF new.score IS DISTINCT FROM old.score`
      // guard, just checked in code instead of SQL.
      return;
    }

    tx.update(internRef, {
      score: newScore,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const historyRef = adminDb.collection("scoreHistory").doc();
    tx.set(historyRef, {
      internId,
      internName: data.fullName,
      oldScore,
      newScore,
      updatedBy: adminUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update a single intern's score. Call this from the "edit intern" Server
 * Action. Verifies the caller is a real, provisioned admin before touching
 * anything — this IS the authorization boundary (see
 * docs/MIGRATION_NOTES.md §3), so never skip this by calling
 * applyScoreUpdate directly from elsewhere.
 */
export async function updateInternScore(
  internId: string,
  newScore: number
): Promise<void> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  await applyScoreUpdate(internId, newScore, session.uid);
}

/**
 * Update multiple interns' scores in one call (the spec's "bulk score
 * updates" feature). Each intern is updated in its own transaction —
 * Firestore transactions are limited in scope/size, and doing them
 * independently means one bad row (e.g. an intern that was just deleted)
 * doesn't roll back the whole batch. Returns a per-intern result list so
 * the UI can show exactly what succeeded/failed.
 */
export async function bulkUpdateScores(
  updates: { internId: string; newScore: number }[]
): Promise<ScoreUpdateResult[]> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const results: ScoreUpdateResult[] = [];

  for (const { internId, newScore } of updates) {
    try {
      await applyScoreUpdate(internId, newScore, session.uid);
      results.push({ internId, ok: true });
    } catch (err) {
      results.push({
        internId,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

export interface ScoreHistoryEntry {
  id: string;
  internId: string;
  internName: string;
  oldScore: number;
  newScore: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

/**
 * Recent score changes across all interns, most recent first. Powers the
 * "Recent Score Changes" panel on the Score Management page. Uses
 * `internName` denormalized onto scoreHistory at write time — no per-row
 * intern lookup needed. Single-field orderBy with no `where` clause uses
 * Firestore's automatic index, so no new composite index was required for
 * this (see the Phase 5 audit).
 */
export async function getRecentScoreHistory(limitCount = 20): Promise<ScoreHistoryEntry[]> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const snap = await adminDb
    .collection("scoreHistory")
    .orderBy("updatedAt", "desc")
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      internId: data.internId,
      internName: data.internName ?? "(unknown)",
      oldScore: data.oldScore,
      newScore: data.newScore,
      updatedBy: data.updatedBy ?? null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
    };
  });
}
