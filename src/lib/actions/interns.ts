// ============================================================================
// Intern CRUD. Same pattern as lib/actions/scores.ts: every function here
// verifies the session first (the real auth boundary — see
// docs/MIGRATION_NOTES.md §3) and uses firebase-admin, which bypasses
// Firestore Security Rules by design. Score changes specifically are NOT
// handled here — updateInternScore()/bulkUpdateScores() in
// lib/actions/scores.ts remain the only path that touches `score`, so the
// audit-log guarantee in scoreHistory stays intact. Creating an intern sets
// an initial score directly (no history entry — there's no "old score" to
// log yet); editing a score after creation must go through scores.ts.
// ============================================================================

import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import {
  internCreateSchema,
  internUpdateSchema,
  type InternCreateInput,
  type InternUpdateInput,
} from "@/lib/validators/intern";

export interface InternRecord {
  id: string;
  fullName: string;
  email: string;
  department: string;
  score: number;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

function toRecord(id: string, data: FirebaseFirestore.DocumentData): InternRecord {
  return {
    id,
    fullName: data.fullName,
    email: data.email,
    department: data.department,
    score: data.score,
    isDeleted: data.isDeleted,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

/** Admin-only listing — includes soft-deleted rows so they can be restored later if needed. */
export async function listInterns(): Promise<InternRecord[]> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const snap = await adminDb.collection("interns").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => toRecord(doc.id, doc.data()));
}

export async function createIntern(input: InternCreateInput): Promise<InternRecord> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const parsed = internCreateSchema.parse(input);

  const existing = await adminDb
    .collection("interns")
    .where("email", "==", parsed.email)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new Error("An intern with this email already exists.");
  }

  const docRef = adminDb.collection("interns").doc();
  await docRef.set({
    fullName: parsed.fullName,
    fullNameLower: parsed.fullName.toLowerCase(),
    email: parsed.email,
    department: parsed.department,
    score: parsed.score,
    isDeleted: false,
    deletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await docRef.get();
  return toRecord(created.id, created.data()!);
}

/**
 * Updates an intern's profile fields (name/email/department). Deliberately
 * does NOT accept a `score` field — see the file header. Score changes must
 * go through lib/actions/scores.ts so the audit trail stays complete.
 */
export async function updateIntern(
  internId: string,
  input: InternUpdateInput
): Promise<InternRecord> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const parsed = internUpdateSchema.parse(input);
  const { score: _ignoredScore, ...profileFields } = parsed;
  void _ignoredScore; // intentionally discarded — see lib/actions/scores.ts

  if (Object.keys(profileFields).length === 0) {
    throw new Error("No fields to update.");
  }

  const docRef = adminDb.collection("interns").doc(internId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("Intern not found.");
  if (snap.data()?.isDeleted) throw new Error("Cannot edit a deleted intern.");

  if (profileFields.email && profileFields.email !== snap.data()?.email) {
    const dupe = await adminDb
      .collection("interns")
      .where("email", "==", profileFields.email)
      .limit(1)
      .get();
    if (!dupe.empty && dupe.docs[0]?.id !== internId) {
      throw new Error("An intern with this email already exists.");
    }
  }

  const updates: Record<string, unknown> = { ...profileFields, updatedAt: FieldValue.serverTimestamp() };
  if (profileFields.fullName) {
    updates.fullNameLower = profileFields.fullName.toLowerCase();
  }

  await docRef.update(updates);
  const updated = await docRef.get();
  return toRecord(updated.id, updated.data()!);
}

/** Soft delete only — never a hard delete, per project rules. */
export async function softDeleteIntern(internId: string): Promise<void> {
  const session = await verifySession();
  if (!session) throw new Error("Not authorized.");

  const docRef = adminDb.collection("interns").doc(internId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("Intern not found.");

  await docRef.update({
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
