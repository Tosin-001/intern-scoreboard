import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/firebase/session";
import { getRecentScoreHistory } from "@/lib/actions/scores";

/** GET /api/scores/history?limit=20 */
export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;

  try {
    const history = await getRecentScoreHistory(limit);
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load score history." },
      { status: 500 }
    );
  }
}
