import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-runtime middleware. IMPORTANT: this only checks whether a session
 * cookie is PRESENT — it cannot verify it, because firebase-admin requires
 * the Node.js runtime and Edge middleware can't run it (see
 * docs/MIGRATION_NOTES.md §4).
 *
 * This exists purely for UX (fast redirect to /login when obviously logged
 * out). It is NOT the security boundary. Every Server Action / Route
 * Handler / Server Component that touches admin data must independently
 * call verifySession() from lib/firebase/session.ts — that is where actual
 * authorization happens.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies.has("__session");

  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/interns") ||
    request.nextUrl.pathname.startsWith("/scores") ||
    request.nextUrl.pathname.startsWith("/history") ||
    request.nextUrl.pathname.startsWith("/reports") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (isAdminRoute && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
