import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/firebase/session";
import { bulkUpdateScores } from "@/lib/actions/scores";

/**
 * POST /api/scores/bulk
 * Body: { updates: { internId: string, newScore: number }[] }
 *
 * Thin wrapper around bulkUpdateScores() — the actual transaction + audit
 * logging logic lives in lib/actions/scores.ts, not here, so any future
 * Server Action calling bulk updates uses the exact same code path.
 */
export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.updates)) {
    return NextResponse.json(
      { error: "Expected { updates: { internId, newScore }[] }" },
      { status: 400 }
    );
  }

  const results = await bulkUpdateScores(body.updates);
  const failures = results.filter((r) => !r.ok);

  return NextResponse.json(
    { results, succeeded: results.length - failures.length, failed: failures.length },
    { status: failures.length > 0 ? 207 : 200 } // 207: partial success
  );
}
