// ============================================================================
// Session cookie helpers. This is where auth is ACTUALLY enforced — not in
// middleware.ts, which only checks cookie presence (see
// docs/MIGRATION_NOTES.md §4 for why). Every Server Action / Route Handler
// that touches admin-only data must call verifySession() and check the
// result before doing anything.
// ============================================================================

import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./admin";

const SESSION_COOKIE_NAME = "__session";
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * Verifies the ID token and, if the caller is a provisioned admin, mints a
 * session cookie value. Does NOT set the cookie itself — the caller (a
 * Route Handler) is responsible for that, since only Route Handlers /
 * Server Actions can set cookies.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  // Verify the token is genuine and not expired before doing anything else.
  const decoded = await adminAuth.verifyIdToken(idToken);

  // Confirm this UID is actually a provisioned admin — mirrors the old
  // Postgres RLS "exists in admins table" check. Reject anyone who
  // authenticated with Firebase but was never added to /admins.
  const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
  if (!adminDoc.exists) {
    throw new Error("This account is not authorized as an admin.");
  }

  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS,
  });
}

export interface VerifiedSession {
  uid: string;
  email: string | null;
}

/**
 * The real authorization check. Call this at the top of every Server
 * Action / Route Handler / Server Component that requires an admin.
 * Returns null if there's no valid, verified admin session — callers must
 * handle that (redirect, 401, etc.) rather than assuming success.
 */
export async function verifySession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) return null;

    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    // Expired, revoked, or tampered cookie — treat as unauthenticated.
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS };
