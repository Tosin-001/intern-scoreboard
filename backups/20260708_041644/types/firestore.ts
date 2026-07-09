// ============================================================================
// Types matching the Firestore data design in docs/ARCHITECTURE.md §3.
// Firestore is schemaless — these types are enforced by app code and
// firestore.rules, not by the database itself. Keep this file in sync with
// the architecture doc whenever fields change.
// ============================================================================

import type { Timestamp } from "firebase/firestore";

export type Status = "Excellent" | "Good" | "Average" | "Needs Improvement";

/** admins/{uid} — document ID is the Firebase Auth UID. */
export interface AdminDoc {
  email: string;
  fullName: string | null;
  createdAt: Timestamp;
}

/** interns/{internId} */
export interface InternDoc {
  fullName: string;
  /** lowercased copy of fullName, used for prefix search queries. */
  fullNameLower: string;
  email: string;
  department: string;
  score: number;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /**
   * Transient field set by the Server Action performing a score update, so
   * the Cloud Function (functions/src/index.ts) can attribute the resulting
   * scoreHistory entry to the admin who made the change. Not a permanent
   * "owner" field — just piggybacks the UID onto the write the trigger reads.
   */
  lastUpdatedBy?: string | null;
}

/** scoreHistory/{historyId} — written only by the Cloud Function. */
export interface ScoreHistoryDoc {
  internId: string;
  oldScore: number;
  newScore: number;
  updatedBy: string | null;
  updatedAt: Timestamp;
}

/**
 * Client-side computed shape for leaderboard rows. NOT a Firestore
 * document — `rank` and `status` are derived after querying `interns`
 * ordered by score, per docs/ARCHITECTURE.md §3.
 */
export interface LeaderboardEntry {
  id: string;
  fullName: string;
  email: string;
  department: string;
  score: number;
  rank: number;
  status: Status;
}

/** Pure function, no I/O — shared between client and server code. */
export function computeStatus(score: number): Status {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}
