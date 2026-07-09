import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { verifySession } from "@/lib/firebase/session";
import { updateIntern, softDeleteIntern } from "@/lib/actions/interns";
import { updateInternScore } from "@/lib/actions/scores";

/**
 * PATCH /api/interns/[id]
 * Body may include fullName/email/department AND/OR score. Profile fields
 * go through updateIntern(); a score field (if present) is routed through
 * updateInternScore() separately so the scoreHistory audit trail — see
 * lib/actions/scores.ts — stays the only path that ever touches `score`.
 * Both run even if one fails, and both failures/successes are reported.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { score, ...profileFields } = body;
  const errors: string[] = [];

  if (Object.keys(profileFields).length > 0) {
    try {
      await updateIntern(id, profileFields);
    } catch (err) {
      errors.push(
        err instanceof ZodError
          ? err.issues[0]?.message ?? "Validation failed."
          : err instanceof Error
          ? err.message
          : "Failed to update intern profile."
      );
    }
  }

  if (typeof score === "number") {
    try {
      await updateInternScore(id, score);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Failed to update score.");
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/interns/[id] — soft delete only, per project rules. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await softDeleteIntern(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete intern." },
      { status: 400 }
    );
  }
}
