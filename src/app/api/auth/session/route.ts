import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from "@/lib/firebase/session";

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * Called right after the client signs in with the Firebase client SDK.
 * Verifies the token, confirms the caller is a provisioned admin, and sets
 * an httpOnly session cookie.
 */
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
    });
    return response;
  } catch (err) {
    // Covers both "invalid/expired ID token" and "not a provisioned admin"
    // — deliberately vague to the client either way.
    console.error("Session creation failed:", err);
    return NextResponse.json(
      { error: "Not authorized as an admin." },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Logs the admin out by clearing the session cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
